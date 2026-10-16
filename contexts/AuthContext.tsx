import { useStableEvent } from '@/hooks/useStableEvent';
import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { createAuthenticatedSupabaseClient, setIntegrationTokenProvider } from '../lib/supabase';
import { useAuth as useClerkAuth, useUser } from '@/lib/auth';
import * as Device from 'expo-device';

import { User } from '../types';
import { useRouter } from 'expo-router';
import { forceClerkSignOut } from '../lib/clearClerkSession';
import { sessionHelpers } from '../lib/clerkTokenCache';
import { isDemo } from '../lib/runtime';
import { demoStore } from '../lib/demo/store';
import { loadDemoData } from '../lib/demo/persistence';
import { setEncryptionActor } from '../lib/e2ee/runtime';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  forceSignOut: () => Promise<void>;
  isAuthenticated: boolean;
  getToken: (options?: { template?: string }) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function IntegrationAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Use Clerk's authentication
  const { isSignedIn, signOut: clerkSignOut, getToken } = useClerkAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();

  const recordUserSession = async (userId: string) => {
    try {
      const brand = Device.brand || '';
      const modelName = Device.modelName || '';
      const deviceString = `${brand} ${modelName}`.trim() || 'Unknown Device';
      
      console.log("📱 Recording user session for: [details redacted]");
      
      // Try to get Clerk token for authenticated requests
      let token: string | null = null;
      try {
        token = await getToken();
      } catch {
        console.warn("⚠️ Failed to get Supabase token, trying default token: [details redacted]");
        try {
          token = await getToken();
        } catch {
          console.warn("⚠️ Failed to get default token as well: [details redacted]");
        }
      }

      if (!token) {
        console.warn("⚠️ No Clerk token available for session recording, skipping database session tracking [details redacted]");
        return;
      }

      // Try to create authenticated Supabase client
      let authenticatedSupabase;
      try {
        authenticatedSupabase = createAuthenticatedSupabaseClient(token);
      } catch {
        console.warn("⚠️ Failed to create authenticated Supabase client: [details redacted]");
        return;
      }
      
      // Try to record session - if it fails, don't break the auth flow
      try {
        // Clear existing sessions for this device
        await authenticatedSupabase
          .from('user_sessions')
          .delete()
          .eq('user_id', userId)
          .eq('device_type', deviceString);

        // Mark other sessions as not current
        await authenticatedSupabase
          .from('user_sessions')
          .update({ is_current: false })
          .eq('user_id', userId);
        
        // Insert new session
        const { error } = await authenticatedSupabase
          .from('user_sessions')
          .insert({
            user_id: userId,
            device_type: deviceString,
            is_current: true,
          });

        if (error) {
          console.warn("⚠️ Error recording session (non-critical): [details redacted]");
        } else {
          console.log("✅ Session recorded successfully [details redacted]");
        }
      } catch {
        console.warn("⚠️ Database session recording failed (non-critical): [details redacted]");
      }
    } catch {
      console.warn("⚠️ Session recording failed (non-critical): [details redacted]");
    }
  };



  const syncUserWithSupabase = useStableEvent(async (identity: { id: string }) => {
    // Provisioning/verification belongs to a signed server webhook, never a client INSERT.
    const token = await getToken();
    if (!token) throw new Error('Authenticated Clerk session required.');
    const client = createAuthenticatedSupabaseClient(token);
    const { data, error } = await client.from('users').select('*').eq('clerk_id', identity.id).single();
    if (error || !data) throw new Error('Profile not provisioned by the authorized server.');
    setEncryptionActor(data.id);
    setUser(data);
    await recordUserSession(data.id);
  });

  const refreshProfile = async () => {
    if (!clerkUser) return;
    await syncUserWithSupabase(clerkUser);
  };

  const signOut = async () => {
    try {
      // Try to clean up session in database (non-critical)
      if (user?.id) {
        try {
          // Get Clerk token for authenticated requests
          const token = await getToken();
          if (token) {
            // Use authenticated Supabase client for session cleanup
            const authenticatedSupabase = createAuthenticatedSupabaseClient(token);
            await authenticatedSupabase
              .from('user_sessions')
              .update({ is_current: false })
              .eq('user_id', user.id)
              .eq('is_current', true);
            console.log("✅ Database session cleaned up successfully [details redacted]");
          }
        } catch {
          console.warn("⚠️ Failed to clean up database session (non-critical): [details redacted]");
        }
      }

      // Clear cached session data
      await sessionHelpers.clearUserSession();

      // Sign out from Clerk
      await clerkSignOut();
      setEncryptionActor(null); setUser(null);
      
      console.log("✅ Sign out completed successfully [details redacted]");
      router.replace('/signin');
    } catch {
      console.error("❌ Error signing out: [details redacted]");
      // Even if there's an error, try to clear local state and redirect
      setEncryptionActor(null); setUser(null);
      await sessionHelpers.clearUserSession();
      router.replace('/signin');
    }
  };

  const forceSignOut = async () => {
    try {
      console.log("Force signing out - clearing all Clerk data... [details redacted]");
      
      // First try normal sign out
      try {
        await clerkSignOut();
      } catch {
        console.log("Normal Clerk sign out failed, forcing clear: [details redacted]");
      }
      
      // Force clear all Clerk session data
      await forceClerkSignOut();
      
      // Clear local state
      setEncryptionActor(null); setUser(null);
      
      // Navigate to sign in
      router.replace('/signin');
      
      console.log("✅ Force sign out completed [details redacted]");
    } catch {
      console.error("❌ Error during force sign out: [details redacted]");
    }
  };

  

  useEffect(() => {
    setIntegrationTokenProvider(() => getToken());
    return () => setIntegrationTokenProvider(async () => null);
  }, [getToken]);

useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("🚀 Initializing Clerk-Supabase auth context [details redacted]");
        console.log("📊 Auth state: [details redacted]");
        
        // Wait for Clerk to fully load before proceeding
        if (!userLoaded) {
          console.log("⏳ Clerk user not loaded yet, waiting... [details redacted]");
          return;
        }
        
        if (isSignedIn && clerkUser) {
          console.log("✅ User is signed in, syncing with Supabase... [details redacted]");
          await syncUserWithSupabase(clerkUser);
          console.log("🔄 User sync completed [details redacted]");
        } else {
          console.log("❌ User not signed in, checking for cached session... [details redacted]");
          
          // Cached profile JSON never proves authentication.
          setEncryptionActor(null); setUser(null);
          await sessionHelpers.clearUserSession();
        }
      } catch {
        console.error("❌ Unexpected error initializing auth: [details redacted]");
        setEncryptionActor(null); setUser(null);
        // Clear potentially corrupted cache
        await sessionHelpers.clearUserSession();
      } finally {
        // Only set loading to false when Clerk is fully loaded
        if (userLoaded) {
          console.log("✅ Auth initialization completed [details redacted]");
          setLoading(false);
        }
      }
    };

    initAuth();
  }, [isSignedIn, clerkUser, userLoaded, syncUserWithSupabase]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signOut, 
      forceSignOut,
      refreshProfile,
      isAuthenticated: isSignedIn || false,
      getToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

function DemoAuthProvider({ children }: { children: React.ReactNode }) {
  useSyncExternalStore(demoStore.subscribe, () => demoStore.revision, () => 0);
  const actorId = demoStore.actorId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  if (error) throw error;
  const user = actorId ? demoStore.actor as unknown as User : null;
  useEffect(() => { loadDemoData().then(() => setLoading(false)).catch(e => setError(e)); }, []);

  return <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user,
    signOut: async () => demoStore.signOut(), forceSignOut: async () => demoStore.signOut(),
    refreshProfile: async () => {}, getToken: async () => actorId ? 'demo:' + actorId : null }}>
    {children}
  </AuthContext.Provider>;
}
function AuthProvider({ children }: { children: React.ReactNode }) {
  return isDemo ? <DemoAuthProvider>{children}</DemoAuthProvider> : <IntegrationAuthProvider>{children}</IntegrationAuthProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext, AuthProvider };
export default AuthProvider; 
