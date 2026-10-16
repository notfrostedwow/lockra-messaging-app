import { isDemo } from './runtime';

export function isLocalUrl(input: string, origin = 'http://localhost') {
  try {
    const u = new URL(input, origin);
    if (['data:', 'blob:'].includes(u.protocol)) return true;
    return ['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol) &&
      ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  } catch { return false; }
}
// Defense in depth: installed before routing/provider code. Screens use local data.
if (isDemo) {
  if (typeof document !== 'undefined') {
    const policy = document.createElement('meta');
    policy.httpEquiv = 'Content-Security-Policy';
    policy.content = "default-src 'self'; connect-src 'self' ws://localhost:* ws://127.0.0.1:*; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; media-src 'self' blob:;";
    document.head.appendChild(policy);
  }
  const realFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!isLocalUrl(url, globalThis.location?.origin)) return Promise.reject(new Error('Nonlocal network is disabled in offline demo.'));
    return realFetch(input instanceof URL ? input.href : input, init);
  };
  if (typeof XMLHttpRequest !== 'undefined') {
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
      if (!isLocalUrl(String(url), globalThis.location?.origin)) throw new Error('Nonlocal XHR is disabled in offline demo.');
      return open.call(this, method, String(url), async, username, password);
    };
  }
  if (typeof WebSocket !== 'undefined') {
    const RealWebSocket = WebSocket;
    globalThis.WebSocket = class extends RealWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        if (!isLocalUrl(String(url), globalThis.location?.origin)) throw new Error('Nonlocal sockets are disabled in offline demo.');
        super(url, protocols);
      }
    };
  }
}
