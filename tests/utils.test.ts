import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEmail, validateUsername, validatePassword, getImageCompressionParams, getInitials, getAvatarColor } from '../lib/utils';

test('existing signup validation accepts intended inputs and rejects malformed values', () => {
  assert.ok(validateEmail('demo@example.invalid'));
  for (const email of ['', 'a@', ' x@y.test', 'x y@z.test', 'a@b']) assert.equal(validateEmail(email), false);
  for (const name of ['ab', 'spaces here', 'bad/slash', 'abcdefghijklmnopqrstu']) assert.equal(validateUsername(name), false);
  assert.ok(validateUsername('demo_user1'));
  assert.equal(validatePassword('short'), false); assert.ok(validatePassword('longer-demo-password'));
});
test('existing image compression preserves aspect ratio and never upscales', () => {
  for (const [width, height] of [[120, 80], [8000, 6000], [900, 4500], [4500, 900]]) {
    for (const bytes of [512, 2.5e6, 6e6, 12e6]) {
      const result = getImageCompressionParams(bytes, width, height);
      assert.ok(result.width! <= width); assert.ok(result.height! <= height);
      assert.ok(Math.abs(result.width! / result.height! - width / height) < 0.01);
      assert.ok(result.quality > 0 && result.quality <= 1);
    }
  }
});
test('existing avatars have deterministic initials/color and tolerate empty usernames', () => {
  assert.equal(getInitials(''), '?'); assert.equal(getInitials('Demo Person'), 'DP');
  assert.equal(getAvatarColor('demo'), getAvatarColor('demo'));
  assert.match(getAvatarColor(''), /^#[0-9A-F]{6}$/i);
});
