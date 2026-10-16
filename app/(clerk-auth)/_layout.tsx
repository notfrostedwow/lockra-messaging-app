import React from 'react';
import { Stack , Redirect } from 'expo-router';
import { useAuth as useClerkAuth } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function ClerkAuthLayout() {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  // Show loading screen while session is being loaded
  if (loading || !isLoaded) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: colors.background
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  // If the user is signed in, redirect to the home page
  if (isLoaded && isSignedIn && user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
} 