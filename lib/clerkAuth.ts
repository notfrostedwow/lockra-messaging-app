import { createAuthenticatedSupabaseClient } from './supabase';
import { demoStore, type Row } from './demo/store';
import { isDemo } from './runtime';
import { encryption } from './e2ee/runtime';
import { secureRandom } from './e2ee/storage';
import { bytesToHex } from '@noble/hashes/utils.js';

/** The old unsigned JWT decoder cannot authorize anything. Kept as a fail-closed contract. */
export async function executeWithClerkAuth<T>(_token: string, _userId: string, _operation: () => Promise<T>): Promise<T> {
  throw new Error('Unsigned JWT authorization is disabled. Use an authenticated data client with backend policies.');
}
/** Server-side JWT validation and RLS remain mandatory in real integration mode. */
export async function sendMessageWithAuth(clerkToken: string, clerkUserId: string, messageData: Row) {
  if (!clerkToken || !clerkUserId) throw new Error('Authentication credentials required.');
  if (messageData.attachments?.length) throw new Error('Encrypted DM attachments are not implemented.');
  if (isDemo && (demoStore.actorId !== clerkUserId || clerkToken !== 'demo:' + clerkUserId)) throw new Error('Synthetic session mismatch.');
  const client = createAuthenticatedSupabaseClient(clerkToken);
  const { data: user, error } = await client.from('users').select('id').eq('clerk_id', clerkUserId).single();
  if (error || !user || messageData.sender_id !== user.id) throw new Error('Sender identity denied.');
  const { data: recipient, error: recipientError } = await client.from('users').select('id,username').eq('username', messageData.receiver_username).single();
  if (recipientError || !recipient) throw new Error('Recipient unavailable.');
  const row = { ...messageData, id: messageData.id ?? bytesToHex(secureRandom(16)), timestamp: messageData.timestamp ?? new Date().toISOString() };
  const encrypted = await (await encryption()).encrypt(row, recipient.id);
  return client.from('messages').insert(encrypted).select();
}
