import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputProps extends TextInputProps {
  label?: string;
  leftIcon?: React.ReactNode;
  error?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: ViewStyle;
  secureTextEntry?: boolean;
}

export function Input({
  label,
  leftIcon,
  error,
  containerStyle,
  labelStyle,
  inputStyle,
  secureTextEntry,
  ...props
}: InputProps) {
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.text }, labelStyle]}>
          {label}
        </Text>
      )}
      <View style={[
        styles.inputContainer, 
        { 
          borderColor: error ? colors.error : colors.border,
          backgroundColor: colors.card
        }, 
        inputStyle
      ]}>
        {leftIcon}
        <TextInput
          style={[
            styles.input,
            { color: colors.text }
          ]}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secureTextEntry && !showPassword}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity 
            onPress={togglePasswordVisibility}
            style={styles.eyeIcon}
          >
            {showPassword ? (
              <EyeOff size={20} color={colors.placeholder} />
            ) : (
              <Eye size={20} color={colors.placeholder} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 4,
    opacity: 0.7,
  },
  error: {
    marginTop: 4,
    fontSize: 14,
  },
});