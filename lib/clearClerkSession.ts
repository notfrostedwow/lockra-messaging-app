import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Force clear all Clerk session data when stuck in "already signed in" state
 */
export const forceClerkSignOut = async () => {
  try {
    console.log("Force clearing all Clerk session data... [details redacted]");
    
    // List of all possible Clerk storage keys
    const clerkKeys = [
      '__clerk_client_jwt',
      '__clerk_session',
      '__clerk_user',
      '__clerk_client',
      '__clerk_session_token',
      '__clerk_refresh_token',
      '__clerk_db_token',
      'clerk-db-jwt',
      'clerk-js-session',
      'clerk-js-user',
      'hushed_session_backup',
      'hushed_last_active_session',
      'hushed_auth_retry_count',
    ];
    
    // Clear from SecureStore
    for (const key of clerkKeys) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Ignore errors for keys that don't exist
      }
    }
    
    // Clear from AsyncStorage (web fallback)
    for (const key of clerkKeys) {
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        // Ignore errors for keys that don't exist
      }
    }
    
    // Clear any keys that start with 'clerk' or '__clerk'
    try {
      const allKeys = await SecureStore.getItemAsync('__all_keys');
      if (allKeys) {
        const parsedKeys = JSON.parse(allKeys);
        for (const key of parsedKeys) {
          if (typeof key === 'string' && (key.includes('clerk') || key.includes('__clerk'))) {
            await SecureStore.deleteItemAsync(key);
          }
        }
      }
    } catch {
      // Ignore if __all_keys doesn't exist
    }
    
    console.log("✅ All Clerk session data cleared successfully [details redacted]");
    return true;
  } catch {
    console.error("❌ Error clearing Clerk session data: [details redacted]");
    return false;
  }
};