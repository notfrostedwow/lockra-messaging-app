// Mitigation for the retained Router/query-string decoder advisory. This validates
// input with the platform decoder; it never invokes the vulnerable fallback.
// It is not a replacement decoder or a claim that the dependency is patched.
export const MAX_ROUTE_INPUT = 2048;

export function isSafeRouteInput(input: string): boolean {
  if (input.length > MAX_ROUTE_INPUT) return false;
  try { decodeURIComponent(input); return true; } catch { return false; }
}

type BrowserLocation = Pick<Location, 'pathname' | 'search' | 'hash' | 'replace'>;
type BrowserEvents = Pick<Window, 'addEventListener'>;

export function installBrowserUrlGuard(
  location: BrowserLocation | undefined = typeof window === 'undefined' ? undefined : window.location,
  events: BrowserEvents | undefined = typeof window === 'undefined' ? undefined : window,
): boolean {
  // Native intents still need a separately tested platform boundary. No native
  // mitigation or device verification is implied by this browser-only guard.
  if (!location || !events) return true;
  const validate = (event?: Event) => {
    if (isSafeRouteInput(location.pathname + location.search + location.hash)) return true;
    event?.stopImmediatePropagation();
    location.replace('/');
    return false;
  };
  if (!validate()) return false;
  events.addEventListener('popstate', validate, { capture: true });
  events.addEventListener('hashchange', validate, { capture: true });
  return true;
}
