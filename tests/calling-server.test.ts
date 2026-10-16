import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { generateKeyPair, SignJWT, jwtVerify } from 'jose';
import { createSessionVerifier } from '../server/calling/auth';
import { createDevelopmentDirectory } from '../server/calling/directory';
import { CallingService, CallError, type CallProvider } from '../server/calling/service';
import { createCallingHandler } from '../server/calling/handler';
import { createLiveKitProvider } from '../server/calling/livekit';

test('actual JWT verifier validates signature, issuer, audience, expiry and session; unsigned decoding never authorizes', async () => {
  const keys = await generateKeyPair('RS256'), wrong = await generateKeyPair('RS256');
  const issuer = 'https://issuer.invalid', audience = 'lockra-calls', origin = 'https://app.invalid';
  const verify = createSessionVerifier(issuer, audience, [origin], async () => keys.publicKey);
  const signed = (changes: Record<string, unknown> = {}, key = keys.privateKey) => new SignJWT({ sub: 'signed-clerk-user', sid: 'signed-session', iss: issuer, aud: audience, azp: origin, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60, ...changes }).setProtectedHeader({ alg: 'RS256' }).sign(key);
  assert.equal(await verify(await signed()), 'signed-clerk-user');
  for (const change of [{ iss: 'https://foreign.invalid' }, { aud: 'other-api' }, { exp: 1 }, { sid: undefined }, { azp: 'https://foreign.invalid' }, { iat: 1 }]) await assert.rejects(verify(await signed(change)));
  await assert.rejects(verify(await signed({}, wrong.privateKey)));
  await assert.rejects(verify('unsigned.payload.value'));
});

test('actual provider SDK mints a signed short-lived token restricted to caller and server-selected room/media sources', async () => {
  const secret = randomBytes(48).toString('hex');
  const provider = createLiveKitProvider({ url: 'wss://media.invalid', apiKey: 'synthetic-sdk-test', apiSecret: secret });
  const credentials = await provider.mint('lockra-dm-server-generated-id', 'profile-a', 'audio');
  const { payload } = await jwtVerify(credentials.token, new TextEncoder().encode(secret), { issuer: 'synthetic-sdk-test', subject: 'profile-a', algorithms: ['HS256'] });
  const grant = payload.video as Record<string, unknown>;
  assert.equal(grant.room, 'lockra-dm-server-generated-id'); assert.equal(grant.roomJoin, true);
  assert.equal(grant.canPublishData, false); assert.equal(grant.canUpdateOwnMetadata, false);
  assert.deepEqual(grant.canPublishSources, ['microphone']);
  assert.ok(!grant.roomAdmin && !grant.roomCreate && !grant.roomList && !grant.roomRecord);
  assert.ok(payload.exp! - payload.nbf! <= 60);
  assert.throws(() => createLiveKitProvider({ url: 'wss://example.invalid', apiKey: 'YOUR_KEY', apiSecret: '' }));
});

function fixture() {
  let now = Date.now(); let permitted = true; let cleanupFails = false;
  const minted: string[] = [], closed: string[] = [];
  const directory = createDevelopmentDirectory({ profiles: ['a', 'b', 'c'].map(id => ({ id, subject: 'clerk-' + id, enabled: true })), allowedPairs: [['a', 'b']] });
  const provider: CallProvider = { mint: async (room, identity) => { minted.push(room + ':' + identity); return { url: 'wss://media.invalid/', room, token: 'explicit-sdk-mock-token' }; }, close: async room => { if (cleanupFails) throw new Error('Provider cleanup failed'); closed.push(room); } };
  const service = new CallingService({ ...directory, allowed: async (a, b) => permitted && await directory.allowed(a, b) }, provider, () => now);
  const handler = createCallingHandler(service, async token => { if (!/^clerk-[abc]$/.test(token)) throw new Error('mock session denied'); return token; }, ['https://app.invalid']);
  const request = async (actor: string, path: string, method = 'GET', body?: unknown, origin = 'https://app.invalid') => handler(new Request('https://api.invalid' + path, { method, headers: { Authorization: 'Bearer ' + actor, Origin: origin }, ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}) }));
  return { service, request, minted, closed, advance: (ms: number) => { now += ms; }, revoke: () => { permitted = false; }, cleanupFails: (value: boolean) => { cleanupFails = value; } };
}
test('actual HTTP signaling denies unsigned sessions, foreign callers, forged room/identity and tokens before acceptance', async () => {
  const f = fixture();
  assert.equal((await f.request('invalid', '/calls')).status, 401);
  assert.equal((await f.request('clerk-a', '/calls', 'GET', undefined, 'https://foreign.invalid')).status, 403);
  assert.equal((await f.request('clerk-a', '/calls', 'POST', { callee: 'b', kind: 'audio', room: 'public-room', caller: 'c' })).status, 400);
  assert.equal((await f.request('clerk-a', '/calls', 'POST', { callee: 'c', kind: 'audio' })).status, 403);
  const response = await f.request('clerk-a', '/calls', 'POST', { callee: 'b', kind: 'audio' }); assert.equal(response.status, 200);
  const invite = await response.json(); const path = '/calls/' + invite.id;
  assert.equal((await f.request('clerk-c', path)).status, 404);
  assert.equal((await f.request('clerk-a', path + '/accept', 'POST')).status, 409);
  assert.equal((await f.request('clerk-a', path + '/token', 'POST')).status, 409);
  assert.equal(f.minted.length, 0);
  assert.equal((await (await f.request('clerk-b', '/calls')).json()).length, 1);
  assert.deepEqual(await (await f.request('clerk-c', '/calls')).json(), []);
  assert.equal((await f.request('clerk-b', path + '/accept', 'POST')).status, 200);
  assert.equal((await f.request('clerk-a', path + '/token', 'POST')).status, 200);
  assert.equal((await f.request('clerk-c', path + '/token', 'POST')).status, 404);
  assert.equal((await f.request('clerk-a', path + '/token', 'POST')).status, 429);
  assert.equal(f.minted[0], 'lockra-dm-' + invite.id + ':a');
  assert.equal((await f.request('clerk-b', path + '/end', 'POST')).status, 200);
  assert.deepEqual(f.closed, ['lockra-dm-' + invite.id]);
  assert.equal((await f.request('clerk-a', path + '/token', 'POST')).status, 409);
});
test('invites reject, expire, prevent busy/racing acceptance and revoke accepted calls on permission loss', async () => {
  const f = fixture(), a = await f.service.caller('clerk-a'), b = await f.service.caller('clerk-b');
  let call = await f.service.invite(a, 'b', 'video');
  await assert.rejects(f.service.invite(a, 'b', 'audio'), (e: unknown) => e instanceof CallError && e.status === 409);
  await f.service.reject(b, call.id); await assert.rejects(f.service.token(a, call.id));
  call = await f.service.invite(a, 'b', 'audio'); f.advance(61000);
  assert.equal((await f.service.get(a, call.id)).state, 'expired'); await assert.rejects(f.service.accept(b, call.id));
  call = await f.service.invite(a, 'b', 'video');
  const accepts = await Promise.allSettled([f.service.accept(b, call.id), f.service.accept(b, call.id)]);
  assert.equal(accepts.filter(r => r.status === 'fulfilled').length, 1);
  f.revoke(); await assert.rejects(f.service.token(a, call.id));
  assert.ok(f.closed.includes('lockra-dm-' + call.id)); assert.equal(f.minted.length, 0);
});
test('provider cleanup failure is reported and retried; mint cannot race a cancelled call', async () => {
  const f = fixture(), a = await f.service.caller('clerk-a'), b = await f.service.caller('clerk-b');
  const call = await f.service.invite(a, 'b', 'audio'); await f.service.accept(b, call.id);
  f.cleanupFails(true); await assert.rejects(f.service.end(a, call.id));
  f.cleanupFails(false); await f.service.sweep(); assert.ok(f.closed.includes('lockra-dm-' + call.id));
  let finish!: () => void; const wait = new Promise<void>(resolve => { finish = resolve; });
  const directory = createDevelopmentDirectory({ profiles: [{ id: 'a', subject: 'a', enabled: true }, { id: 'b', subject: 'b', enabled: true }], allowedPairs: [['a', 'b']] });
  const service = new CallingService(directory, { mint: async room => { await wait; return { url: 'wss://media.invalid', room, token: 'mock' }; }, close: async () => {} });
  const pendingCall = await service.invite({ id: 'a', subject: 'a' }, 'b', 'audio'); await service.accept({ id: 'b', subject: 'b' }, pendingCall.id);
  const token = service.token({ id: 'a', subject: 'a' }, pendingCall.id);
  await service.end({ id: 'a', subject: 'a' }, pendingCall.id); finish(); await assert.rejects(token);
});
