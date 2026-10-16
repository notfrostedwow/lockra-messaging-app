import { useCallback, useLayoutEffect, useRef } from 'react';

/** Stable event identity with the latest committed render's values.
 * Effects still list the values that should trigger a subscription or fetch.
 */
export function useStableEvent<T extends (...args: any[]) => any>(callback: T): T {
  const latest = useRef(callback);
  useLayoutEffect(() => { latest.current = callback; });
  const stable = useCallback((...args: Parameters<T>) => latest.current(...args), []);
  return stable as T;
}
