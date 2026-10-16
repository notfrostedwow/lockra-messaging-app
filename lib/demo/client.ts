import { DemoStore, demoStore, type Row } from './store';

type Result = { data: any; error: { message: string; code: string } | null; count: number | null };
type Predicate = (row: Row) => boolean;
// Parse only the PostgREST boolean expressions used by the existing screens.
function splitTerms(value: string) {
  let depth = 0, start = 0;
  const parts: string[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    if (value[i] === ')') depth--;
    if (value[i] === ',' && depth === 0) { parts.push(value.slice(start, i)); start = i + 1; }
  }
  parts.push(value.slice(start)); return parts;
}
function expression(value: string): Predicate {
  if (value.startsWith('and(') || value.startsWith('or(')) {
    const and = value.startsWith('and(');
    const predicates = splitTerms(value.slice(and ? 4 : 3, -1)).map(expression);
    return row => and ? predicates.every(p => p(row)) : predicates.some(p => p(row));
  }
  const [key, op, ...rest] = value.split('.');
  const expected = rest.join('.');
  if (op !== 'eq') throw new Error('Unsupported demo filter.');
  return row => String(row[key]) === expected;
}

export class DemoQuery implements PromiseLike<Result> {
  private filters: Predicate[] = [];
  private action = 'select';
  private values: Row[] = [];
  private columns = '*';
  private sort?: { key: string; ascending: boolean };
  private start = 0;
  private end = Infinity;
  private singular = false;
  private optional = false;
  private head = false;
  private result?: Promise<Result>;
  constructor(private store: DemoStore, private table: string) {}
  select(columns = '*', options?: { count?: string; head?: boolean }) { this.columns = columns; this.head = !!options?.head; return this; }
  eq(key: string, value: unknown) { this.filters.push(r => r[key] === value); if (this.table === 'communities' && key === 'invite_code') this.store.joinCode = String(value); return this; }
  neq(key: string, value: unknown) { this.filters.push(r => r[key] !== value); return this; }
  in(key: string, values: unknown[]) { this.filters.push(r => values.includes(r[key])); return this; }
  is(key: string, value: unknown) { this.filters.push(r => (r[key] ?? null) === value); return this; }
  not(key: string, operator: string, value: unknown) { if (operator !== 'is') throw new Error('Unsupported demo filter.'); return this.neq(key, value); }
  ilike(key: string, value: string) { const text = value.replace(/%/g, '').toLowerCase(); this.filters.push(r => String(r[key] ?? '').toLowerCase().includes(text)); return this; }
  like(key: string, value: string) { return this.ilike(key, value); }
  gt(key: string, value: any) { this.filters.push(r => r[key] > value); return this; }
  gte(key: string, value: any) { this.filters.push(r => r[key] >= value); return this; }
  lt(key: string, value: any) { this.filters.push(r => r[key] < value); return this; }
  lte(key: string, value: any) { this.filters.push(r => r[key] <= value); return this; }
  match(values: Row) { for (const [k, v] of Object.entries(values)) this.eq(k, v); return this; }
  or(value: string) { const terms = splitTerms(value).map(expression); this.filters.push(r => terms.some(p => p(r))); return this; }
  order(key: string, options?: { ascending?: boolean }) { this.sort = { key, ascending: options?.ascending ?? true }; return this; }
  range(start: number, end: number) { this.start = start; this.end = end; return this; }
  limit(count: number) { this.end = this.start + count - 1; return this; }
  single() { this.singular = true; return this; }
  maybeSingle() { this.singular = true; this.optional = true; return this; }
  insert(values: Row | Row[]) { this.action = 'insert'; this.values = Array.isArray(values) ? values : [values]; return this; }
  upsert(values: Row | Row[]) { this.insert(values); this.action = 'upsert'; return this; }
  update(values: Row) { this.action = 'update'; this.values = [values]; return this; }
  delete() { this.action = 'delete'; return this; }
  private execute(): Result {
    try {
      const table = this.store.tables[this.table];
      if (!table) throw new Error('Unknown demo table; operation denied.');
      if (!this.store.actor) throw new Error('Demo authentication required.');
      let rows = table.filter(r => this.filters.every(f => f(r)));
      if (this.action === 'select') {
        rows = rows.filter(r => this.store.readable(this.table, r) || (this.table === 'communities' &&
          r.invite_code === this.store.joinCode && this.filters.some(f => !f({ ...r, invite_code: '' }))));
      } else if (this.action === 'insert' || this.action === 'upsert') {
        const now = new Date().toISOString();
        const incoming: Row[] = this.values.map(v => ({ id: globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}-${Math.random()}`,
          created_at: now, timestamp: now, read: false, ...v }));
        // Validate every operation before mutating any row.
        for (const r of incoming) this.store.authorize(this.table, 'insert', r);
        for (const r of incoming) {
          const identityFields = this.table === 'community_members' ? ['community_id', 'user_id'] :
            this.table === 'chat_settings' ? ['user_id', 'chat_with'] :
              ['user_message_deletes', 'user_pinned_messages'].includes(this.table) ? ['user_id', 'message_id'] : ['id'];
          const existing = table.find(old => identityFields.every(k => old[k] === r[k]));
          if (existing) {
            if (this.action !== 'upsert') return { data: null, error: { message: 'Already exists', code: '23505' }, count: null };
            this.store.authorize(this.table, 'update', existing, this.values[incoming.indexOf(r)]);
            Object.assign(existing, this.values[incoming.indexOf(r)]);
          } else table.push(r);
          if (this.table === 'communities') this.store.tables.community_members.push({
            id: `owner-${r.id}`, community_id: r.id, user_id: r.owner_id, role: 'owner', joined_at: now,
          });
          this.store.emit(this.table, 'INSERT', r);
        }
        rows = incoming;
      } else {
        // Check all matching rows, even when invisible, to avoid claiming unauthorized success.
        for (const r of rows) this.store.authorize(this.table, this.action, r, this.values[0]);
        for (const r of rows) {
          const old = { ...r };
          if (this.action === 'delete') table.splice(table.indexOf(r), 1);
          else {
            if (this.table === 'users' && this.values[0].username && this.values[0].username !== r.username) {
              for (const message of this.store.tables.messages) {
                if (message.receiver_username === r.username) message.receiver_username = this.values[0].username;
              }
            }
            Object.assign(r, this.values[0]);
          }
          this.store.emit(this.table, this.action === 'delete' ? 'DELETE' : 'UPDATE', r, old);
        }
      }
      const count = rows.length;
      if (this.sort) { const { key, ascending } = this.sort; rows = [...rows].sort((a, b) => (String(a[key]).localeCompare(String(b[key]))) * (ascending ? 1 : -1)); }
      rows = rows.slice(this.start, this.end + 1);
      const project = (r: Row) => {
        const copy = { ...r };
        if (this.columns.includes('users')) copy.users = this.store.tables.users.find(u => u.id === (r.user_id ?? r.sender_id));
        if (this.table === 'users' && r.id !== this.store.actorId && this.store.actor?.role !== 'admin') {
          delete copy.email; delete copy.clerk_id;
        }
        return copy;
      };
      if (this.singular && rows.length !== 1 && !(this.optional && rows.length === 0)) return { data: null, error: { message: 'Expected one row', code: 'PGRST116' }, count };
      return { data: this.head ? null : this.singular ? rows[0] ? project(rows[0]) : null : rows.map(project), error: null, count };
    } catch (e) { return { data: null, error: { message: e instanceof Error ? e.message : 'Demo operation failed', code: 'DEMO_DENIED' }, count: null }; }
  }
  then<TResult1 = Result, TResult2 = never>(onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2> {
    this.result ??= Promise.resolve().then(() => this.execute());
    return this.result.then(onfulfilled, onrejected);
  }
}

export function createDemoClient(store = demoStore) {
  const channels = new Set<{ unsubscribe: () => void }>();
  return {
    from: (table: string) => new DemoQuery(store, table),
    rpc: async (name: string) => {
      if (name === 'get_visible_users' && store.actor) return { data: store.tables.users.filter(u => u.id !== store.actorId).map(u => ({ id: u.id, username: u.username, last_seen: u.last_seen })), error: null };
      return { data: null, error: { message: 'Legacy/privileged RPC is disabled. No SQL executed.', code: 'DEMO_DENIED' } };
    },
    channel: (_name: string, _options?: unknown) => {
      const handlers: { options: Row; fn: (payload: Row) => void }[] = [];
      let cleanup: (() => void) | undefined;
      const channel = {
        on: (_type: string, options: Row, fn: (payload: Row) => void) => { handlers.push({ options, fn }); return channel; },
        subscribe: (fn?: (status: string) => void) => {
          cleanup = store.subscribeChanges((table, event, row, old) => {
            for (const h of handlers) {
              if (h.options.table !== table || (h.options.event !== '*' && h.options.event !== event)) continue;
              if (!store.readable(table, row)) continue;
              if (h.options.filter && !expression(h.options.filter.replace('=eq.', '.eq.'))(row)) continue;
              h.fn({ eventType: event, new: row, old });
            }
          });
          channels.add(channel); fn?.('SUBSCRIBED'); return channel;
        },
        unsubscribe: () => { cleanup?.(); channels.delete(channel); },
      };
      return channel;
    },
    removeChannel: async (channel: { unsubscribe: () => void }) => { channel.unsubscribe(); return 'ok'; },
    removeAllChannels: async () => { for (const c of channels) c.unsubscribe(); },
    getChannels: () => [...channels],
    storage: { from: (_bucket: string) => ({
      upload: async () => ({ data: null, error: new Error('Uploads are unavailable in offline demo.') }),
      remove: async () => ({ data: null, error: new Error('Cloud storage is disabled.') }),
      list: async () => ({ data: [], error: null }),
      createSignedUrl: async () => ({ data: null, error: new Error('Cloud storage is disabled.') }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }) },
    auth: {
      signOut: async () => { store.signOut(); return { error: null }; },
      resetPasswordForEmail: async () => ({ data: null, error: new Error('Email delivery is disabled in offline demo.') }),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: store.actor }, error: null }),
    },
  };
}
