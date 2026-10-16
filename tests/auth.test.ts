import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeDecision } from '../lib/authorization';
import { requireIntegrationConfig, resolveMode } from '../lib/runtime';
import { DemoStore, demoStore } from '../lib/demo/store';
import { createDemoClient } from '../lib/demo/client';
import { executeWithClerkAuth, sendMessageWithAuth } from '../lib/clerkAuth';
import { encryption } from '../lib/e2ee/runtime';

test('all nonpublic routes require a session, including deeply nested admin/settings routes', () => {
  for (const route of ['/contacts', '/(tabs)', '/chat/alice', '/community/members/x', '/admin/users', '/security', '/privacy', '/storage', '/device-settings', '/premium']) {
    assert.equal(routeDecision(route, null), 'signin', route);
  }
  assert.equal(routeDecision('/signin', null), 'allow');
  assert.equal(routeDecision('/forgot-password', null), 'allow');
});
test('admin routes deny ordinary users; synthetic admin may inspect demo architecture', () => {
  assert.equal(routeDecision('/admin/database', { role: 'user' }), 'denied');
  assert.equal(routeDecision('/admin-panel', { role: 'admin' }), 'allow');
});

test('unreviewed real admin execution stays denied even with a client-side admin profile', () => {
  assert.equal(routeDecision('/admin/users', { role: 'admin' }, false), 'denied');
  assert.equal(routeDecision('/admin-panel', { role: 'admin' }, false), 'denied');
  assert.equal(routeDecision('/admin/users', null, false), 'signin');
});
test('mode defaults to demo and rejects misspellings; config fails before client initialization', () => {
  assert.equal(resolveMode(undefined), 'demo');
  assert.throws(() => resolveMode('production'));
  assert.throws(() => requireIntegrationConfig({}));
  assert.throws(() => requireIntegrationConfig({ enabled: 'true', url: 'https://example.supabase.co', anonKey: 'YOUR_KEY', clerkKey: 'YOUR_KEY' }));
  assert.throws(() => requireIntegrationConfig({ enabled: 'true', url: 'http://real.invalid', anonKey: 'public-key', clerkKey: 'publishable-key' }));
});
test('synthetic identities are explicit and signout revokes access immediately', async () => {
  const store = new DemoStore(); const db = createDemoClient(store);
  assert.ok((await db.from('messages').select()).error);
  assert.throws(() => store.signIn('arbitrary-user'));
  store.signIn('demo-zaheer'); assert.equal((await db.from('messages').select()).data.length, 2);
  store.signOut(); assert.ok((await db.from('messages').select()).error);
});
test('an ordinary profile cannot assign itself admin, verified, or a different identity', async () => {
  const store = new DemoStore(); store.signIn('demo-zaheer'); const db = createDemoClient(store);
  for (const change of [{ role: 'admin' }, { is_verified: true }, { id: 'demo-admin' }, { clerk_id: 'forged' }]) {
    assert.ok((await db.from('users').update(change).eq('id', store.actorId)).error);
  }
  assert.equal(store.actor?.role, 'user');
});

test('profile edits cannot impersonate another username to read its conversations', async () => {
  const store = new DemoStore(); store.signIn('demo-zaheer'); const db = createDemoClient(store);
  assert.ok((await db.from('users').update({ username: 'alice' }).eq('id', store.actorId)).error);
  assert.ok((await db.from('users').update({ username: 'bad/name' }).eq('id', store.actorId)).error);
  assert.equal(store.actor?.username, 'zaheer');
});

test('a valid local rename retains incoming history without changing the account identity', async () => {
  const store = new DemoStore(); store.signIn('demo-zaheer'); const db = createDemoClient(store);
  assert.equal((await db.from('users').update({ username: 'zaheer_demo' }).eq('id', store.actorId)).error, null);
  assert.equal(store.actor?.id, 'demo-zaheer');
  assert.equal((await db.from('messages').select()).data.length, 2);
  assert.equal(store.tables.messages[0].receiver_username, 'zaheer_demo');
});
test('arbitrary SQL and schema-creation RPCs are always denied', async () => {
  const store = new DemoStore(); store.signIn('demo-admin'); const db = createDemoClient(store);
  for (const name of ['exec_sql', 'admin_exec_sql', 'create_user_without_constraint', 'create_reports_table_if_not_exists']) assert.ok((await db.rpc(name)).error);
});

test('actual legacy unsigned JWT helper cannot authorize a callback', async () => {
  let executed = false;
  await assert.rejects(executeWithClerkAuth('unsigned.payload.value', 'demo-zaheer', async () => { executed = true; }));
  assert.equal(executed, false);
});

test('actual send helper enforces synthetic session and sender identity without service traffic', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Unexpected integration traffic in auth test.'); };
  try {
    demoStore.reset(); demoStore.signIn('demo-zaheer');
    const message = { sender_id: 'demo-zaheer', receiver_username: 'alice', content: 'Synthetic auth test' };
    await assert.rejects(sendMessageWithAuth('forged', 'demo-zaheer', message));
    await assert.rejects(sendMessageWithAuth('demo:demo-zaheer', 'demo-zaheer', { ...message, sender_id: 'demo-alice' }));
    const keys = await encryption(); const state = await keys.inspect('demo-alice');
    await keys.verify('demo-alice', state.own.keyId, state.peer.keyId);
    const result = await sendMessageWithAuth('demo:demo-zaheer', 'demo-zaheer', message);
    assert.equal(result.error, null);
    assert.equal(demoStore.tables.messages.length, 3);
    assert.equal(demoStore.tables.messages[2].content, '');
    assert.ok(!JSON.stringify(demoStore.tables.messages[2]).includes(message.content));
    assert.equal(result.data?.[0].content, message.content);
  } finally { globalThis.fetch = realFetch; demoStore.reset(); }
});
