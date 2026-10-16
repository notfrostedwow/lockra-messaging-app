import { Alert } from '@/lib/alert';
import { useStableEvent } from '@/hooks/useStableEvent';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase, verifyEmailToken } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Logo } from '@/components/ui/Logo';


export default function AuthCallback() {
  const router = useRouter();
  const { colors } = useTheme();

  // Get all possible auth parameters from the deep link
  const params = useLocalSearchParams<{
    code?: string;
    type?: string;
    token?: string;
    error?: string;
    error_description?: string;
    error_code?: string;
  }>();

  const { code, type, token, error: urlError, error_description, error_code } = params;

  const [error, setError] = useState<string | null>(urlError || null);
  const [, setProcessingAuth] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [, setFullUrl] = useState<string | null>(null);

  // Handle server errors specifically
  

  // Extract token from URL if present
  

  const processToken = useStableEvent(async (tokenValue: string) => {
    try {
      console.log("Processing token directly: [details redacted]");
      
      // Try to get session first to see if we're already authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        console.log("Already have a valid session, redirecting to home [details redacted]");
        router.replace('/(tabs)');
        return true;
      }
      
      // Direct verification with Supabase
      const { error: verifyError } = await verifyEmailToken(tokenValue);
      
      console.log("Direct verification result: [details redacted]");
      
      if (verifyError) {
        // If we get an error about the token being invalid or expired,
        // try signing in directly
        if (verifyError.message.includes('token is invalid or has expired')) {
          setError('Verification link expired. Please try signing in.');
          setTimeout(() => {
            router.replace('/signin');
          }, 3000);
          return false;
        }
        
        setError(`Verification error: ${verifyError.message}`);
        return false;
      }
      
      // Check for session after verification
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("Session found after verification [details redacted]");
        router.replace('/(tabs)');
      } else {
        console.log("No session after verification, redirecting to signin [details redacted]");
        router.replace('/signin');
      }
      
      return true;
    } catch (err) {
      console.error("Token processing error: [details redacted]");
      setError(`Token processing error: ${(err as Error).message}`);
      return false;
    }
  });

  

  // Optional debug helper
  const runDebug = async () => { setDebugInfo('Sensitive authentication diagnostics are disabled.');
  };

  useEffect(() => {
    if (urlError === 'server_error' && error_code === 'unexpected_failure') {
      console.log("Detected server error during verification, attempting manual verification [details redacted]");
      
      // Try to navigate to sign in as a fallback
      setTimeout(() => {
        Alert.alert(
          "Verification Issue",
          "There was a problem verifying your email. Please try signing in - if your email was verified, you'll be able to access your account.",
          [
            { text: "Go to Sign In", onPress: () => router.replace('/signin') }
          ]
        );
      }, 2000);
    }
  }, [urlError, error_code, router]);

useEffect(() => {
    const getUrlToken = async () => {
      try {
        const url = await Linking.getInitialURL();
        console.log("Initial URL: [details redacted]");
        setFullUrl(url ? 'Sensitive callback URL withheld' : null);
        
        if (url) {
          // Check if URL contains verify endpoint
          if (url.includes('/auth/v1/verify') || url.includes('/verify')) {
            // Extract token directly from the URL
            const tokenMatch = url.match(/token=([^&]+)/);
            if (tokenMatch && tokenMatch[1]) {
              const extractedToken = tokenMatch[1];
              console.log("Extracted token from URL: [details redacted]");
              
              // Process the token directly
              await processToken(extractedToken);
            }
          }
        }
      } catch {
        console.error("Error getting initial URL: [details redacted]");
      }
    };

    getUrlToken();
  }, [processToken]);

useEffect(() => {
    const processAuth = async () => {
      try {
        setProcessingAuth(true);
        if (urlError) {
          setError(`${urlError}: ${error_description || 'Unknown error'}`);
          return;
        }

        // Log parameters for debugging
        console.log("Auth callback params: [details redacted]");

        // Handle PKCE token from email verification
        if (token) {
          console.log("Processing token from params: [details redacted]");
          await processToken(token);
          return;
        }
        // Handle code exchange (standard PKCE flow)
        else if (code) {
          console.log("Processing code exchange [details redacted]");
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code as string);

          if (exchangeError) {
            console.error("Code‑exchange error: [details redacted]");
            setError(exchangeError.message);
            return;
          }
          
          // Check whether the session is now present
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            console.error("Error getting session: [details redacted]");
            setError(sessionError.message);
            return;
          }

          // Route accordingly
          if (session) {
            console.log("Session found, redirecting to home [details redacted]");
            router.replace('/(tabs)');
          } else {
            console.log("No session found, redirecting to signin [details redacted]");
            router.replace('/signin');
          }
        }
      } catch (err) {
        console.error("Unexpected auth‑callback error: [details redacted]");
        setError('Unexpected error: ' + (err as Error).message);
      } finally {
        setProcessingAuth(false);
      }
    };

    if (code || token) {
      processAuth();
    } else {
      // If no code or token in params, we're waiting for URL extraction
      setTimeout(() => {
        setProcessingAuth(false);
      }, 5000);
    }
  }, [code, token, type, urlError, error_description, router, processToken]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Logo size="large" />
        <ActivityIndicator
          size="large"
          color={colors.primary || '#3A76F0'}
          style={styles.loadingSpinner}
        />
        <Text style={[styles.text, { color: colors.text }]}>
          {error ? `Error: ${error}` : 'Completing sign in…'}
        </Text>

        <TouchableOpacity
          style={[styles.debugButton, { backgroundColor: colors.card }]}
          onPress={runDebug}
        >
          <Text style={[styles.debugButtonText, { color: colors.primary }]}>
            Debug authentication
          </Text>
        </TouchableOpacity>

        {debugInfo && (
          <View style={[styles.debugInfo, { backgroundColor: colors.card }]}>
            <Text style={[styles.debugInfoText, { color: colors.text }]}>
              {debugInfo}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  loadingSpinner: {
    marginTop: 20,
    marginBottom: 16,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  debugButton: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
  },
  debugButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  debugInfo: {
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
    width: '100%',
  },
  debugInfoText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
