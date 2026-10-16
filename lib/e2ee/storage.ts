// Web and Node tests: ephemeral private keys and trust decisions, never localStorage.
export const keyStorageDescription = 'Memory-only web keys: reload loses encrypted history. Synthetic profiles share this browser.';
const values = new Map<string, string>();
export const keyStorage = {
  get: async (name: string) => values.get(name) ?? null,
  set: async (name: string, value: string) => { values.set(name, value); },
};
export function secureRandom(length: number) {
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure randomness unavailable; encryption disabled.');
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}
