import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    primary: string;
    primaryLight: string;
    accent: string;
    error: string;
    success: string;
    warning: string;
    placeholder: string;
    messageBubbleSent: string;
    messageBubbleReceived: string;
    messageBubbleTextSent: string;
    messageBubbleTextReceived: string;
    instagramGradientStart: string;
    instagramGradientEnd: string;
    telegramBlue: string;
    storyRingGradientStart: string;
    storyRingGradientEnd: string;
    tabBarBackground: string;
    tabBarIcon: string;
    tabBarActiveIcon: string;
  };
}

const lightColors = {
  background: '#FFFFFF',
  card: '#FAFAFA',
  text: '#262626',
  textSecondary: '#8E8E8E',
  textTertiary: '#AAAAAA',
  border: '#DBDBDB',
  primary: '#0088CC',
  primaryLight: '#E3F2FD',
  accent: '#833AB4',
  error: '#ED4956',
  success: '#78DE45',
  warning: '#FFDC80',
  placeholder: '#8E8E8E',
  messageBubbleSent: '#4471FD',
  messageBubbleReceived: '#F0F0F0',
  messageBubbleTextSent: '#FFFFFF',
  messageBubbleTextReceived: '#000000',
  instagramGradientStart: '#833AB4',
  instagramGradientEnd: '#FD1D1D',
  telegramBlue: '#0088CC',
  storyRingGradientStart: '#FCAF45',
  storyRingGradientEnd: '#E1306C',
  tabBarBackground: '#FFFFFF',
  tabBarIcon: '#8E8E8E',
  tabBarActiveIcon: '#262626',
};

const darkColors = {
  background: '#121212',
  card: '#1C1C1C',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textTertiary: '#777777',
  border: '#2A2A2A',
  primary: '#4471FD',
  primaryLight: '#1A2C4D',
  accent: '#833AB4',
  error: '#ED4956',
  success: '#78DE45',
  warning: '#FFDC80',
  placeholder: '#8E8E8E',
  messageBubbleSent: '#4471FD',
  messageBubbleReceived: '#212D3B',
  messageBubbleTextSent: '#FFFFFF',
  messageBubbleTextReceived: '#FFFFFF',
  instagramGradientStart: '#833AB4',
  instagramGradientEnd: '#FD1D1D',
  telegramBlue: '#0088CC',
  storyRingGradientStart: '#FCAF45',
  storyRingGradientEnd: '#E1306C',
  tabBarBackground: '#000000',
  tabBarIcon: '#8E8E8E',
  tabBarActiveIcon: '#FFFFFF',
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  colors: lightColors,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const deviceColorScheme = useColorScheme();
  const [selectedTheme, setTheme] = useState<Theme | null>(null);
  const theme = selectedTheme ?? (deviceColorScheme === 'dark' ? 'dark' : 'light');
  const colors = theme === 'dark' ? darkColors : lightColors;

  // Follow the system until the user explicitly chooses a theme.

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
