import { AlertHost } from '@/components/AlertHost';
import { CallOverlay } from '@/components/CallControls';
import { CallingProvider } from '@/contexts/CallingContext';
import { alertQueue } from '@/lib/alertQueue';
import React, { useEffect , lazy, Suspense } from 'react';
import { View, Text } from 'react-native';
import { AuthProvider, useAuth as useAppAuth } from '@/contexts/AuthContext';
import { routeDecision } from '@/lib/authorization';
import { isDemo, integrationConfig } from '@/lib/runtime';
import { Stack, usePathname, useRouter, useRootNavigationState } from 'expo-router';
import { ClerkProvider } from '@/lib/auth';
import { tokenCache } from '@/lib/clerkTokenCache';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { SecureBootProvider } from '@/contexts/SecureBootContext';



// Get the Clerk publishable key
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AppShell() {


  return (
    <ClerkProvider 
      publishableKey={CLERK_PUBLISHABLE_KEY || 'demo'}
      tokenCache={tokenCache}
    >
      <ThemeProvider>
        <SecureBootProvider>
          <AuthProvider>
            <CallingProvider><RootNavigator /></CallingProvider>
          </AuthProvider>
        </SecureBootProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
const IntegrationBoot = lazy(() => import('@/lib/IntegrationBoot'));
export default function RootLayout() {
  if (isDemo) return <AppShell />;
  integrationConfig();
  return <Suspense fallback={null}><IntegrationBoot><AppShell /></IntegrationBoot></Suspense>;
}

const SCREEN_NAMES = ["index","signin","(tabs)","(clerk-auth)","+not-found","admin/analytics","admin/bans","admin/database","admin/reports","admin/users","admin-panel","auth/callback","chat/contact/[username]","chat/media/[username]","chat/settings/[username]","chat/[username]","community/members/[id]","community/[id]","contacts","create-community","device-settings","features","forgot-password","invite","new-chat","premium","privacy","profile","security","signup","storage","terms","verify-email"];
function RootNavigator() {
  const { user, loading } = useAppAuth();
  const { colors } = useTheme();
  const pathname = usePathname(); const router = useRouter();
  const navigationKey = useRootNavigationState()?.key;
  useEffect(() => { alertQueue.clear(); }, [user?.id]);
  useEffect(() => {
    if (loading || !navigationKey) return;
    const decision = routeDecision(pathname, user, isDemo);
    if (decision === 'signin') router.replace('/signin');
    else if (decision === 'denied') router.replace('/(tabs)');
  }, [loading, navigationKey, pathname, router, user]);
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    {isDemo && <Text style={{ color: colors.textSecondary, backgroundColor: colors.card, padding: 8, fontSize: 12 }}>Offline demo | Synthetic data</Text>}
    <Stack key={user?.id ?? 'signed-out'} initialRouteName="index" screenOptions={{ headerShown: false }}>
    {SCREEN_NAMES.map(name => <Stack.Protected key={name} guard={routeDecision(name, user, isDemo) === 'allow' && (name === 'index' || !loading || routeDecision(name, null, isDemo) === 'allow')}>
      <Stack.Screen name={name} />
    </Stack.Protected>)}
  </Stack><AlertHost /><CallOverlay /></View>;
}
