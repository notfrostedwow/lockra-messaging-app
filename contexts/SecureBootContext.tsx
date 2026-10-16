import React, { createContext, useContext } from 'react';
import { usePathname } from 'expo-router';

// Auth screens that should be excluded from secure boot protection
const AUTH_SCREENS = ['/signin', '/signup', '/forgot-password', '/verify-email', '/auth/callback'];

type SecureBootContextType = {
  isLocked: boolean;
  unlock: () => Promise<boolean>;
  lock: () => void;
  hasSecureBoot: boolean;
  isReady: boolean;
};

const SecureBootContext = createContext<SecureBootContextType | undefined>(undefined);

// Simple provider that doesn't cause iOS issues
function SecureBootProviderComponent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Check if current route is an auth screen that should bypass secure boot
  AUTH_SCREENS.some(screen => pathname === screen || pathname.startsWith(screen + '/'));

  // Always render children for now to fix iOS loading issues
  return (
    <SecureBootContext.Provider value={{
      isLocked: false,
      unlock: async () => true,
      lock: () => {},
      hasSecureBoot: false,
      isReady: true,
    }}>
      {children}
    </SecureBootContext.Provider>
  );
}

export function useSecureBoot() {
  const context = useContext(SecureBootContext);
  if (context === undefined) {
    throw new Error('useSecureBoot must be used within a SecureBootProvider');
  }
  return context;
}

// Export both as named export and default export
export const SecureBootProvider = SecureBootProviderComponent;
export default SecureBootProviderComponent;