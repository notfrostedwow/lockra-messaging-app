import React, { useSyncExternalStore } from 'react';
import { demoStore } from './demo/store';
import { integrationConfig, isDemo } from './runtime';

function useDemoIdentity() {
  useSyncExternalStore(demoStore.subscribe, () => demoStore.revision, () => 0);
  return demoStore.actor;
}
const deny = async (): Promise<never> => { throw new Error('Real authentication is unavailable in offline demo. Choose a synthetic identity.'); };
function useDemoAuth() {
  const user = useDemoIdentity();
  return { isLoaded: true, isSignedIn: !!user, userId: user?.id ?? null,
    signOut: async () => demoStore.signOut(),
    getToken: async () => user ? `demo:${user.id}` : null };
}
function useDemoUser() {
  const user = useDemoIdentity();
  return { isLoaded: true, isSignedIn: !!user, user: user ? { ...user,
    firstName: user.display_name, lastName: '', imageUrl: null,
    emailAddresses: [{ emailAddress: user.email }] } : null };
}
function useDemoClerk() { const { user } = useDemoUser(); return { user, signOut: async () => demoStore.signOut() }; }
function useDemoSession() { const user = useDemoIdentity(); return { isLoaded: true, session: user ? { id: user.id, getToken: async () => `demo:${user.id}` } : null }; }
function useDemoSignIn() { return { isLoaded: true, signIn: { create: deny }, setActive: deny }; }
function useDemoSignUp() { return { isLoaded: true, signUp: { create: deny, prepareEmailAddressVerification: deny, attemptEmailAddressVerification: deny }, setActive: deny }; }
function DemoClerkProvider({ children }: { children: React.ReactNode }) { return <>{children}</>; }

// SDK modules are supplied by a lazily imported integration-only boundary.
type Sdk = typeof import('@clerk/expo');
type LegacySdk = typeof import('@clerk/expo/legacy');
let configured: Sdk | null = null;
let configuredLegacy: LegacySdk | null = null;
export function configureAuthSdk(sdk: Sdk, legacy: LegacySdk) {
  integrationConfig(); configured = sdk; configuredLegacy = legacy;
}
const demo = { useAuth: useDemoAuth, useUser: useDemoUser, useClerk: useDemoClerk, useSession: useDemoSession, ClerkProvider: DemoClerkProvider } as unknown as Sdk;
const demoLegacy = { useSignIn: useDemoSignIn, useSignUp: useDemoSignUp } as unknown as LegacySdk;
function getSdk() {
  if (isDemo) return demo;
  if (!configured) throw new Error('Authentication integration has not been deliberately initialized.');
  return configured;
}
function getLegacy() {
  if (isDemo) return demoLegacy;
  if (!configuredLegacy) throw new Error('Authentication integration is disabled.');
  return configuredLegacy;
}
export const useAuth: Sdk['useAuth'] = () => getSdk().useAuth();
export const useUser: Sdk['useUser'] = () => getSdk().useUser();
export const useClerk: Sdk['useClerk'] = () => getSdk().useClerk();
export const useSession: Sdk['useSession'] = () => getSdk().useSession();
export const useSignIn: LegacySdk['useSignIn'] = () => getLegacy().useSignIn();
export const useSignUp: LegacySdk['useSignUp'] = () => getLegacy().useSignUp();
export function ClerkProvider(props: React.ComponentProps<Sdk['ClerkProvider']>) {
  const Provider = getSdk().ClerkProvider; return <Provider {...props} />;
}
