import { randomUUID } from 'node:crypto';
import type { CallCredentials, CallInvite, CallKind } from '../../lib/calling/types';

export class CallError extends Error { constructor(public status: number, message: string) { super(message); } }
export type Caller = { id: string; subject: string };
export interface CallDirectory {
  identity(subject: string): Promise<Caller | null>;
  allowed(caller: string, callee: string): Promise<boolean>;
}
export interface CallProvider {
  mint(room: string, identity: string, kind: CallKind): Promise<CallCredentials>;
  close(room: string): Promise<void>;
}
const active = (call: CallInvite) => call.state === 'ringing' || call.state === 'accepted';
export class CallingService {
  private calls = new Map<string, CallInvite>();
  private tokens = new Map<string, number>();
  private cleanupPending = new Set<string>();
  constructor(private directory: CallDirectory, private provider: CallProvider, private now = Date.now) {}
  private room(id: string) { return 'lockra-dm-' + id; }
  private async close(id: string) {
    this.cleanupPending.add(id);
    await this.provider.close(this.room(id)); this.cleanupPending.delete(id);
  }
  async caller(subject: string) {
    const user = await this.directory.identity(subject);
    if (!user) throw new CallError(403, 'Calling identity unavailable.'); return user;
  }
  async sweep() {
    for (const [id, call] of this.calls) {
      const revoked = active(call) && !await this.directory.allowed(call.caller, call.callee);
      if (active(call) && (this.now() >= call.expiresAt || revoked)) {
        const connected = call.state === 'accepted'; call.state = 'expired';
        if (connected) await this.close(id);
      }
      if (this.cleanupPending.has(id)) await this.close(id);
      if (!active(call) && this.now() - call.expiresAt > 300000) {
        this.calls.delete(id); this.tokens.delete(id + ':' + call.caller); this.tokens.delete(id + ':' + call.callee);
      }
    }
  }
  async invite(actor: Caller, callee: string, kind: CallKind) {
    if (!callee || callee === actor.id || !['audio', 'video'].includes(kind) || !await this.directory.allowed(actor.id, callee)) throw new CallError(403, 'Call invitation denied.');
    await this.sweep();
    if (this.calls.size >= 2000 || [...this.calls.values()].some(c => active(c) && [c.caller, c.callee].some(id => id === actor.id || id === callee))) throw new CallError(409, 'A participant is busy.');
    const call: CallInvite = { id: randomUUID(), caller: actor.id, callee, kind, state: 'ringing', createdAt: this.now(), expiresAt: this.now() + 60000 };
    this.calls.set(call.id, call); return { ...call };
  }
  async get(actor: Caller, id: string) {
    await this.sweep(); const call = this.calls.get(id);
    if (!call || (call.caller !== actor.id && call.callee !== actor.id)) throw new CallError(404, 'Call unavailable.');
    if (!await this.directory.allowed(call.caller, call.callee)) throw new CallError(403, 'Call permission revoked.');
    return { ...call };
  }
  async list(actor: Caller) {
    await this.sweep();
    const rows = [...this.calls.values()].filter(c => active(c) && (c.caller === actor.id || c.callee === actor.id));
    const result = []; for (const row of rows) if (await this.directory.allowed(row.caller, row.callee)) result.push({ ...row });
    return result;
  }
  async accept(actor: Caller, id: string) {
    const call = await this.get(actor, id);
    if (call.callee !== actor.id || call.state !== 'ringing') throw new CallError(409, 'Only the invited recipient may accept a ringing call.');
    const stored = this.calls.get(id)!;
    // Recheck after asynchronous authorization, before mutation.
    if (stored.state !== 'ringing' || this.now() >= stored.expiresAt) throw new CallError(409, 'Invitation changed or expired.');
    stored.state = 'accepted'; stored.expiresAt = this.now() + 30 * 60000;
    return { ...stored };
  }
  async reject(actor: Caller, id: string) {
    const call = await this.get(actor, id);
    if (call.callee !== actor.id || call.state !== 'ringing' || this.calls.get(id)?.state !== 'ringing') throw new CallError(409, 'Invitation cannot be rejected.');
    this.calls.get(id)!.state = 'rejected'; return { ...this.calls.get(id)! };
  }
  async end(actor: Caller, id: string) {
    const call = await this.get(actor, id); const stored = this.calls.get(id)!;
    stored.state = 'ended';
    // Retry is allowed if provider cleanup failed. Do not report cleanup success on error.
    if (call.state === 'accepted' || call.state === 'ended') await this.close(id);
    return { ...stored };
  }
  async token(actor: Caller, id: string) {
    const call = await this.get(actor, id);
    if (call.state !== 'accepted') throw new CallError(409, 'Both participants must accept before joining.');
    const key = id + ':' + actor.id;
    if (this.now() - (this.tokens.get(key) ?? -Infinity) < 2000) throw new CallError(429, 'Token request rate exceeded.');
    this.tokens.set(key, this.now());
    const credentials = await this.provider.mint(this.room(id), actor.id, call.kind);
    if (this.calls.get(id)?.state !== 'accepted' || this.now() >= call.expiresAt) throw new CallError(409, 'Call ended during token issuance.');
    return credentials;
  }
}
