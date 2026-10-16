import type { SupabaseClient } from '@supabase/supabase-js';
import { createDemoClient } from './demo/client';
import { isDemo, integrationConfig } from './runtime';
import { configureEncryption } from './e2ee/runtime';
import { withEncryptedMessages } from './e2ee/client';
import { withLegacyRpcQuarantine } from './dataBoundary';


// No implicit Expo-extra or private environment fallback. No SDK initialization in demo.
const config = isDemo ? null : integrationConfig();
type Factory = typeof import('@supabase/supabase-js').createClient;
let sdkFactory: Factory | null = null;
export function configureSupabaseSdk(factory: Factory) { integrationConfig(); sdkFactory = factory; }
let getAccessToken: () => Promise<string | null> = async () => null;
export function setIntegrationTokenProvider(provider: () => Promise<string | null>) { getAccessToken = provider; }
function realClient(token?: string): SupabaseClient {
  if (!config) throw new Error('Real integration disabled.');
  if (!sdkFactory) throw new Error('Supabase integration has not been initialized.');
  const createClient = sdkFactory;
  return createClient(config.url, config.anonKey, {
    accessToken: async () => {
      const value = token ?? await getAccessToken();
      if (!value) throw new Error('Authenticated session required before service access.');
      return value;
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

let sharedRealClient: SupabaseClient | undefined;
// Preserve the query/storage/subscription contract for the original services.
/* Legacy SDK options: Clerk supplies identity; Supabase auth persistence stays disabled. */
// Create Supabase client configured for Clerk integration
// We disable Supabase auth since we're using Clerk
const rawSupabase: SupabaseClient = isDemo
  ? createDemoClient() as unknown as SupabaseClient
  : new Proxy({} as SupabaseClient, { get: (_target, property) => {
    sharedRealClient ??= realClient();
    const value = Reflect.get(sharedRealClient, property);
    return typeof value === 'function' ? value.bind(sharedRealClient) : value;
  } });
const dmEncryption = configureEncryption(rawSupabase);
export const supabase = withEncryptedMessages(isDemo ? rawSupabase : withLegacyRpcQuarantine(rawSupabase), dmEncryption);

// Function to create authenticated Supabase client with Clerk token
export const createAuthenticatedSupabaseClient = (clerkToken: string): SupabaseClient => {
  if (isDemo) return supabase;
  if (!clerkToken) throw new Error('An authenticated token is required.');
  return withEncryptedMessages(withLegacyRpcQuarantine(realClient(clerkToken)), dmEncryption);
};

// The original callback imported an absent helper. Verification belongs to Clerk,
// not an unsigned token or a client-side "verified" database write.
export async function verifyEmailToken(_token: string) {
  return { data: null, error: new Error('Legacy Supabase email verification is disabled. Use the configured Clerk verification flow.') };
}
