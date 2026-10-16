import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createIdentity, decryptDM, encryptDM, parseEnvelope, publicIdentity, ReplayGuard } from '../lib/e2ee/protocol';
import { DMEncryption, type Directory, type Vault } from '../lib/e2ee/service';
import { withEncryptedMessages } from '../lib/e2ee/client';
import { DemoStore } from '../lib/demo/store';
import { createDemoClient } from '../lib/demo/client';

function cryptoFixture() {
  const sender = createIdentity('demo-zaheer', randomBytes), receiver = createIdentity('demo-alice', randomBytes);
  const context = { id: 'dm-crypto-test', sender_id: sender.userId, recipient_id: receiver.userId, timestamp: '2026-10-16T10:00:00.000Z' };
  return { sender, receiver, context, envelope: encryptDM(context, 'Private synthetic text 🔐', sender, publicIdentity(receiver), randomBytes) };
}
test('maintained primitives encrypt a DM that sender and recipient can decrypt; nonce is fresh', () => {
  const { sender, receiver, context, envelope } = cryptoFixture();
  assert.equal(decryptDM(context, envelope, receiver, publicIdentity(sender)), 'Private synthetic text 🔐');
  assert.equal(decryptDM(context, envelope, sender, publicIdentity(receiver)), 'Private synthetic text 🔐');
  assert.notEqual(encryptDM(context, 'Private synthetic text 🔐', sender, publicIdentity(receiver), randomBytes).nonce, envelope.nonce);
  assert.deepEqual(parseEnvelope(JSON.stringify(envelope)), envelope);
});
test('tamper, wrong private key, changed message ID, participant, timestamp and key fingerprint fail', () => {
  const { sender, receiver, context, envelope } = cryptoFixture();
  const open = (c = context, e = envelope, key = receiver) => decryptDM(c, e, key, publicIdentity(sender));
  assert.throws(() => open(context, { ...envelope, body: (envelope.body[0] === '0' ? '1' : '0') + envelope.body.slice(1) }));
  assert.throws(() => open(context, { ...envelope, nonce: '00'.repeat(24) }));
  assert.throws(() => open(context, envelope, { ...receiver, secretKey: createIdentity(receiver.userId, randomBytes).secretKey }));
  for (const change of [{ id: 'replayed-copy' }, { sender_id: 'another-user' }, { recipient_id: 'another-conversation' }, { timestamp: '2026-10-16T10:01:00.000Z' }]) assert.throws(() => open({ ...context, ...change }));
  assert.throws(() => open(context, { ...envelope, senderKey: '00'.repeat(32) }));
  assert.throws(() => parseEnvelope('{"v":2}'));
  assert.throws(() => encryptDM(context, 'text', sender, { ...publicIdentity(receiver), publicKey: '00'.repeat(32) }, randomBytes));
});
test('repeated history is idempotent; conflicting ciphertext replay is rejected', () => {
  const { sender, receiver, context, envelope } = cryptoFixture(); const guard = new ReplayGuard();
  guard.accept(receiver.userId, context, envelope); guard.accept(receiver.userId, context, envelope);
  const conflicting = encryptDM(context, 'different text', sender, publicIdentity(receiver), randomBytes);
  assert.throws(() => guard.accept(receiver.userId, context, conflicting));
  assert.throws(() => decryptDM({ ...context, id: 'copied-id' }, envelope, receiver, publicIdentity(sender)));
});

async function serviceFixture() {
  let actor: string | null = 'demo-zaheer';
  const vaultMap = new Map<string, string>(), identities = new Map<string, ReturnType<typeof publicIdentity>>(), current = new Map<string, ReturnType<typeof publicIdentity>>();
  const vault: Vault = { get: async key => vaultMap.get(key) ?? null, set: async (key, value) => { vaultMap.set(key, value); } };
  const directory: Directory = { current: async id => current.get(id) ?? null, find: async (id, key) => identities.get(id + key) ?? null,
    publish: async key => { identities.set(key.userId + key.keyId, key); current.set(key.userId, key); } };
  const service = new DMEncryption(vault, directory, randomBytes, () => actor);
  await service.own('demo-zaheer'); actor = 'demo-alice'; await service.own('demo-alice'); actor = 'demo-zaheer';
  const verify = async () => { const state = await service.inspect('demo-alice'); await service.verify('demo-alice', state.own.keyId, state.peer.keyId); };
  const row = { id: 'service-dm', sender_id: 'demo-zaheer', receiver_username: 'alice', content: 'Encrypted integration mock text', timestamp: new Date().toISOString() };
  return { service, verify, row, vaultMap, setActor: (id: string | null) => { actor = id; } };
}
test('missing/unverified keys never fall back to plaintext; explicit rotation invalidates trust', async () => {
  const f = await serviceFixture();
  await assert.rejects(f.service.encrypt(f.row, 'demo-alice'));
  await assert.rejects(f.service.inspect('missing-user'));
  await f.verify(); const stored = await f.service.encrypt(f.row, 'demo-alice');
  assert.equal(stored.content, ''); assert.ok(!JSON.stringify(stored).includes(f.row.content));
  assert.equal((await f.service.read(stored)).content, f.row.content);
  f.setActor('demo-alice');
  assert.equal((await f.service.read(stored)).encryption_status, 'encrypted-unverified');
  const aliceTrust = await f.service.inspect('demo-zaheer');
  await f.service.verify('demo-zaheer', aliceTrust.own.keyId, aliceTrust.peer.keyId);
  assert.equal((await f.service.read(stored)).content, f.row.content);
  await f.service.own('demo-alice', true); // old private key retained for old history
  // The original key's explicit comparison remains valid for that old history.
  assert.equal((await f.service.read(stored)).content, f.row.content);
  f.setActor('demo-zaheer'); assert.equal((await f.service.inspect('demo-alice')).verified, false);
  await assert.rejects(f.service.encrypt({ ...f.row, id: 'after-rotation' }, 'demo-alice'));
  f.vaultMap.clear(); assert.equal((await f.service.read(stored)).encryption_status, 'unavailable');
  await assert.rejects(f.service.own('demo-zaheer')); // explicit rotation required after lost key
  f.setActor(null); await assert.rejects(f.service.encrypt(f.row, 'demo-alice'));
});
test('legacy plaintext is explicitly labelled; malformed/versioned ciphertext is never shown as plaintext', async () => {
  const f = await serviceFixture();
  assert.equal((await f.service.read(f.row)).content, '[Legacy plaintext] ' + f.row.content);
  assert.equal((await f.service.read({ ...f.row, encryption_version: 1, ciphertext: 'invalid' })).encryption_status, 'unavailable');
  assert.equal((await f.service.read({ ...f.row, encryption_version: 99 })).encryption_status, 'unavailable');
});
test('actual query/realtime adapter stores ciphertext, decodes send/history/events and enforces authorization', async () => {
  const f = await serviceFixture(); await f.verify();
  const store = new DemoStore(); store.signIn('demo-zaheer');
  const db = withEncryptedMessages(createDemoClient(store) as unknown as SupabaseClient, f.service);
  const encrypted = await f.service.encrypt(f.row, 'demo-alice');
  let resolveEvent!: (value: any) => void; const event = new Promise<any>(resolve => { resolveEvent = resolve; });
  const channel = db.channel('encrypted').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, resolveEvent).subscribe();
  const result = await db.from('messages').insert(encrypted).select().single();
  assert.equal(result.error, null); assert.equal(result.data.content, f.row.content);
  assert.equal((await event).new.content, f.row.content);
  const stored = store.tables.messages.find(m => m.id === f.row.id)!;
  assert.equal(stored.content, ''); assert.equal(stored.encryption_version, 1);
  assert.ok(!JSON.stringify(stored).includes(f.row.content));
  const history = await db.from('messages').select('id,content').eq('id', f.row.id).single();
  assert.ok(history.data);
  assert.equal(history.data.content, f.row.content);
  assert.throws(() => db.from('messages').insert(f.row));
  assert.throws(() => db.from('messages').update({ content: 'plaintext rewrite' }));
  assert.ok((await db.from('messages').insert(encrypted)).error); // duplicate ID rejected
  store.signIn('demo-alice'); f.setActor('demo-alice');
  const aliceTrust = await f.service.inspect('demo-zaheer');
  await f.service.verify('demo-zaheer', aliceTrust.own.keyId, aliceTrust.peer.keyId);
  const received = await db.from('messages').select().eq('id', f.row.id).single();
  assert.ok(received.data); assert.equal(received.data.content, f.row.content);
  assert.equal((await db.from('messages').update({ read: true }).eq('id', f.row.id)).error, null);
  const marked = await db.from('messages').select().eq('id', f.row.id).single();
  assert.equal(marked.data?.content, f.row.content); assert.equal(marked.data?.read, true);
  store.signIn('demo-sam'); f.setActor('demo-sam');
  assert.deepEqual((await db.from('messages').select().eq('id', f.row.id)).data, []);
  assert.equal((await f.service.read(stored)).encryption_status, 'unavailable');
  await db.removeChannel(channel);
});
