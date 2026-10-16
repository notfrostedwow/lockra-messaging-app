import AsyncStorage from '@react-native-async-storage/async-storage';
import { demoStore, seedTables, type Tables } from './store';

const KEY = 'lockra:synthetic-data:v1';
export async function loadDemoData() {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw) {
    const stored = JSON.parse(raw) as { version: number; tables: Tables };
    if (stored.version !== 1 || !stored.tables || !Object.keys(seedTables()).every(t => Array.isArray(stored.tables[t]))) {
      throw new Error('Invalid local demo data. Reset the demo to continue.');
    }
    demoStore.tables = stored.tables;
  }
  let pending = Promise.resolve();
  demoStore.onPersist = tables => {
    const data = JSON.stringify({ version: 1, tables });
    pending = pending.then(() => AsyncStorage.setItem(KEY, data));
  };
}
