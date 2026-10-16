import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Room } from 'livekit-client';
import { CallController } from '../lib/calling/controller';
import { liveKitSession } from '../lib/calling/livekitSession';
import { requireCallingConfig } from '../lib/calling/config';
import { createSignaling } from '../lib/calling/signaling';
import type { CallInvite, CallCredentials, MediaSession, Signaling } from '../lib/calling/types';

const invite: CallInvite = { id: 'sdk-mock-call', caller: 'a', callee: 'b', kind: 'video', state: 'ringing', createdAt: Date.now(), expiresAt: Date.now() + 60000 };
const credentials: CallCredentials = { url: 'wss://media.invalid', token: 'explicit-sdk-mock-token', room: 'lockra-dm-sdk-mock-call' };
function signalingMock() {
  let call = { ...invite }; let minted = 0; let ended = 0;
  const signaling: Signaling = { invite: async () => { call = { ...invite }; return { ...call }; }, list: async () => [{ ...call }], get: async () => ({ ...call }),
    accept: async () => { call.state = 'accepted'; return { ...call }; }, reject: async () => { call.state = 'rejected'; return { ...call }; },
    end: async () => { ended++; call.state = 'ended'; return { ...call }; }, token: async () => { minted++; if (call.state !== 'accepted') throw new Error('Not accepted.'); return credentials; } };
  return { signaling, accept: () => { call.state = 'accepted'; }, minted: () => minted, ended: () => ended };
}
function sdkMock(options: { deny?: boolean; fail?: boolean; delay?: Promise<void> } = {}) {
  const counts = { connected: 0, disconnected: 0, stoppedTrack: 0, audioStarted: 0, audioStopped: 0, microphone: [] as boolean[], camera: [] as boolean[] };
  const listeners = new Set<() => void>();
  const room = {
    localParticipant: { trackPublications: new Map([['local', { track: { stop: () => { counts.stoppedTrack++; } } }]]),
      setMicrophoneEnabled: async (value: boolean) => { counts.microphone.push(value); }, setCameraEnabled: async (value: boolean) => { counts.camera.push(value); } },
    connect: async (url: string, token: string) => { assert.equal(url, credentials.url); assert.equal(token, credentials.token); counts.connected++; await options.delay; if (options.fail) throw new Error('SDK mock connection failure'); },
    disconnect: async (stop: boolean) => { assert.equal(stop, true); counts.disconnected++; },
    on: (_event: string, fn: () => void) => { listeners.add(fn); }, off: (_event: string, fn: () => void) => { listeners.delete(fn); },
  };
  const session = liveKitSession(room as unknown as Room, { permissions: async () => { if (options.deny) throw new Error('Permission denied'); }, start: async () => { counts.audioStarted++; }, stop: async () => { counts.audioStopped++; } });
  return { session, room, counts, listeners, emitDisconnect: () => { for (const fn of [...listeners]) fn(); } };
}
test('offline/missing configuration fails before token lookup, network, SDK initialization or media permission', async () => {
  let tokens = 0, requests = 0, sdk = 0;
  const signaling = createSignaling(async () => { tokens++; return 'mock'; }, async () => { requests++; throw new Error('Unexpected request'); });
  const controller = new CallController('a', signaling, async () => { sdk++; throw new Error('Unexpected SDK'); });
  await controller.start('b', 'video');
  assert.equal(controller.snapshot().phase, 'error'); assert.match(controller.snapshot().error!, /offline demo/);
  assert.deepEqual([tokens, requests, sdk], [0, 0, 0]);
  assert.throws(() => requireCallingConfig({ demo: false, enabled: 'true' }));
  assert.throws(() => requireCallingConfig({ demo: false, enabled: 'true', api: 'http://api.invalid', media: 'wss://media.invalid' }));
  assert.throws(() => requireCallingConfig({ demo: false, enabled: 'true', api: 'https://api.invalid', media: 'ws://media.invalid' }));
  assert.deepEqual(requireCallingConfig({ demo: false, enabled: 'true', api: 'https://api.invalid', media: 'wss://media.invalid' }), { api: 'https://api.invalid', media: 'wss://media.invalid/' });
});
test('caller cannot join before acceptance; actual SDK bridge joins, toggles media and stops tracks/listeners/audio on leave', async () => {
  const signal = signalingMock(), sdk = sdkMock();
  const controller = new CallController('a', signal.signaling, async () => sdk.session);
  await controller.start('b', 'video'); await controller.join(); assert.equal(signal.minted(), 0);
  signal.accept(); await controller.poll(); await controller.join();
  assert.equal(controller.snapshot().phase, 'active'); assert.equal(sdk.counts.connected, 1);
  await controller.toggleMicrophone(); await controller.toggleCamera();
  assert.deepEqual(sdk.counts.microphone, [true, false]); assert.deepEqual(sdk.counts.camera, [true, false]);
  await controller.leave(); assert.equal(controller.snapshot().phase, 'ended');
  assert.equal(sdk.counts.stoppedTrack, 1); assert.equal(sdk.counts.audioStopped, 1); assert.equal(sdk.counts.disconnected, 1); assert.equal(sdk.listeners.size, 0); assert.equal(signal.ended(), 1);
});
test('incoming recipient can reject without token/media; accepting an invite invokes authenticated join lifecycle', async () => {
  const signal = signalingMock(), sdk = sdkMock(); let factories = 0;
  const controller = new CallController('b', signal.signaling, async () => { factories++; return sdk.session; });
  await controller.poll(); assert.equal(controller.snapshot().phase, 'incoming');
  await controller.reject(); assert.equal(controller.snapshot().phase, 'ended'); assert.equal(signal.minted(), 0); assert.equal(factories, 0);
  await signal.signaling.invite('b', 'video'); await controller.poll(); await controller.accept();
  assert.equal(controller.snapshot().phase, 'active'); assert.equal(factories, 1);
  await controller.dispose(); assert.equal(signal.ended(), 1); assert.equal(sdk.listeners.size, 0);
});
test('denied permissions and failed SDK connections clean tracks/audio and end signaling without an active state', async () => {
  for (const options of [{ deny: true }, { fail: true }]) {
    const signal = signalingMock(), sdk = sdkMock(options), controller = new CallController('a', signal.signaling, async () => sdk.session);
    await controller.start('b', 'video'); signal.accept(); await controller.poll(); await controller.join();
    assert.equal(controller.snapshot().phase, 'error'); assert.equal(controller.snapshot().microphone, false);
    assert.equal(sdk.counts.connected, options.deny ? 0 : 1); assert.ok(sdk.counts.disconnected >= 1); assert.ok(sdk.counts.stoppedTrack >= 1); assert.ok(sdk.counts.audioStopped >= 1); assert.equal(sdk.listeners.size, 0); assert.equal(signal.ended(), 1);
  }
});
test('leaving during a pending connection prevents late activation and cleans the eventual SDK result', async () => {
  let complete!: () => void; const delay = new Promise<void>(resolve => { complete = resolve; });
  const signal = signalingMock(), sdk = sdkMock({ delay }), controller = new CallController('a', signal.signaling, async () => sdk.session);
  await controller.start('b', 'video'); signal.accept(); await controller.poll();
  const joining = controller.join();
  for (let i = 0; i < 20 && !sdk.counts.connected; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(sdk.counts.connected, 1); await controller.leave(); complete(); await joining;
  assert.equal(controller.snapshot().phase, 'ended'); assert.ok(sdk.counts.disconnected >= 1); assert.equal(sdk.listeners.size, 0); assert.deepEqual(sdk.counts.microphone, []);
});
test('remote disconnection and signaling authorization failure clean the local SDK session', async () => {
  for (const failure of ['disconnect', 'authorization']) {
    const signal = signalingMock(), sdk = sdkMock(), controller = new CallController('a', signal.signaling, async () => sdk.session);
    await controller.start('b', 'video'); signal.accept(); await controller.poll(); await controller.join();
    if (failure === 'disconnect') sdk.emitDisconnect();
    else { signal.signaling.get = async () => { throw new Error('Signed session revoked'); }; await controller.poll(); }
    for (let i = 0; i < 20 && controller.snapshot().phase !== 'error'; i++) await new Promise(resolve => setImmediate(resolve));
    assert.equal(controller.snapshot().phase, 'error'); assert.equal(controller.snapshot().camera, false); assert.equal(sdk.listeners.size, 0); assert.ok(sdk.counts.audioStopped); assert.equal(signal.ended(), 1);
  }
});
test('cancelled pending invitations are ended when they resolve; repeated clicks do not create duplicate invites', async () => {
  const signal = signalingMock(); let complete!: (call: CallInvite) => void; let sent = 0;
  signal.signaling.invite = () => { sent++; return new Promise(resolve => { complete = resolve; }); };
  const controller = new CallController('a', signal.signaling, async (): Promise<MediaSession> => { throw new Error('No media should initialize'); });
  const pending = controller.start('b', 'video'); await controller.start('b', 'video'); assert.equal(sent, 1);
  await controller.leave(); complete(invite); await pending;
  assert.equal(controller.snapshot().phase, 'ended'); assert.equal(signal.ended(), 1);
});

test('leaving while a camera toggle is pending stops late tracks and cannot re-enable ended call state', async () => {
  const signal = signalingMock(), sdk = sdkMock(), controller = new CallController('a', signal.signaling, async () => sdk.session);
  await controller.start('b', 'video'); signal.accept(); await controller.poll(); await controller.join();
  await controller.toggleCamera(); assert.equal(controller.snapshot().camera, false);
  let finish!: () => void; const delay = new Promise<void>(resolve => { finish = resolve; });
  sdk.room.localParticipant.setCameraEnabled = async value => { sdk.counts.camera.push(value); await delay; };
  const toggling = controller.toggleCamera(); await controller.leave(); finish(); await toggling;
  assert.equal(controller.snapshot().phase, 'ended'); assert.equal(controller.snapshot().camera, false);
  assert.ok(sdk.counts.stoppedTrack >= 2); assert.equal(sdk.listeners.size, 0);
});
