import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, BackHandler, ToastAndroid, StatusBar, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ban } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';

interface BanNotificationProps {
  colors: any;
}

export const BanNotification: React.FC<BanNotificationProps> = ({ colors }) => {
  const [visible, setVisible] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  // Prevent back button on Android when banned
  useEffect(() => {
    if (Platform.OS === 'android' && visible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        ToastAndroid.show('Your account is banned', ToastAndroid.SHORT);
        return true; // Prevent default behavior
      });
      
      return () => backHandler.remove();
    }
  }, [visible]);

  // Check ban status immediately when component mounts
  useEffect(() => {
    if (!user) return;
    
    const checkInitialBanStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('banned, banned_reason')
          .eq('id', user.id)
          .single();
          
        if (error) return;
        
        if (data && data.banned === true) {
          setBanReason(data.banned_reason || 'No reason provided');
          setVisible(true);
          
          // Store in AsyncStorage for Android/iOS
          try {
            await AsyncStorage.setItem('userBanned', 'true');
            await AsyncStorage.setItem('banReason', data.banned_reason || 'No reason provided');
          } catch {
            console.error("Error storing ban in AsyncStorage: [details redacted]");
          }
        }
      } catch {
        console.error("Exception checking initial ban status: [details redacted]");
      }
    };
    
    checkInitialBanStatus();
  }, [user]);

  // Add polling for ban status
  useEffect(() => {
    if (!user) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('banned, banned_reason')
          .eq('id', user.id)
          .single();
          
        if (error) return;
        
        if (data && data.banned === true) {
          setBanReason(data.banned_reason || 'No reason provided');
          setVisible(true);
          
          // Store in AsyncStorage for Android/iOS
          try {
            await AsyncStorage.setItem('userBanned', 'true');
            await AsyncStorage.setItem('banReason', data.banned_reason || 'No reason provided');
          } catch {
            console.error("Error storing ban in AsyncStorage: [details redacted]");
          }
        } else if (data && data.banned === false && visible) {
          setVisible(false);
          
          // Clear from AsyncStorage
          try {
            await AsyncStorage.removeItem('userBanned');
            await AsyncStorage.removeItem('banReason');
          } catch {
            console.error("Error clearing ban from AsyncStorage: [details redacted]");
          }
        }
      } catch {
        console.error("Exception polling ban status: [details redacted]");
      }
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(pollInterval);
  }, [user, visible]);
  
  // Check storage for ban state on mount
  useEffect(() => {
    const checkStoredBanStatus = async () => {
      if (!user) return; // Don't check if no user is logged in
      
      try {
        // Try AsyncStorage first (for native)
        const storedBanState = await AsyncStorage.getItem('userBanned');
        if (storedBanState === 'true') {
          const storedReason = await AsyncStorage.getItem('banReason');
          setBanReason(storedReason || 'No reason provided');
          setVisible(true);
        }
      } catch {
        console.error("Error checking ban state in storage: [details redacted]");
      }
    };
    
    checkStoredBanStatus();
  }, [user]);

  const handleLogout = async () => {
    // Clear from AsyncStorage
    try {
      await AsyncStorage.removeItem('userBanned');
      await AsyncStorage.removeItem('banReason');
    } catch {
      console.error("Error clearing ban from AsyncStorage on logout: [details redacted]");
    }
    
    try {
      await signOut();
    } catch {
      console.error("Error during logout: [details redacted]");
    } finally {
      // Always redirect to home, even if there's an error
      router.replace('/');
    }
  };

  if (!visible || !user) return null;

  return (
    <View style={styles.fullScreenContainer}>
      <StatusBar backgroundColor="rgba(0,0,0,0.8)" barStyle="light-content" />
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ban size={50} color="rgb(255, 59, 48)" />
        </View>
        
        <Text style={styles.title}>
          Account Banned
        </Text>
        
        <Text style={styles.reason}>
          {banReason || 'No reason provided'}
        </Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');
const isTablet = width > 768;

const styles = StyleSheet.create({
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: isTablet ? 400 : width * 0.85,
    backgroundColor: '#1A1A1A',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: 'rgb(255, 59, 48)',
  },
  reason: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    color: '#ffffff',
  },
  button: {
    width: '100%',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#0096FF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BanNotification; 