import { parseEnvelope } from '../e2ee/protocol';
// Synthetic local data only. This repository simulates authorization; it is not RLS.
export type Row = Record<string, any>;
export type Tables = Record<string, Row[]>;
const stamp = '2026-10-15T12:00:00.000Z';
export const DEMO_USERS = [
  { id: 'demo-zaheer', username: 'zaheer', display_name: 'Zaheer · Demo', role: 'user' },
  { id: 'demo-alice', username: 'alice', display_name: 'Alice · Demo', role: 'user' },
  { id: 'demo-sam', username: 'sam', display_name: 'Sam · Demo', role: 'user' },
  { id: 'demo-admin', username: 'demo_admin', display_name: 'Admin · Demo', role: 'admin' },
].map(u => ({ ...u, email: `${u.username}@example.invalid`, clerk_id: u.id,
  is_verified: false, banned: false, can_send: true, avatar_url: null, bio: 'Synthetic offline profile',
  last_seen: stamp, created_at: stamp, updated_at: stamp, online: false,
  banned_reason: null, timeout_until: null, banned_at: null }));

export function seedTables(): Tables {
  return {
    users: JSON.parse(JSON.stringify(DEMO_USERS)),
    messages: [
      { id: 'demo-msg-1', sender_id: 'demo-alice', receiver_username: 'zaheer',
        content: 'Welcome to the offline demo, Zaheer. These conversations are synthetic.', timestamp: stamp, read: false },
      { id: 'demo-msg-2', sender_id: 'demo-zaheer', receiver_username: 'sam',
        content: 'The existing Lockra screens are running with local data.', timestamp: stamp, read: true },
    ],
    communities: [
      { id: 'demo-design', name: 'Design studio · Demo', type: 'public', owner_id: 'demo-alice',
        created_at: stamp, is_locked: false, attachments_enabled: false, topic: 'A synthetic space for ideas', rules: 'Be kind.' },
      { id: 'demo-builders', name: 'Builders · Demo', type: 'public', owner_id: 'demo-sam',
        created_at: stamp, is_locked: false, attachments_enabled: false, topic: 'Build and learn together' },
      { id: 'demo-private', name: 'Private circle · Demo', type: 'private', owner_id: 'demo-alice',
        invite_code: 'DEMOJOIN', created_at: stamp, is_locked: false, attachments_enabled: false },
    ],
    community_members: [
      { id: 'member-1', community_id: 'demo-design', user_id: 'demo-alice', role: 'owner', joined_at: stamp },
      { id: 'member-2', community_id: 'demo-design', user_id: 'demo-zaheer', role: 'member', joined_at: stamp },
      { id: 'member-3', community_id: 'demo-builders', user_id: 'demo-sam', role: 'owner', joined_at: stamp },
      { id: 'member-4', community_id: 'demo-private', user_id: 'demo-alice', role: 'owner', joined_at: stamp },
    ],
    community_messages: [
      { id: 'community-msg-1', community_id: 'demo-design', user_id: 'demo-alice',
        content: 'Welcome to our local design studio. Try sending a message.', created_at: stamp },
    ],
    subscriptions: [], user_sessions: [], chat_settings: [], privacy_settings: [],
    user_privacy_settings: [], user_security_settings: [], admin_logs: [], reports: [],
    user_blocks: [], user_reports: [], user_message_deletes: [], user_pinned_messages: [],
    community_bans: [], community_mutes: [], community_settings: [], community_reports: [],
    community_events: [], file_attachments: [], community_file_attachments: [],
  };
}

export class DemoStore {
  tables: Tables = seedTables();
  actorId: string | null = null;
  revision = 0;
  private listeners = new Set<() => void>();
  private changes = new Set<(table: string, event: string, row: Row, old: Row) => void>();
  onPersist?: (tables: Tables) => void;
  get actor() { return this.tables.users.find(u => u.id === this.actorId) ?? null; }
  signIn(id: string) {
    if (!DEMO_USERS.some(u => u.id === id)) throw new Error('Choose a synthetic demo identity.');
    this.actorId = id; this.joinCode = null; this.revision++; this.listeners.forEach(fn => fn());
  }
  signOut() { this.actorId = null; this.joinCode = null; this.revision++; this.listeners.forEach(fn => fn()); }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  subscribeChanges(fn: (table: string, event: string, row: Row, old: Row) => void) {
    this.changes.add(fn); return () => { this.changes.delete(fn); };
  }
  emit(table: string, event: string, row: Row, old: Row = {}) {
    if (table === 'users') { this.revision++; this.listeners.forEach(fn => fn()); }
    this.onPersist?.(this.tables);
    // Defer event delivery until the write's select has resolved, like a subscription.
    queueMicrotask(() => this.changes.forEach(fn => fn(table, event, row, old)));
  }
  member(communityId: string, userId = this.actorId) {
    return this.tables.community_members.find(m => m.community_id === communityId && m.user_id === userId);
  }
  manages(communityId: string) { return ['owner', 'admin'].includes(this.member(communityId)?.role); }
  readable(table: string, row: Row): boolean {
    const actor = this.actor;
    if (!actor) return false;
    if (table === 'users') return true;
    if (table === 'messages') return row.sender_id === actor.id || (row.encryption_version === 1 ? row.recipient_id === actor.id : row.receiver_username === actor.username);
    if (table === 'communities') return row.type === 'public' || !!this.member(row.id);
    if (table.startsWith('community_')) return !!this.member(row.community_id);
    if (table === 'user_reports') return actor.role === 'admin' || row.reporter_id === actor.id;
    if (table === 'user_blocks') return row.blocker_id === actor.id;
    if (table === 'file_attachments') return this.tables.messages.some(m => m.id === row.message_id && this.readable('messages', m));
    return row.user_id === actor.id;
  }
  authorize(table: string, action: string, row: Row, changes: Row = {}) {
    const actor = this.actor;
    if (!actor || actor.banned) throw new Error('Demo authentication required.');
    if (table === 'users') {
      const profileFields = ['username', 'display_name', 'bio', 'avatar_url', 'last_seen', 'updated_at'];
      const allowed = actor.role === 'admin' ? [...profileFields, 'banned', 'banned_reason', 'timeout_until', 'can_send', 'banned_at'] : profileFields;
      if (action !== 'update' || (row.id !== actor.id && actor.role !== 'admin') ||
        Object.keys(changes).some(k => !allowed.includes(k))) throw new Error('Profile privilege change denied.');
      if ('username' in changes && (typeof changes.username !== 'string' ||
        !/^[a-zA-Z0-9_]{3,20}$/.test(changes.username) ||
        this.tables.users.some(u => u.id !== row.id && u.username === changes.username))) {
        throw new Error('Username must be valid and unique; identity impersonation is denied.');
      }
      return;
    }
    if (table === 'messages') {
      if (action === 'insert') {
        const target = this.tables.users.find(u => u.username === row.receiver_username);
        if (row.sender_id !== actor.id || !target || !actor.can_send ||
          this.tables.user_blocks.some(b => (b.blocker_id === actor.id && b.blocked_id === target.id) ||
            (b.blocker_id === target.id && b.blocked_id === actor.id))) throw new Error('Message sender/recipient denied.');
        if (row.content !== '' || row.encryption_version !== 1 || row.recipient_id !== target.id) throw new Error('New DMs require encrypted text and the immutable recipient ID.');
        parseEnvelope(row.ciphertext);
      } else if (action === 'update') {
        if (row.receiver_username !== actor.username || Object.keys(changes).some(k => k !== 'read')) throw new Error('Only the recipient may mark a message read.');
      } else if (row.sender_id !== actor.id) throw new Error('Only the sender may delete a message.');
      return;
    }
    if (table === 'communities') {
      if (action === 'insert') {
        if (row.owner_id !== actor.id || !row.name?.trim() || !['public', 'private'].includes(row.type)) throw new Error('Invalid community owner/name/type.');
      } else if (action === 'delete' ? row.owner_id !== actor.id : !this.manages(row.id)) throw new Error('Community management denied.');
      if (action === 'update' && ('owner_id' in changes || 'id' in changes || 'invite_code' in changes)) throw new Error('Community identity is immutable.');
      return;
    }
    if (table === 'community_members') {
      const community = this.tables.communities.find(c => c.id === row.community_id);
      const selfJoin = action === 'insert' && row.user_id === actor.id && row.role === 'member' &&
        (community?.type === 'public' || community?.invite_code === this.joinCode);
      const selfLeave = action === 'delete' && row.user_id === actor.id && row.role !== 'owner';
      const manager = this.member(row.community_id);
      const management = this.manages(row.community_id) && row.role !== 'owner' &&
        (manager?.role === 'owner' || (row.role === 'member' && !changes.role)) && changes.role !== 'owner';
      if (!selfJoin && !selfLeave && !management) throw new Error('Membership/role change denied.');
      return;
    }
    if (table === 'community_messages') {
      const member = this.member(row.community_id);
      const community = this.tables.communities.find(c => c.id === row.community_id);
      const banned = this.tables.community_bans.some(b => b.community_id === row.community_id && b.user_id === actor.id && !b.unbanned_at);
      const muted = this.tables.community_mutes.some(m => m.community_id === row.community_id && m.user_id === actor.id && new Date(m.muted_until) > new Date());
      if (!member || banned || muted) throw new Error('Community membership required; bans/mutes enforced.');
      if (action === 'insert' && (row.user_id !== actor.id || !row.content?.trim() || row.content.length > 12000 || (community?.is_locked && !this.manages(row.community_id)))) throw new Error('Community message denied.');
      if (action !== 'insert' && row.user_id !== actor.id && !this.manages(row.community_id)) throw new Error('Message management denied.');
      return;
    }
    if (table === 'community_reports') {
      if (action !== 'insert' || row.reporter_user_id !== actor.id || !this.member(row.community_id)) throw new Error('Report denied.');
      return;
    }
    if (table.startsWith('community_')) {
      if (!this.manages(row.community_id)) throw new Error('Community manager required.');
      return;
    }
    if (table === 'subscriptions' || table.includes('attachment')) throw new Error('Provider-backed payments/uploads are unavailable in offline demo.');
    if (table === 'user_reports') {
      if (action !== 'insert' || row.reporter_id !== actor.id) throw new Error('Report denied.');
    } else if (table === 'user_blocks' ? row.blocker_id !== actor.id : row.user_id !== actor.id) throw new Error('Cross-user operation denied.');
  }
  // Set only by an exact invite-code query; never grants a role or bypasses identity.
  joinCode: string | null = null;
  reset() { this.tables = seedTables(); this.signOut(); this.onPersist?.(this.tables); }
}

export const demoStore = new DemoStore();
