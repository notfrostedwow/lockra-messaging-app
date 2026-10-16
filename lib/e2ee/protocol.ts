import { x25519 } from '@noble/curves/ed25519.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

export type Random = (length: number) => Uint8Array;
export type PublicIdentity = { userId: string; keyId: string; publicKey: string };
export type DeviceIdentity = PublicIdentity & { secretKey: string };
export type MessageContext = { id: string; sender_id: string; recipient_id: string; timestamp: string };
export type Envelope = { v: 1; senderKey: string; recipientKey: string; nonce: string; body: string };
export const fingerprint = (publicKey: string) => bytesToHex(sha256(hexToBytes(publicKey)));
const keyBytes = (hex: string) => { const value = hexToBytes(hex); if (value.length !== 32) throw new Error('Invalid identity key.'); return value; };
export function createIdentity(userId: string, random: Random): DeviceIdentity {
  const secret = random(32);
  try {
    const publicKey = bytesToHex(x25519.getPublicKey(secret));
    return { userId, publicKey, keyId: fingerprint(publicKey), secretKey: bytesToHex(secret) };
  } finally { secret.fill(0); }
}
export function publicIdentity(key: DeviceIdentity): PublicIdentity {
  return { userId: key.userId, keyId: key.keyId, publicKey: key.publicKey };
}
function header(c: MessageContext, e: Omit<Envelope, 'body'>) {
  if (!c.id || !c.sender_id || !c.recipient_id || c.sender_id === c.recipient_id || !Number.isFinite(Date.parse(c.timestamp))) throw new Error('Invalid DM context.');
  return utf8ToBytes(JSON.stringify(['lockra:dm:v1', c.id, c.sender_id, c.recipient_id, c.timestamp, e.v, e.senderKey, e.recipientKey, e.nonce]));
}
function sharedKey(own: DeviceIdentity, peer: PublicIdentity, nonce: Uint8Array, aad: Uint8Array) {
  if (fingerprint(own.publicKey) !== own.keyId || fingerprint(peer.publicKey) !== peer.keyId) throw new Error('Key fingerprint mismatch.');
  const secret = keyBytes(own.secretKey);
  let shared: Uint8Array | undefined;
  try {
    if (bytesToHex(x25519.getPublicKey(secret)) !== own.publicKey) throw new Error('Private/public key mismatch.');
    shared = x25519.getSharedSecret(secret, keyBytes(peer.publicKey));
    return hkdf(sha256, shared, nonce, aad, 32);
  } finally { secret.fill(0); shared?.fill(0); }
}
export function encryptDM(context: MessageContext, text: string, sender: DeviceIdentity, recipient: PublicIdentity, random: Random): Envelope {
  if (sender.userId !== context.sender_id || recipient.userId !== context.recipient_id) throw new Error('Encryption identity mismatch.');
  const plaintext = utf8ToBytes(text);
  if (!text.trim() || plaintext.length > 48000) throw new Error('DM text must contain 1 to 48000 UTF-8 bytes.');
  const nonce = random(24);
  const base = { v: 1 as const, senderKey: sender.keyId, recipientKey: recipient.keyId, nonce: bytesToHex(nonce) };
  const aad = header(context, base); const key = sharedKey(sender, recipient, nonce, aad);
  try { return { ...base, body: bytesToHex(xchacha20poly1305(key, nonce, aad).encrypt(plaintext)) }; }
  finally { key.fill(0); plaintext.fill(0); }
}
export function parseEnvelope(raw: string): Envelope {
  if (typeof raw !== 'string' || raw.length > 100000) throw new Error('Invalid encrypted message.');
  const e = JSON.parse(raw) as Envelope;
  if (e.v !== 1 || !/^[a-f0-9]{64}$/.test(e.senderKey) || !/^[a-f0-9]{64}$/.test(e.recipientKey) || !/^[a-f0-9]{48}$/.test(e.nonce) || !/^[a-f0-9]{32,96032}$/.test(e.body) || e.body.length % 2) throw new Error('Unsupported or malformed encrypted message.');
  return e;
}
export function decryptDM(context: MessageContext, envelope: Envelope, own: DeviceIdentity, peer: PublicIdentity): string {
  const sender = own.userId === context.sender_id;
  if (own.userId !== context.sender_id && own.userId !== context.recipient_id) throw new Error('DM participant required.');
  if (peer.userId !== (sender ? context.recipient_id : context.sender_id) || own.keyId !== (sender ? envelope.senderKey : envelope.recipientKey) || peer.keyId !== (sender ? envelope.recipientKey : envelope.senderKey)) throw new Error('DM key/context mismatch.');
  const nonce = hexToBytes(envelope.nonce); const aad = header(context, envelope);
  const key = sharedKey(own, peer, nonce, aad);
  let plaintext: Uint8Array | undefined;
  try { plaintext = xchacha20poly1305(key, nonce, aad).decrypt(hexToBytes(envelope.body)); return new TextDecoder('utf-8', { fatal: true }).decode(plaintext); }
  finally { key.fill(0); plaintext?.fill(0); }
}

/** History reads are idempotent; different ciphertext for an observed message ID is rejected.
 * Moving a ciphertext to a different message/conversation already fails AEAD context checks. */
export class ReplayGuard {
  private seen = new Map<string, string>();
  accept(actor: string, context: MessageContext, envelope: Envelope) {
    const id = JSON.stringify([actor, context.id]);
    const digest = bytesToHex(sha256(utf8ToBytes(JSON.stringify([context.id, context.sender_id, context.recipient_id, context.timestamp, envelope]))));
    const previous = this.seen.get(id);
    if (previous && previous !== digest) throw new Error('Conflicting encrypted message replay.');
    this.seen.set(id, digest);
  }
  clear() { this.seen.clear(); }
}
