import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { useStableEvent } from '@/hooks/useStableEvent';
import { CallController } from '@/lib/calling/controller';
import { createSignaling } from '@/lib/calling/signaling';
import { callingConfigured } from '@/lib/calling/config';
import { createMediaSession } from '@/lib/calling/media';

const Context = createContext<CallController | null>(null);
export function CallingProvider({ children }: { children: React.ReactNode }) {
  const { user, getToken } = useAuth();
  // A custom JWT template is not session-bound and cannot supply the required sid.
  const token = useStableEvent(() => getToken());
  const controller = useMemo(() => new CallController(user?.id ?? '', createSignaling(token), createMediaSession), [user?.id, token]);
  useEffect(() => {
    if (!user || !callingConfigured()) return;
    void controller.poll(); const interval = setInterval(() => { void controller.poll(); }, 2000);
    return () => clearInterval(interval);
  }, [controller, user]);
  useEffect(() => {
    const background = AppState.addEventListener('change', state => { if (state !== 'active') void controller.leave(); });
    const leave = () => { void controller.leave(); };
    if (Platform.OS === 'web') globalThis.addEventListener('pagehide', leave);
    return () => { background.remove(); if (Platform.OS === 'web') globalThis.removeEventListener('pagehide', leave); void controller.dispose(); };
  }, [controller]);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
}
export function useCalling() {
  const controller = useContext(Context); if (!controller) throw new Error('Calling provider required.');
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot);
  return { controller, state };
}
