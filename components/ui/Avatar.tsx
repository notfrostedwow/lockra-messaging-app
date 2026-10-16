import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface AvatarProps {
  size?: number;
  username?: string;
  name?: string;
  fontSize?: number;
  style?: ViewStyle;
  hasStory?: boolean;
  isViewed?: boolean;
}

export const Avatar = ({ size = 40, username = '', name, fontSize, style, hasStory = false, isViewed = false }: AvatarProps) => {
  const { colors } = useTheme();
  
  // Make sure username is a string
  const safeUsername = (typeof username === 'string' && username) || name || ''; 
  
  const getInitials = (name: string) => {
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  };

  const getColor = (name: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFBE0B', 
      '#FD6E6A', '#A06CD5', '#7189FF', '#FF8C42'
    ];
    
    // Make sure name is defined and not empty before using charCodeAt
    if (!name || name.length === 0) {
      return colors[0]; // Default color
    }
    
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const renderAvatar = () => (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: getColor(safeUsername),
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize: fontSize ?? size * 0.4 }]}>
        {getInitials(safeUsername)}
      </Text>
    </View>
  );

  if (hasStory) {
    return (
      <LinearGradient
        colors={
          isViewed 
            ? ['#8E8E8E', '#DBDBDB'] 
            : [colors.storyRingGradientStart, colors.storyRingGradientEnd]
        }
        style={[
          styles.storyRing,
          {
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
          },
        ]}
      >
        <View
          style={[
            styles.storyInner,
            {
              width: size + 4,
              height: size + 4,
              borderRadius: (size + 4) / 2,
              backgroundColor: colors.background,
            },
          ]}
        >
          {renderAvatar()}
        </View>
      </LinearGradient>
    );
  }

  return renderAvatar();
};

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  storyRing: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  storyInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});