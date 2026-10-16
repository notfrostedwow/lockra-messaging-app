import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT } from 'jose';
import { createSessionVerifier } from '../server/calling/auth';
import { createCallingHandler } from '../server/calling/handler';
import { createDevelopmentDirectory } from '../server/calling/directory';
import { CallingService } from '../server/calling/service';

const issuer = 'https://issuer.invalid', audience = 'lockra-calls', origin = 'https://app.invalid';
const keys = generateKeyPair('RS256');
async function fixture() {
  const { publicKey, privateKey } = await keys;
  let verifications = 0;
  const verify = createSessionVerifier(issuer, audience, [origin], async () => { verifications++; return publicKey; });
  const signed = (changes: Record<string, unknown> = {}) => new SignJWT({
    sub: 'synthetic-clerk-a', sid: 'synthetic-session', azp: origin, iss: issuer, aud: audience,
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60, ...changes,
  }).setProtectedHeader({ alg: 'RS256' }).sign(privateKey);
  const directory = createDevelopmentDirectory({ profiles: [{ id: 'synthetic-a', subject: 'synthetic-clerk-a', enabled: true }], allowedPairs: [] });
  const service = new CallingService(directory, {
    mint: async () => { throw new Error('No provider use permitted in session boundary tests.'); },
    close: async () => { throw new Error('No provider use permitted in session boundary tests.'); },
  });
  return { verify, signed, handler: createCallingHandler(service, verify, [origin]), verifications: () => verifications };
}

for (const [label, value] of [
  ['missing', undefined], ['empty', ''], ['whitespace', ' '], ['null', null], ['number', 42],
  ['array', [origin]], ['object', { origin }], ['unauthorized', 'https://foreign.invalid'],
  ['lookalike origin', 'https://app.invalid.foreign.invalid'],
] as const) {
  test(`signed calling JWT denies ${label} azp`, async () => {
    const f = await fixture();
    await assert.rejects(f.verify(await f.signed({ azp: value })));
  });
}
for (const [label, value] of [
  ['missing', undefined], ['empty', ''], ['whitespace', ' '], ['null', null], ['number', 42],
] as const) {
  test(`signed calling JWT denies ${label} sid`, async () => {
    const f = await fixture();
    await assert.rejects(f.verify(await f.signed({ sid: value })));
  });
}
test('signed calling JWT accepts an authorized nonempty azp and nonempty sid with a mocked public key', async () => {
  const f = await fixture();
  assert.equal(await f.verify(await f.signed()), 'synthetic-clerk-a');
  assert.equal(f.verifications(), 1);
});

for (const [label, value] of [
  ['missing', undefined], ['empty', ''], ['opaque null', 'null'], ['unauthorized', 'https://foreign.invalid'],
] as const) {
  test(`HTTP calling API denies ${label} Origin before JWT verification, including preflight`, async () => {
    const f = await fixture(); const token = await f.signed();
    for (const method of ['GET', 'OPTIONS']) {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (value !== undefined) headers.Origin = value;
      const response = await f.handler(new Request('https://api.invalid/calls', { method, headers }));
      assert.equal(response.status, 403);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    }
    assert.equal(f.verifications(), 0);
  });
}
test('authorized HTTP Origin cannot replace a required signed azp claim', async () => {
  const f = await fixture();
  const response = await f.handler(new Request('https://api.invalid/calls', {
    headers: { Origin: origin, Authorization: `Bearer ${await f.signed({ azp: undefined })}` },
  }));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
});
test('authorized signed browser session and HTTP Origin reach only the permitted synthetic call listing', async () => {
  const f = await fixture();
  const response = await f.handler(new Request('https://api.invalid/calls', {
    headers: { Origin: origin, Authorization: `Bearer ${await f.signed()}` },
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
test('authorized browser preflight permits declared headers without authorizing a session', async () => {
  const f = await fixture();
  const response = await f.handler(new Request('https://api.invalid/calls', { method: 'OPTIONS', headers: { Origin: origin } }));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(f.verifications(), 0);
});
