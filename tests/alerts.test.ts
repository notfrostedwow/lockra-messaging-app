import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AlertQueue } from '../lib/alertQueue';

test('web confirmation cancels without executing a destructive callback', async () => {
  const queue = new AlertQueue(); let deleted = false;
  queue.push('Delete?', 'Synthetic confirmation', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', onPress: () => { deleted = true; } }]);
  const id = queue.current!.id;
  await queue.choose(id, 0); assert.equal(deleted, false); assert.equal(queue.current, null);
  await queue.choose(id, 1); assert.equal(deleted, false);
});
test('web action callbacks execute once, queued messages retain order and clear revokes stale actions', async () => {
  const queue = new AlertQueue(); let calls = 0;
  queue.push('First', '', [{ text: 'Continue', onPress: () => { calls++; } }]);
  const id = queue.current!.id; queue.push('Second');
  await queue.choose(id, 0); await queue.choose(id, 0);
  assert.equal(calls, 1); assert.equal(queue.current!.title, 'Second');
  const second = queue.current!.id; queue.clear(); await queue.choose(second, 0); assert.equal(queue.current, null);
});
