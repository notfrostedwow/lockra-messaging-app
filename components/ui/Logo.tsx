import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { VolumeX } from 'lucide-react-native';

export function Logo({ size = 'large' }: { size?: 'small' | 'large' }) {
  const { colors } = useTheme();
  
  const iconSize = size === 'large' ? 32 : 24;
  const fontSize = size === 'large' ? 32 : 24;
  
  return (
    <View style={styles.container}>
      <VolumeX size={iconSize} color={colors.primary} />
      <Text style={[
        styles.text,
        { color: colors.text, fontSize },
      ]}>
        Lockra
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontWeight: '700',
  },
});