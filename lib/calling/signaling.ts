import { callingConfig } from './config';
import type { CallCredentials, CallInvite, CallKind, Signaling } from './types';
export function createSignaling(getToken: () => Promise<string | null>, request: typeof fetch = globalThis.fetch, getConfig = callingConfig): Signaling {
  async function call(path: string, method = 'GET', body?: unknown) {
    const config = getConfig(); // Fail before token lookup, network, SDK or permissions.
    const token = await getToken(); if (!token) throw new Error('Signed calling session required.');
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await request(config.api + path, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}), credentials: 'omit', cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Calling request denied or unavailable. No successful call is implied.');
      return await response.json();
    } finally { clearTimeout(timeout); }
  }
  const path = (id: string) => '/calls/' + encodeURIComponent(id);
  return {
    invite: (callee: string, kind: CallKind) => call('/calls', 'POST', { callee, kind }) as Promise<CallInvite>,
    list: () => call('/calls') as Promise<CallInvite[]>, get: id => call(path(id)) as Promise<CallInvite>,
    accept: id => call(path(id) + '/accept', 'POST') as Promise<CallInvite>, reject: id => call(path(id) + '/reject', 'POST') as Promise<CallInvite>,
    end: id => call(path(id) + '/end', 'POST') as Promise<CallInvite>,
    token: async id => {
      const data: CallCredentials = await call(path(id) + '/token', 'POST');
      const config = getConfig();
      if (data.url !== config.media || data.room !== 'lockra-dm-' + id || !data.token) throw new Error('Calling server returned an unexpected room or media endpoint.');
      return data;
    },
  };
}
