import type { CallDirectory } from './service';
type Profile = { id: string; subject: string; enabled: boolean };
/** Explicit server-operator allowlist for local integration development.
 * Not a production profile database or a client-controlled identity mapping. */
export function createDevelopmentDirectory(input: unknown): CallDirectory {
  const value = input as { profiles: Profile[]; allowedPairs: string[][] };
  if (!Array.isArray(value?.profiles) || !Array.isArray(value?.allowedPairs) || !value.profiles.length || value.profiles.length > 100 ||
      value.profiles.some(p => !p.id || !p.subject || typeof p.enabled !== 'boolean') ||
      new Set(value.profiles.map(p => p.id)).size !== value.profiles.length || new Set(value.profiles.map(p => p.subject)).size !== value.profiles.length ||
      value.allowedPairs.some(pair => !Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1] || pair.some(id => !value.profiles.some(p => p.id === id)))) throw new Error('Invalid private calling directory.');
  const enabled = (id: string) => value.profiles.some(p => p.id === id && p.enabled);
  return {
    identity: async subject => value.profiles.find(p => p.subject === subject && p.enabled) ?? null,
    allowed: async (a, b) => enabled(a) && enabled(b) && value.allowedPairs.some(p => p.includes(a) && p.includes(b)),
  };
}
