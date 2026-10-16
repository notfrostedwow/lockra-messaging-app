import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
export const keyStorageDescription = 'Device keys in native SecureStore. No recovery or multi-device synchronization.';
export const keyStorage = {
  get: async (name: string) => {
    if (!await SecureStore.isAvailableAsync()) throw new Error('SecureStore unavailable; encryption disabled.');
    return SecureStore.getItemAsync(name);
  },
  set: async (name: string, value: string) => {
    if (!await SecureStore.isAvailableAsync()) throw new Error('SecureStore unavailable; encryption disabled.');
    await SecureStore.setItemAsync(name, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
};
export const secureRandom = (length: number) => Crypto.getRandomBytes(length);
