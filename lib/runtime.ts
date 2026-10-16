export type RuntimeMode = 'demo' | 'integration';

export function resolveMode(value: string | undefined): RuntimeMode {
  if (!value || value === 'demo') return 'demo';
  if (value === 'integration') return 'integration';
  throw new Error('Unknown Lockra mode. Choose demo or integration explicitly.');
}

export const runtimeMode = resolveMode(process.env.EXPO_PUBLIC_LOCKRA_MODE);
export const isDemo = runtimeMode === 'demo';

export function requireIntegrationConfig(config: {
  enabled?: string; url?: string; anonKey?: string; clerkKey?: string;
}) {
  if (config.enabled !== 'true') throw new Error('Service integrations are disabled. Use offline demo.');
  if (!config.url || !config.anonKey || !config.clerkKey ||
      /example|YOUR_|placeholder/i.test(config.url + config.anonKey + config.clerkKey)) {
    throw new Error('Integration configuration is incomplete; no client was initialized.');
  }
  const url = new URL(config.url);
  if (url.protocol !== 'https:') throw new Error('Integration requires an HTTPS service URL.');
  return { url: url.href, anonKey: config.anonKey, clerkKey: config.clerkKey };
}

export function integrationConfig() {
  return requireIntegrationConfig({
    enabled: process.env.EXPO_PUBLIC_ENABLE_INTEGRATIONS,
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    clerkKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
}
