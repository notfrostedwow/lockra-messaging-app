import type { SupabaseClient } from '@supabase/supabase-js';
/** All legacy RPC SQL is quarantined until independently reviewed isolated replacements exist.
 * Ordinary authenticated table queries retain their original contracts and require backend RLS. */
export function withLegacyRpcQuarantine(client: SupabaseClient): SupabaseClient {
  return new Proxy(client, { get(target, key) {
    if (key === 'rpc') return async () => ({ data: null, error: { code: 'LOCKRA_RPC_QUARANTINED', message: 'Legacy RPC execution is disabled. Use a reviewed server operation or authorized table query.' } });
    const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
  } });
}
