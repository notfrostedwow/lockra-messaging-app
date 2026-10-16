import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface ButtonProps extends TouchableOpacityProps {
  title?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'gradient' | 'success' | 'destructive' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export function Button({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  ...props
}: ButtonProps) {
  const { colors, theme } = useTheme();

  const buttonStyles = [
    styles.button,
    styles[`${size}Button`],
    fullWidth && styles.fullWidth,
    {
      backgroundColor:
        variant === 'success' ? colors.success : variant === 'destructive' ? colors.error : variant === 'primary'
          ? colors.primary
          : variant === 'secondary'
          ? theme === 'light'
            ? '#F0F0F0'
            : '#2A2A2A'
          : variant === 'outline' || variant === 'text' || variant === 'ghost'
          ? 'transparent'
          : undefined,
      borderColor: variant === 'outline' ? colors.border : 'transparent',
      borderWidth: variant === 'outline' ? 1 : 0,
      opacity: props.disabled ? 0.6 : 1,
    },
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${size}Text`],
    {
      color:
        variant === 'primary'
          ? '#FFFFFF'
          : variant === 'secondary'
          ? colors.text
          : variant === 'outline' || variant === 'text'
          ? colors.primary
          : '#FFFFFF',
      marginLeft: icon && iconPosition === 'left' ? 8 : 0,
      marginRight: icon && iconPosition === 'right' ? 8 : 0,
    },
    textStyle,
  ];

  const renderContent = () => (
    <View style={styles.contentContainer}>
      {icon && iconPosition === 'left' && !loading && icon}
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary'
              ? '#FFFFFF'
              : variant === 'secondary'
              ? colors.text
              : colors.primary
          }
          size={size === 'small' ? 16 : 20}
        />
      ) : (
        <Text style={textStyles}>{title ?? props.children}</Text>
      )}
      {icon && iconPosition === 'right' && !loading && icon}
    </View>
  );

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? title}
      activeOpacity={0.8}
        onPress={props.onPress}
        disabled={props.disabled || loading}
        style={[styles.gradientWrapper, fullWidth && styles.fullWidth, style]}
      >
        <LinearGradient
          colors={[colors.instagramGradientStart, colors.instagramGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.button, styles[`${size}Button`]]}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? title}
      activeOpacity={0.8}
      onPress={props.onPress}
      disabled={props.disabled || loading}
      style={buttonStyles}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  gradientWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  smallButton: {
    height: 32,
    paddingHorizontal: 12,
  },
  mediumButton: {
    height: 44,
    paddingHorizontal: 16,
  },
  largeButton: {
    height: 52,
    paddingHorizontal: 24,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});