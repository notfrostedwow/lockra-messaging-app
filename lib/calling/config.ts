import { isDemo } from '../runtime';
export function requireCallingConfig(input: { demo: boolean; enabled?: string; api?: string; media?: string }) {
  if (input.demo) throw new Error('Calls are unavailable in offline demo. No microphone, camera or provider connection was started.');
  if (input.enabled !== 'true' || !input.api || !input.media || /example|YOUR_|placeholder/i.test(input.api + input.media)) throw new Error('Calling requires deliberate API and media-server configuration.');
  const api = new URL(input.api), media = new URL(input.media);
  if (api.protocol !== 'https:' || media.protocol !== 'wss:' || api.username || api.password || media.username || media.password || api.search || api.hash || media.search || media.hash) throw new Error('Calling requires an HTTPS API and WSS media server without URL credentials.');
  return { api: api.href.replace(/\/$/, ''), media: media.href };
}
export const callingConfig = () => requireCallingConfig({ demo: isDemo, enabled: process.env.EXPO_PUBLIC_ENABLE_CALLS, api: process.env.EXPO_PUBLIC_CALL_API_URL, media: process.env.EXPO_PUBLIC_LIVEKIT_URL });
export function callingConfigured() { try { callingConfig(); return true; } catch { return false; } }
