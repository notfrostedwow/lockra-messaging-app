import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createCommunityService } from '../lib/communityRepository';
import { DemoStore } from '../lib/demo/store';
import { createDemoClient } from '../lib/demo/client';

function fixture() {
  const store = new DemoStore(); store.signIn('demo-zaheer');
  const client = createDemoClient(store) as unknown as SupabaseClient;
  return { store, service: createCommunityService(client, () => client) };
}
test('existing community service creates, lists and sends through an explicit mock integration', async () => {
  const { store, service } = fixture();
  const community = await service.createCommunity('Synthetic community', 'public', store.actorId!);
  assert.ok(community);
  assert.ok((await service.getUserCommunities(store.actorId!)).some(c => c.id === community.id));
  const message = await service.sendMessage(community.id, 'Existing service, local data', store.actorId!);
  assert.ok(message);
  assert.equal((await service.getCommunityMessages(community.id))[0].content, message.content);
});
test('existing service denied admin/member operations do not become fake success', async () => {
  const { store, service } = fixture();
  assert.equal(await service.lockCommunity('demo-design', store.actorId!), false);
  assert.equal(await service.changeUserRole('demo-design', store.actorId!, 'owner', store.actorId!), false);
  assert.equal(await service.sendMessage('demo-private', 'not a member', store.actorId!), null);
  assert.equal(await service.deleteCommunity('demo-design', store.actorId!), false);
});
test('existing invite/public joins and leaving exercise actual service logic', async () => {
  const { store, service } = fixture();
  assert.equal(await service.joinCommunityByInviteCode('WRONG', store.actorId!), false);
  assert.ok(await service.joinCommunityByInviteCode('DEMOJOIN', store.actorId!));
  assert.equal(await service.joinPublicCommunity('demo-builders', store.actorId!), true);
  assert.equal(await service.leaveCommunity('demo-builders', store.actorId!), true);
  assert.equal(store.member('demo-builders'), undefined);
});
