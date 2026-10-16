import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useClerk } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

interface SignOutButtonProps {
  style?: any;
  textStyle?: any;
}

export default function ClerkSignOutButton({ style, textStyle }: SignOutButtonProps) {
  const { signOut } = useClerk();
  const router = useRouter();
  const { colors } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Navigate to sign in screen after sign out
      router.replace('/signin');
    } catch {
      console.error("Error signing out: [details redacted]");
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: colors.primary }, style]} 
      onPress={handleSignOut}
    >
      <Text style={[styles.text, { color: '#FFFFFF' }, textStyle]}>
        Sign Out
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 