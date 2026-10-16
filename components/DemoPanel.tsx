import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { demoStore, DEMO_USERS } from '@/lib/demo/store';
import { isDemo } from '@/lib/runtime';

export function DemoPanel() {
  const { colors } = useTheme();
  const router = useRouter();
  if (!isDemo) return null;
  return <View style={{ padding: 16, gap: 10, backgroundColor: colors.card, borderRadius: 12 }}>
    <Text style={{ color: colors.text, fontWeight: '700' }}>Offline demo · Synthetic identities</Text>
    <Text style={{ color: colors.textSecondary }}>No real authentication or cloud connection. Choose a local profile; do not enter real credentials.</Text>
    {DEMO_USERS.map(user => <TouchableOpacity key={user.id} accessibilityRole="button"
      onPress={() => { demoStore.signIn(user.id); router.replace('/(tabs)'); }}
      style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.primary }}>Continue as {user.display_name}</Text>
    </TouchableOpacity>)}
  </View>;
}
