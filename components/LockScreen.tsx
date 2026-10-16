import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Fingerprint, Lock } from 'lucide-react-native';

interface LockScreenProps {
  onUnlock: () => Promise<boolean>;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const { colors } = useTheme();

  const handleUnlock = async () => {
    await onUnlock();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <Lock size={40} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          App Locked
        </Text>
        <Text style={[styles.subtitle, { color: colors.placeholder }]}>
          Use biometrics or device passcode to unlock
        </Text>
        <TouchableOpacity
          style={[styles.unlockButton, { backgroundColor: colors.primary }]}
          onPress={handleUnlock}
        >
          <Fingerprint size={24} color="#fff" />
          <Text style={styles.unlockButtonText}>Unlock App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 