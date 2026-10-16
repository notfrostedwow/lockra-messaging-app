import { randomBytes } from 'node:crypto';
import { createIdentity, encryptDM, publicIdentity } from '../../lib/e2ee/protocol';
export function encryptedFixture() {
  const sender = createIdentity('demo-zaheer', randomBytes), receiver = createIdentity('demo-alice', randomBytes);
  const context = { id: 'encrypted-fixture', sender_id: sender.userId, recipient_id: receiver.userId, timestamp: new Date().toISOString() };
  return { ...context, receiver_username: 'alice', content: '', encryption_version: 1, ciphertext: JSON.stringify(encryptDM(context, 'A local message', sender, publicIdentity(receiver), randomBytes)) };
}
