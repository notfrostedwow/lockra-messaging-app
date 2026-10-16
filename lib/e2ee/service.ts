import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { createIdentity, decryptDM, encryptDM, fingerprint, parseEnvelope, publicIdentity, ReplayGuard, type DeviceIdentity, type PublicIdentity, type Random, type MessageContext } from './protocol';

export type Vault = { get: (key: string) => Promise<string | null>; set: (key: string, value: string) => Promise<void> };
export type Directory = { current: (user: string) => Promise<PublicIdentity | null>; find: (user: string, key: string) => Promise<PublicIdentity | null>; publish: (key: PublicIdentity) => Promise<void> };
type Row = Record<string, any>;
const storageName = (...parts: string[]) => 'lockra.dm.' + bytesToHex(sha256(utf8ToBytes(JSON.stringify(parts))));
export class DMEncryption {
  private guard = new ReplayGuard();
  private pending = new Map<string, Promise<DeviceIdentity>>();
  constructor(private vault: Vault, private directory: Directory, private random: Random, private actor: () => string | null) {}
  private keyName(user: string, id: string) { return storageName('private', user, id); }
  async own(user: string, rotate = false): Promise<DeviceIdentity> {
    if (this.actor() !== user) throw new Error('Current encryption identity required.');
    if (!rotate && this.pending.has(user)) return this.pending.get(user)!;
    const operation = (async () => {
      const existing = await this.directory.current(user);
      if (existing && !rotate) {
        const value = await this.vault.get(this.keyName(user, existing.keyId));
        if (!value) throw new Error('Private key missing. Explicit rotation is required; old ciphertext cannot be recovered.');
        return JSON.parse(value) as DeviceIdentity;
      }
      const created = createIdentity(user, this.random);
      await this.vault.set(this.keyName(user, created.keyId), JSON.stringify(created));
      await this.directory.publish(publicIdentity(created)); // PUBLIC material only.
      return created;
    })();
    this.pending.set(user, operation);
    try { return await operation; } finally { this.pending.delete(user); }
  }
  async inspect(peerId: string) {
    const actor = this.actor(); if (!actor || actor === peerId) throw new Error('Two authenticated participants required.');
    const own = await this.own(actor); const peer = await this.directory.current(peerId);
    if (!peer || peer.keyId !== fingerprint(peer.publicKey)) throw new Error('Recipient has no valid encryption key.');
    const trusted = await this.vault.get(storageName('trust', actor, own.keyId, peerId));
    return { own: publicIdentity(own), peer, verified: trusted === peer.keyId };
  }
  async verify(peerId: string, displayedOwnKey: string, displayedPeerKey: string) {
    const state = await this.inspect(peerId);
    if (state.own.keyId !== displayedOwnKey || state.peer.keyId !== displayedPeerKey) throw new Error('Keys changed. Compare the current fingerprints again.');
    await this.vault.set(storageName('trust', state.own.userId, state.own.keyId, peerId), displayedPeerKey);
  }
  async encrypt(row: Row, recipientId: string) {
    const actor = this.actor(); if (!actor || row.sender_id !== actor) throw new Error('Authenticated sender required.');
    const state = await this.inspect(recipientId);
    if (!state.verified) throw new Error('Compare and verify current identity fingerprints before sending. No plaintext fallback.');
    const own = await this.own(actor);
    const context: MessageContext = { id: row.id, sender_id: actor, recipient_id: recipientId, timestamp: row.timestamp };
    const envelope = encryptDM(context, row.content, own, state.peer, this.random);
    if (this.actor() !== actor) throw new Error('Session changed during encryption.');
    return { id: row.id, sender_id: actor, receiver_username: row.receiver_username,
      timestamp: row.timestamp, read: false, recipient_id: recipientId, content: '', encryption_version: 1, ciphertext: JSON.stringify(envelope) };
  }
  async read(row: Row): Promise<Row> {
    if (!row || typeof row !== 'object') return row;
    if (row.encryption_version == null && !row.ciphertext) return { ...row, content: '[Legacy plaintext] ' + (row.content ?? ''), encryption_status: 'legacy' };
    try {
      if (row.encryption_version !== 1 || row.content !== '') throw new Error('Unsupported message encoding.');
      const actor = this.actor(); if (!actor) throw new Error('Authenticated reader required.');
      const e = parseEnvelope(row.ciphertext);
      if (actor !== row.sender_id && actor !== row.recipient_id) throw new Error('Participant required.');
      const sent = actor === row.sender_id;
      const privateRaw = await this.vault.get(this.keyName(actor, sent ? e.senderKey : e.recipientKey));
      if (!privateRaw) throw new Error('Private key unavailable.');
      const peer = await this.directory.find(sent ? row.recipient_id : row.sender_id, sent ? e.recipientKey : e.senderKey);
      if (!peer) throw new Error('Peer identity unavailable.');
      const text = decryptDM(row as MessageContext, e, JSON.parse(privateRaw), peer);
      if (this.actor() !== actor) throw new Error('Session changed.');
      this.guard.accept(actor, row as MessageContext, e);
      const trust = await this.vault.get(storageName('trust', actor, sent ? e.senderKey : e.recipientKey, peer.userId));
      const verified = trust === peer.keyId;
      return { ...row, content: verified ? text : '[Unverified identity key] ' + text, encryption_status: verified ? 'encrypted' : 'encrypted-unverified' };
    } catch { return { ...row, content: '[Encrypted message unavailable: missing key or integrity/context failure]', encryption_status: 'unavailable' }; }
  }
}
