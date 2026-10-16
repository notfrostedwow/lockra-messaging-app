import * as SecureStore from 'expo-secure-store';
type TokenCache = { getToken: (key: string) => Promise<string | null>; saveToken: (key: string, value: string) => Promise<void>; clearToken: (key: string) => Promise<void> };

// Keep track of tokens in memory as a backup
const memoryCache: Record<string, string> = {};

// Special keys for storing session data
const SESSION_BACKUP_KEY = 'hushed_session_backup';
const USER_SESSION_KEY = 'hushed_user_session';
const LAST_AUTH_KEY = 'hushed_last_auth';

export const tokenCache: TokenCache = {
  async getToken(key) {
    try {
      // Try to get from SecureStore first
      const storedValue = await SecureStore.getItemAsync(key);
      
      if (storedValue) {
        console.log("Operation diagnostic [details redacted]");
        // Update memory cache as backup
        memoryCache[key] = storedValue;
        
        // For session tokens, also store in special backup keys
        if (key.includes('session') || key.includes('jwt') || key.includes('__client')) {
          await SecureStore.setItemAsync(SESSION_BACKUP_KEY, storedValue).catch(() => {});
          await SecureStore.setItemAsync(LAST_AUTH_KEY, Date.now().toString()).catch(() => {});
        }
        
        return storedValue;
      }
      
      // Fall back to memory cache if available
      if (memoryCache[key]) {
        console.log("Operation diagnostic [details redacted]");
        // Try to save back to SecureStore for future use
        await SecureStore.setItemAsync(key, memoryCache[key]).catch(e => {
          console.warn("Failed to save memory token to SecureStore: [details redacted]");
        });
        return memoryCache[key];
      }
      
      // For session tokens, try the backup key as last resort
      if ((key.includes('session') || key.includes('jwt') || key.includes('__client'))) {
        const backupToken = await SecureStore.getItemAsync(SESSION_BACKUP_KEY);
        if (backupToken) {
          console.log("Operation diagnostic [details redacted]");
          // Save it back to the proper key
          await SecureStore.setItemAsync(key, backupToken).catch(() => {});
          memoryCache[key] = backupToken;
          return backupToken;
        }
      }
      
      console.log("Operation diagnostic [details redacted]");
      return null;
    } catch {
      console.error("Error getting token from secure store: [details redacted]");
      // Fall back to memory cache if SecureStore fails
      return memoryCache[key] || null;
    }
  },
  
  async saveToken(key, value) {
    try {
      console.log("Operation diagnostic [details redacted]");
      
      // Save to SecureStore
      await SecureStore.setItemAsync(key, value);
      
      // Also save to memory cache as backup
      memoryCache[key] = value;
      
      // For session tokens, also store in special backup keys
      if (key.includes('session') || key.includes('jwt') || key.includes('__client')) {
        await SecureStore.setItemAsync(SESSION_BACKUP_KEY, value).catch(() => {});
        await SecureStore.setItemAsync(LAST_AUTH_KEY, Date.now().toString()).catch(() => {});
        console.log("Operation diagnostic [details redacted]");
      }
      
      console.log("Operation diagnostic [details redacted]");
    } catch {
      console.error("Error saving token to secure store: [details redacted]");
      // At least keep in memory cache
      memoryCache[key] = value;
    }
  },
  
  async clearToken(key) {
    try {
      console.log("Operation diagnostic [details redacted]");
      
      // Clear from SecureStore
      await SecureStore.deleteItemAsync(key);
      
      // Also clear from memory cache
      delete memoryCache[key];
      
      // If clearing session tokens, also clear backup keys
      if (key.includes('session') || key.includes('jwt') || key.includes('__client')) {
        await SecureStore.deleteItemAsync(SESSION_BACKUP_KEY).catch(() => {});
        await SecureStore.deleteItemAsync(USER_SESSION_KEY).catch(() => {});
        await SecureStore.deleteItemAsync(LAST_AUTH_KEY).catch(() => {});
        console.log("Operation diagnostic [details redacted]");
      }
      
      console.log("Operation diagnostic [details redacted]");
    } catch {
      console.error("Error clearing token from secure store: [details redacted]");
      // At least clear from memory cache
      delete memoryCache[key];
    }
  },
};

// Helper functions for session management
export const sessionHelpers = {
  async saveUserSession(userData: any) {
    try {
      await SecureStore.setItemAsync(USER_SESSION_KEY, JSON.stringify(userData));
      await SecureStore.setItemAsync(LAST_AUTH_KEY, Date.now().toString());
      console.log("💾 User session saved to cache [details redacted]");
    } catch {
      console.error("Error saving user session: [details redacted]");
    }
  },

  async getUserSession() {
    try {
      const userData = await SecureStore.getItemAsync(USER_SESSION_KEY);
      const lastAuth = await SecureStore.getItemAsync(LAST_AUTH_KEY);
      
      if (userData && lastAuth) {
        const lastAuthTime = parseInt(lastAuth);
        const now = Date.now();
        const daysSinceAuth = (now - lastAuthTime) / (1000 * 60 * 60 * 24);
        
        // Consider session valid for 30 days
        if (daysSinceAuth < 30) {
          console.log("✅ Valid user session found in cache [details redacted]");
          return JSON.parse(userData);
        } else {
          console.log("⏰ User session expired, clearing cache [details redacted]");
          await this.clearUserSession();
        }
      }
      
      return null;
    } catch {
      console.error("Error getting user session: [details redacted]");
      return null;
    }
  },

  async clearUserSession() {
    try {
      await SecureStore.deleteItemAsync(USER_SESSION_KEY);
      await SecureStore.deleteItemAsync(LAST_AUTH_KEY);
      console.log("🧹 User session cleared from cache [details redacted]");
    } catch {
      console.error("Error clearing user session: [details redacted]");
    }
  },

  async isSessionValid() {
    try {
      const lastAuth = await SecureStore.getItemAsync(LAST_AUTH_KEY);
      if (!lastAuth) return false;
      
      const lastAuthTime = parseInt(lastAuth);
      const now = Date.now();
      const daysSinceAuth = (now - lastAuthTime) / (1000 * 60 * 60 * 24);
      
      return daysSinceAuth < 30;
    } catch {
      console.error("Error checking session validity: [details redacted]");
      return false;
    }
  }
}; 