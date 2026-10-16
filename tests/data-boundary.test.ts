import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { withLegacyRpcQuarantine } from '../lib/dataBoundary';
test('real-client boundary prevents legacy SQL RPC execution before any SDK/network invocation', async () => {
  let rpcCalls = 0, tableCalls = 0;
  const raw = { rpc: () => { rpcCalls++; throw new Error('Unsafe RPC reached SDK'); }, from: (table: string) => { tableCalls++; return table; } };
  const client = withLegacyRpcQuarantine(raw as unknown as SupabaseClient);
  for (const name of ['exec_sql', 'admin_exec_sql', 'create_user_without_constraint', 'create_reports_table_if_not_exists', 'get_visible_users', 'unreviewed_rpc']) {
    const result = await client.rpc(name); assert.equal(result.error?.code, 'LOCKRA_RPC_QUARANTINED');
  }
  assert.equal(rpcCalls, 0); assert.equal(client.from('users') as unknown, 'users'); assert.equal(tableCalls, 1);
});
