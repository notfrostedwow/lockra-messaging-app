export type CallKind = 'audio' | 'video';
export type InviteState = 'ringing' | 'accepted' | 'rejected' | 'ended' | 'expired';
export type CallInvite = { id: string; caller: string; callee: string; kind: CallKind; state: InviteState; createdAt: number; expiresAt: number };
export type CallCredentials = { url: string; token: string; room: string };
export interface Signaling {
  invite(peer: string, kind: CallKind): Promise<CallInvite>;
  list(): Promise<CallInvite[]>;
  get(id: string): Promise<CallInvite>;
  accept(id: string): Promise<CallInvite>;
  reject(id: string): Promise<CallInvite>;
  end(id: string): Promise<CallInvite>;
  token(id: string): Promise<CallCredentials>;
}
export interface MediaSession {
  connect(credentials: CallCredentials, kind: CallKind): Promise<void>;
  disconnect(): Promise<void>;
  microphone(enabled: boolean): Promise<void>;
  camera(enabled: boolean): Promise<void>;
  onDisconnected(callback: () => void): () => void;
  room?: unknown;
}
