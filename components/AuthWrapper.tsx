import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { routeDecision } from '@/lib/authorization';
import { isDemo } from '@/lib/runtime';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { colors } = useTheme();
  const decision = routeDecision(pathname, user, isDemo);
  useEffect(() => { if (!loading && decision === 'signin') router.replace('/signin'); }, [loading, decision, router]);
  if (loading || decision === 'signin') return <ActivityIndicator accessibilityLabel="Loading session" color={colors.primary} />;
  if (decision === 'denied') {
    return <View style={{ padding: 24 }}><Text style={{ color: colors.text }}>Access denied. Admin operations require an authorized server boundary.</Text></View>;
  }
  return <>{children}</>;
}
