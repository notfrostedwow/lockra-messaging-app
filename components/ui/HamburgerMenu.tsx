import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Menu } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import { useAppDrawer } from '@/contexts/DrawerContext';

interface HamburgerMenuProps {
  size?: number;
}

export const HamburgerMenu = ({ size = 24 }: HamburgerMenuProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const drawer = useAppDrawer();

  const toggleDrawer = () => {
    if (drawer) drawer.toggle();
    else navigation.dispatch(DrawerActions.toggleDrawer());
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      style={({ pressed }) => [
        styles.container,
        pressed && { opacity: 0.7 }
      ]}
      onPress={toggleDrawer}
    >
      <Menu size={size} color={colors.text} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    marginLeft: 8,
  },
}); 
