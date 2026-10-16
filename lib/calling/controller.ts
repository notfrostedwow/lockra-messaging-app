import type { CallInvite, CallKind, MediaSession, Signaling } from './types';
export type CallState = { phase: 'idle' | 'ringing' | 'incoming' | 'connecting' | 'active' | 'ended' | 'error'; invite: CallInvite | null; error: string | null; microphone: boolean; camera: boolean };
const initial: CallState = { phase: 'idle', invite: null, error: null, microphone: false, camera: false };
export class CallController {
  private state: CallState = initial;
  private listeners = new Set<() => void>();
  private generation = 0;
  private cleanupListener?: () => void;
  private session: MediaSession | null = null;
  private polling = false;
  constructor(private actor: string, private signaling: Signaling, private createMedia: () => Promise<MediaSession>) {}
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  snapshot = () => this.state;
  get media() { return this.session; }
  private update(change: Partial<CallState>) { this.state = { ...this.state, ...change }; this.listeners.forEach(fn => fn()); }
  private participant(call: CallInvite) { if (call.caller !== this.actor && call.callee !== this.actor) throw new Error('Call participant required.'); }
  private async disconnect() {
    this.cleanupListener?.(); this.cleanupListener = undefined;
    const session = this.session; this.session = null;
    if (session) await session.disconnect();
  }
  private async fail(error: unknown, call?: CallInvite) {
    this.generation++;
    let cleanupError = false;
    try { await this.disconnect(); } catch { cleanupError = true; }
    if (call) try { await this.signaling.end(call.id); } catch { cleanupError = true; }
    this.update({ phase: 'error', microphone: false, camera: false, error: (error instanceof Error ? error.message : 'Call failed.') + (cleanupError ? ' Server or device cleanup could not be confirmed.' : '') });
  }
  async start(peer: string, kind: CallKind) {
    if (['ringing', 'incoming', 'connecting', 'active'].includes(this.state.phase)) return;
    const generation = ++this.generation;
    try {
      // Reserve the state immediately to prevent duplicate invitations from repeated clicks.
      this.update({ ...initial, phase: 'ringing' });
      const invite = await this.signaling.invite(peer, kind); this.participant(invite);
      if (generation !== this.generation) { await this.signaling.end(invite.id); return; }
      this.update({ invite });
    } catch (e) { if (generation === this.generation) await this.fail(e); }
  }
  async poll() {
    if (this.polling) return; this.polling = true;
    const generation = this.generation;
    try {
      const current = this.state.invite;
      if (current && ['ringing', 'incoming', 'connecting', 'active'].includes(this.state.phase)) {
        const invite = await this.signaling.get(current.id); this.participant(invite);
        if (generation !== this.generation) return;
        if (!['ringing', 'accepted'].includes(invite.state)) {
          this.generation++; await this.disconnect(); this.update({ phase: 'ended', invite, microphone: false, camera: false });
        } else this.update({ invite });
      } else if (['idle', 'ended'].includes(this.state.phase)) {
        const calls = await this.signaling.list();
        if (generation !== this.generation) return;
        const incoming = calls.find(c => c.callee === this.actor && c.state === 'ringing');
        if (incoming) this.update({ ...initial, phase: 'incoming', invite: incoming });
      }
    } catch (e) { if (generation === this.generation && this.state.invite) await this.fail(e, this.state.invite); }
    finally { this.polling = false; }
  }
  async accept() {
    const call = this.state.invite; if (!call || call.callee !== this.actor || this.state.phase !== 'incoming') return;
    const generation = this.generation;
    try {
      const invite = await this.signaling.accept(call.id);
      if (generation !== this.generation) { await this.signaling.end(call.id); return; }
      this.update({ invite }); await this.join();
    } catch (e) { if (generation === this.generation) await this.fail(e, call); }
  }
  async reject() {
    const call = this.state.invite; if (!call || call.callee !== this.actor) return;
    this.generation++;
    try { const invite = await this.signaling.reject(call.id); await this.disconnect(); this.update({ phase: 'ended', invite, microphone: false, camera: false }); }
    catch (e) { await this.fail(e, call); }
  }
  async join() {
    const call = this.state.invite;
    if (!call || call.state !== 'accepted' || !['ringing', 'incoming'].includes(this.state.phase)) return;
    const generation = ++this.generation;
    this.update({ phase: 'connecting', error: null });
    try {
      this.participant(call);
      const credentials = await this.signaling.token(call.id);
      if (generation !== this.generation) return;
      const session = await this.createMedia();
      if (generation !== this.generation) { await session.disconnect(); return; }
      this.session = session;
      this.cleanupListener = session.onDisconnected(() => { if (generation === this.generation) void this.fail(new Error('Media connection disconnected.'), call); });
      await session.connect(credentials, call.kind);
      if (generation !== this.generation) { await session.disconnect(); return; }
      this.update({ phase: 'active', microphone: true, camera: call.kind === 'video' });
    } catch (e) { if (generation === this.generation) await this.fail(e, call); }
  }
  async toggleMicrophone() {
    if (!this.session || this.state.phase !== 'active') return;
    const generation = this.generation;
    try { const enabled = !this.state.microphone; await this.session.microphone(enabled); if (generation === this.generation) this.update({ microphone: enabled }); }
    catch (e) { if (generation === this.generation) await this.fail(e, this.state.invite ?? undefined); }
  }
  async toggleCamera() {
    if (!this.session || this.state.phase !== 'active' || this.state.invite?.kind !== 'video') return;
    const generation = this.generation;
    try { const enabled = !this.state.camera; await this.session.camera(enabled); if (generation === this.generation) this.update({ camera: enabled }); }
    catch (e) { if (generation === this.generation) await this.fail(e, this.state.invite ?? undefined); }
  }
  async leave() {
    this.generation++; const call = this.state.invite;
    try {
      await this.disconnect();
      if (call) await this.signaling.end(call.id);
      this.update({ phase: 'ended', microphone: false, camera: false });
    } catch (e) { await this.fail(e); }
  }
  dismiss() { if (['error', 'ended'].includes(this.state.phase)) this.update({ ...initial }); }
  async dispose() { await this.leave(); this.listeners.clear(); }
}
