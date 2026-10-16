import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomCommandValue } from '../lib/communityRandom';
test('existing random slash-command outcomes stay in range; malformed/unsafe roll bounds are rejected', () => {
  assert.equal(randomCommandValue(100, () => 0), 1);
  assert.equal(randomCommandValue(100, () => 0.999999), 100);
  assert.equal(randomCommandValue(1, () => 0.5), 1);
  for (const limit of [0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => randomCommandValue(limit));
});
