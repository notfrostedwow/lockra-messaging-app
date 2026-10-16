import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';

type BannerType = 'info' | 'success' | 'warning' | 'error';

interface BannerProps {
  visible: boolean;
  message: string;
  type?: BannerType;
  onClose?: () => void;
  colors: { background: string; text: string; primary: string; error: string } & Record<string, string>;
}

export const Banner: React.FC<BannerProps> = ({ visible, message, type = 'info', onClose, colors }) => {
  const [translateY] = useState(() => new Animated.Value(50));
  const [opacity] = useState(() => new Animated.Value(0));

  

  const backgroundByType: Record<BannerType, string> = {
    info: colors.primary + '33',
    success: '#22C55E33',
    warning: '#F59E0B33',
    error: colors.error + '33',
  };

  const borderByType: Record<BannerType, string> = {
    info: colors.primary,
    success: '#22C55E',
    warning: '#F59E0B',
    error: colors.error,
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 50, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }
  }, [opacity, translateY, visible]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: backgroundByType[type],
          borderColor: borderByType[type],
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={3}>
        {message}
      </Text>
      {onClose ? (
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  closeBtn: {
    marginLeft: 8,
  },
  closeText: {
    fontSize: 14,
  },
});

export default Banner;


