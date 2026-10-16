import type { SupabaseClient } from '@supabase/supabase-js';
import type { DMEncryption } from './service';
import { parseEnvelope } from './protocol';

/** Preserve Supabase builders and realtime while decoding only authorized DM results in memory. */
export function withEncryptedMessages(raw: SupabaseClient, crypto: DMEncryption): SupabaseClient {
  const decode = async (result: any) => {
    if (!result || result.error || !result.data) return result;
    return { ...result, data: Array.isArray(result.data) ? await Promise.all(result.data.map((r: any) => crypto.read(r))) : await crypto.read(result.data) };
  };
  const builder = (query: any): any => new Proxy(query, { get(target, property) {
    if (property === 'then') return (ok: any, fail: any) => Promise.resolve(target).then(decode).then(ok, fail);
    const value = Reflect.get(target, property);
    if (typeof value !== 'function') return value;
    return (...args: any[]) => {
      if (property === 'select' && args[0] && args[0] !== '*' && !args[1]?.head) args[0] += ',id,content,ciphertext,encryption_version,recipient_id,sender_id,timestamp';
      if (['insert', 'upsert', 'update'].includes(String(property))) {
        for (const row of Array.isArray(args[0]) ? args[0] : [args[0]]) {
          if (property !== 'update' || 'content' in row || 'ciphertext' in row || 'encryption_version' in row || 'recipient_id' in row || 'sender_id' in row || 'timestamp' in row) {
            if (property === 'update' || row.content !== '' || row.encryption_version !== 1 || !row.recipient_id) throw new Error('New DMs require immutable encrypted content.');
            parseEnvelope(row.ciphertext);
          }
        }
      }
      return builder(value.apply(target, args));
    };
  } });
  return new Proxy(raw, { get(target, property) {
    if (property === 'from') return (table: string) => table === 'messages' ? builder(target.from(table)) : target.from(table);
    if (property === 'channel') return (...args: any[]) => {
      const channel = (target.channel as any)(...args);
      let wrapped: any;
      wrapped = new Proxy(channel, { get(c, key) {
        if (key === 'on') return (type: string, options: any, fn: any) => {
          c.on(type, options, async (payload: any) => fn(options?.table === 'messages' && payload.new?.id ? { ...payload, new: await crypto.read(payload.new) } : payload));
          return wrapped;
        };
        const v = Reflect.get(c, key);
        return typeof v === 'function' ? (...values: any[]) => { const result = v.apply(c, values); return result === c ? wrapped : result; } : v;
      } });
      return wrapped;
    };
    const value = Reflect.get(target, property); return typeof value === 'function' ? value.bind(target) : value;
  } });
}
