import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Home, Search } from 'lucide-react-native';
import { HamburgerMenu } from '@/components/ui/HamburgerMenu';
import { Drawer } from 'react-native-drawer-layout';
import { DrawerControls } from '@/contexts/DrawerContext';
import { Sidebar } from '@/components/Sidebar';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';



const CustomTabBarIcon = ({ focused, color, size, icon: Icon }: { focused: boolean; color: string; size: number; icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }> }) => {
  return (
    <Icon 
      size={size} 
      color={color} 
      strokeWidth={focused ? 2 : 1.5}
    />
  );
};

const ProfileIcon = ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  
  return (
    <View style={styles.profileIconContainer}>
      {focused ? (
        <LinearGradient
          colors={[colors.storyRingGradientStart, colors.storyRingGradientEnd]}
          style={styles.profileRing}
        >
          <Avatar 
            size={size - 4} 
            username={user?.username || 'user'} 
            style={styles.profileAvatar} 
          />
        </LinearGradient>
      ) : (
        <Avatar 
          size={size} 
          username={user?.username || 'user'} 
          style={styles.profileAvatar} 
        />
      )}
    </View>
  );
};

// This is the main tab navigator
function TabsNavigator() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabBarActiveIcon,
        tabBarInactiveTintColor: colors.tabBarIcon,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
          height: 50,
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          display: 'none',
        },
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        },
        headerTitleStyle: {
          color: colors.text,
          fontSize: 20,
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerLeft: () => <HamburgerMenu />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Lockra',
          tabBarAccessibilityLabel: 'Chats',
          tabBarIcon: ({ focused, color, size }) => (
            <CustomTabBarIcon 
              focused={focused} 
              color={typeof color === 'string' ? color : colors.text}
              size={size} 
              icon={Home} 
            />
          ),
          headerTitle: 'Lockra',
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: 'Communities',
          tabBarAccessibilityLabel: 'Communities',
          tabBarIcon: ({ focused, color, size }) => (
            <CustomTabBarIcon 
              focused={focused} 
              color={typeof color === 'string' ? color : colors.text}
              size={size} 
              icon={Search} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings',
          tabBarIcon: ({ focused, color, size }) => (
            <ProfileIcon focused={focused} color={typeof color === 'string' ? color : colors.text} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

// This is the drawer navigator that wraps the tab navigator
export default function TabLayout() {
  const { colors } = useTheme();
  const { width: screenWidth } = Dimensions.get('window');
  const [open, setOpen] = useState(false);
  
  // Determine drawer width based on device type
  const getDrawerWidth = () => {
    const isTablet = screenWidth > 768;
    const isAndroid = Platform.OS === 'android';
    
    if (isAndroid) {
      // Keep original size for Android
      return '80%';
    } else if (isTablet) {
      // Much smaller for iPad - use fixed width for better control
      return 320;
    } else {
      // Smaller for iPhone
      return '65%';
    }
  };

  return (
    <DrawerControls.Provider value={{ toggle: () => setOpen(value => !value) }}>
      <Drawer open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)}
        renderDrawerContent={() => <Sidebar onClose={() => setOpen(false)} />}
        drawerStyle={{ backgroundColor: colors.card, width: getDrawerWidth() }}
        drawerType="front" overlayStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
        <TabsNavigator />
      </Drawer>
    </DrawerControls.Provider>
  );
}

const styles = StyleSheet.create({
  profileIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
});

