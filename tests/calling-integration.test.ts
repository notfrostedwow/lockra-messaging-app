import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { generateKeyPair, SignJWT, jwtVerify } from 'jose';
import { CallingService } from '../server/calling/service';
import { createCallingHandler } from '../server/calling/handler';
import { createDevelopmentDirectory } from '../server/calling/directory';
import { createSessionVerifier } from '../server/calling/auth';
import { createLiveKitProvider } from '../server/calling/livekit';
import { createSignaling } from '../lib/calling/signaling';
import { CallController } from '../lib/calling/controller';
import type { CallCredentials, MediaSession } from '../lib/calling/types';

test('actual client API -> signed-session handler -> invite authorization -> scoped provider JWT -> mocked media lifecycle', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('No live service traffic is allowed in integration mocks.'); };
  try {
    const issuer = 'https://issuer.invalid', audience = 'lockra-calls', origin = 'https://app.invalid';
    const keys = await generateKeyPair('RS256');
    const session = (id: string) => new SignJWT({ sid: 'synthetic-session-' + id, azp: origin }).setSubject('clerk-' + id).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime('60s').setProtectedHeader({ alg: 'RS256' }).sign(keys.privateKey);
    const secret = randomBytes(48).toString('hex');
    const actualProvider = createLiveKitProvider({ url: 'wss://media.invalid', apiKey: 'synthetic-integration-test', apiSecret: secret });
    const closed: string[] = [];
    const directory = createDevelopmentDirectory({ profiles: ['a', 'b'].map(id => ({ id, subject: 'clerk-' + id, enabled: true })), allowedPairs: [['a', 'b']] });
    const service = new CallingService(directory, { ...actualProvider, close: async room => { closed.push(room); } });
    const handler = createCallingHandler(service, createSessionVerifier(issuer, audience, [origin], async () => keys.publicKey), [origin]);
    const request: typeof fetch = async (input, init) => {
      // Explicit browser transport mock: browsers add Origin to cross-origin requests.
      const headers = new Headers(init?.headers); headers.set('Origin', origin);
      return handler(new Request(input, { ...init, headers }));
    };
    const config = () => ({ api: 'https://api.invalid', media: 'wss://media.invalid/' });
    const connected: string[] = [], disconnected: string[] = [];
    const media = (id: string): MediaSession => ({
      connect: async (credentials: CallCredentials) => {
        const { payload } = await jwtVerify(credentials.token, new TextEncoder().encode(secret), { algorithms: ['HS256'], issuer: 'synthetic-integration-test', subject: id });
        assert.equal((payload.video as { room: string }).room, credentials.room);
        assert.match(credentials.room, /^lockra-dm-[a-f0-9-]{36}$/); connected.push(id);
      }, disconnect: async () => { disconnected.push(id); }, microphone: async () => {}, camera: async () => {}, onDisconnected: () => () => {},
    });
    const a = new CallController('a', createSignaling(() => session('a'), request, config), async () => media('a'));
    const b = new CallController('b', createSignaling(() => session('b'), request, config), async () => media('b'));
    await a.start('b', 'video'); assert.equal(a.snapshot().phase, 'ringing');
    await a.join(); assert.deepEqual(connected, []);
    await b.poll(); assert.equal(b.snapshot().phase, 'incoming'); await b.accept();
    await a.poll(); await a.join();
    assert.deepEqual(connected, ['b', 'a']); assert.equal(a.snapshot().phase, 'active');
    const room = 'lockra-dm-' + a.snapshot().invite!.id;
    await a.leave(); await b.poll(); assert.equal(b.snapshot().phase, 'ended');
    assert.deepEqual(disconnected, ['a', 'b']); assert.deepEqual(closed, [room]);
    assert.equal((await service.get(await service.caller('clerk-a'), a.snapshot().invite!.id)).state, 'ended');
  } finally { globalThis.fetch = realFetch; }
});
