import type { SupabaseClient } from '@supabase/supabase-js';
import { DMEncryption, type Directory } from './service';
import type { PublicIdentity } from './protocol';
import { keyStorage, secureRandom } from './storage';
import { isDemo } from '../runtime';
import { DEMO_USERS, demoStore } from '../demo/store';

let realActor: string | null = null;
export function setEncryptionActor(id: string | null) { realActor = id; }
export const encryptionActor = () => isDemo ? demoStore.actorId : realActor;
let instance: DMEncryption | undefined;
let boot: Promise<void> | undefined;
export function configureEncryption(raw: SupabaseClient) {
  if (instance) return instance;
  const synthetic = new Map<string, PublicIdentity>();
  const active = new Map<string, PublicIdentity>();
  const directory: Directory = isDemo ? {
    current: async user => active.get(user) ?? null,
    find: async (user, key) => synthetic.get(user + ':' + key) ?? null,
    publish: async key => { synthetic.set(key.userId + ':' + key.keyId, key); active.set(key.userId, key); },
  } : {
    current: async user => {
      const { data, error } = await raw.from('dm_public_keys').select('*').eq('user_id', user).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw new Error('Reviewed encryption schema/public directory unavailable.');
      return data ? { userId: data.user_id, keyId: data.key_id, publicKey: data.public_key } : null;
    },
    find: async (user, key) => {
      const { data, error } = await raw.from('dm_public_keys').select('*').eq('user_id', user).eq('key_id', key).maybeSingle();
      if (error) throw new Error('Encryption directory unavailable.');
      return data ? { userId: data.user_id, keyId: data.key_id, publicKey: data.public_key } : null;
    },
    publish: async key => {
      if (encryptionActor() !== key.userId) throw new Error('Public-key owner required.');
      const { error } = await raw.from('dm_public_keys').insert({ user_id: key.userId, key_id: key.keyId, public_key: key.publicKey });
      if (error) throw new Error('Public-key registration failed. No plaintext fallback.');
    },
  };
  instance = new DMEncryption(keyStorage, directory, secureRandom, encryptionActor);
  // Only the deliberately synthetic simulation holds all participants' keys together.
  boot = isDemo ? (async () => {
    for (const user of DEMO_USERS) {
      const ownService = new DMEncryption(keyStorage, directory, secureRandom, () => user.id);
      await ownService.own(user.id);
    }
  })() : Promise.resolve();
  return instance;
}
export async function encryption() {
  if (!instance) throw new Error('Encryption adapter not initialized.');
  await boot; return instance;
}
