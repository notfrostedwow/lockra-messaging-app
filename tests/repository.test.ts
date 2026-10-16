import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DemoStore } from '../lib/demo/store';
import { createDemoClient } from '../lib/demo/client';
import { encryptedFixture } from './fixtures/encrypted';

function fixture(id = 'demo-zaheer') { const store = new DemoStore(); store.signIn(id); return { store, db: createDemoClient(store) }; }
test('send, read marking, subscription delivery, pagination and deletion use actual query contract', async () => {
  const { db, store } = fixture(); let received = 0;
  const channel = db.channel('chat').on('postgres_changes', { table: 'messages', event: 'INSERT' }, () => received++).subscribe();
  const write = await db.from('messages').insert(encryptedFixture()).select().single();
  assert.equal(write.error, null); await Promise.resolve(); assert.equal(received, 1);
  assert.equal((await db.from('messages').select().order('timestamp').range(0, 0)).data.length, 1);
  assert.ok((await db.from('messages').update({ read: true }).eq('id', write.data.id)).error);
  store.signIn('demo-alice'); assert.equal((await db.from('messages').update({ read: true }).eq('id', write.data.id)).error, null);
  assert.ok((await db.from('messages').delete().eq('id', write.data.id)).error);
  store.signIn('demo-zaheer'); assert.equal((await db.from('messages').delete().eq('id', write.data.id)).error, null);
  await db.removeChannel(channel); assert.equal(db.getChannels().length, 0);
});
test('sender spoofing, empty content, cross-user reads and foreign settings writes fail', async () => {
  const { db, store } = fixture();
  assert.ok((await db.from('messages').insert({ sender_id: 'demo-alice', receiver_username: 'sam', content: 'forged' })).error);
  assert.ok((await db.from('messages').insert({ sender_id: store.actorId, receiver_username: 'alice', content: ' ' })).error);
  assert.ok((await db.from('privacy_settings').insert({ user_id: 'demo-alice', show_email: true })).error);
  store.signIn('demo-sam'); const rows = (await db.from('messages').select()).data;
  assert.equal(rows.length, 1); assert.equal(rows[0].receiver_username, 'sam');
});
test('community ownership, public joins, private invite, locked sends and role escalation', async () => {
  const { db, store } = fixture();
  assert.equal((await db.from('communities').select().eq('id', 'demo-private')).data.length, 0);
  assert.ok((await db.from('community_members').insert({ community_id: 'demo-private', user_id: store.actorId, role: 'member' })).error);
  assert.equal((await db.from('communities').select().eq('invite_code', 'DEMOJOIN').single()).error, null);
  assert.equal((await db.from('community_members').insert({ community_id: 'demo-private', user_id: store.actorId, role: 'member' })).error, null);
  assert.ok((await db.from('community_members').update({ role: 'owner' }).eq('user_id', store.actorId)).error);
  store.signIn('demo-alice'); assert.equal((await db.from('communities').update({ is_locked: true }).eq('id', 'demo-design')).error, null);
  store.signIn('demo-zaheer'); assert.ok((await db.from('community_messages').insert({ community_id: 'demo-design', user_id: store.actorId, content: 'locked' })).error);
  assert.ok((await db.from('communities').delete().eq('id', 'demo-design')).error);
});
test('community creation creates owner membership and disallows owner spoofing', async () => {
  const { db, store } = fixture();
  assert.ok((await db.from('communities').insert({ owner_id: 'demo-alice', name: 'Spoof', type: 'public' })).error);
  const result = await db.from('communities').insert({ owner_id: store.actorId, name: 'Local builders', type: 'public' }).select().single();
  assert.equal(result.error, null); assert.equal(store.member(result.data.id)?.role, 'owner');
});
