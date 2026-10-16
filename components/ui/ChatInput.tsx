import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, Keyboard, Animated, ViewStyle } from 'react-native';
import { Send, Paperclip, Mic, Smile } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttachmentPress: () => void;
  containerStyle?: ViewStyle;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInput = ({
  value,
  onChangeText,
  onSend,
  onAttachmentPress,
  containerStyle,
  placeholder = 'Message...',
  disabled = false
}: ChatInputProps) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [micButtonScale] = useState(() => new Animated.Value(1));

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(micButtonScale, {
      toValue: 0.8,
      useNativeDriver: Platform.OS !== 'web',
      friction: 8,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(micButtonScale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      friction: 8,
    }).start();
  };

  const handleSendPress = () => {
    if (value.trim() !== '') {
      onSend();
      Keyboard.dismiss();
    }
  };

  return (
    <View
      style={[
        styles.container,
        containerStyle,
      ]}
    >
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: isFocused ? colors.telegramBlue : 'transparent',
          },
        ]}
      >
        <TouchableOpacity
          style={styles.attachButton}
          onPress={onAttachmentPress}
          disabled={disabled}
        >
          <Paperclip
            size={22}
            color={disabled ? colors.placeholder : colors.text}
            strokeWidth={1.5}
          />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          style={[
            styles.input,
            {
              color: colors.text,
            },
          ]}
          multiline
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
        />

        <TouchableOpacity style={styles.emojiButton} disabled={disabled}>
          <Smile
            size={22}
            color={disabled ? colors.placeholder : colors.text}
            strokeWidth={1.5}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.sendButton,
          {
            backgroundColor: colors.telegramBlue,
            opacity: value.trim() === '' ? 1 : 1,
          },
        ]}
        onPress={handleSendPress}
        disabled={value.trim() === '' || disabled}
      >
        {value.trim() === '' ? (
          <Animated.View
            style={[
              styles.micButtonContainer,
              { transform: [{ scale: micButtonScale }] },
            ]}
          >
            <Mic size={22} color="#FFFFFF" strokeWidth={1.5} />
          </Animated.View>
        ) : (
          <Send size={22} color="#FFFFFF" strokeWidth={1.5} />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    paddingHorizontal: 4,
    marginRight: 8,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 4,
    maxHeight: 100,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 