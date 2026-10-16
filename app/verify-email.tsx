import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';

function VerifyEmail() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useLocalSearchParams();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        console.log("Verification params: [details redacted]");

        // Check if we have the necessary parameters
        if (!params.token) {
          setError('Invalid verification link: Missing token');
          setLoading(false);
          return;
        }

        // Extract token hash from URL if it contains fragments
        let token = params.token as string;
        if (token.includes('#')) {
          const hashParams = new URLSearchParams(token.split('#')[1]);
          token = hashParams.get('access_token') || token;
        }

        console.log("Processing token: [details redacted]");

        // Try verification with the token
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email',
        });

        if (verifyError) {
          console.error("Verification error: [details redacted]");
          setError(verifyError.message);
        } else {
          console.log("Email verified successfully: [details redacted]");
          setVerified(true);
          
          // Auto-redirect after a delay
          setTimeout(() => {
            router.replace('/signin');
          }, 3000);
        }
      } catch (err) {
        console.error("Unexpected error: [details redacted]");
        const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [params]);

  // Helper function to get secondary text color
  const getSecondaryTextColor = () => {
    return colors.text + '80'; // Add 50% opacity to main text color
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Verifying your email...
        </Text>
        <Text style={[styles.subtitle, { color: getSecondaryTextColor() }]}>
          Please wait a moment
        </Text>
      </View>
    );
  }

  if (verified) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Email Verified!
          </Text>
          <Text style={[styles.subtitle, { color: getSecondaryTextColor() }]}>
            Your email has been successfully verified.
          </Text>
          <Text style={[styles.autoRedirect, { color: getSecondaryTextColor() }]}>
            Redirecting to sign in in 3 seconds...
          </Text>
        </View>

        <Button
          title="Go to Sign In"
          onPress={() => router.replace('/signin')}
          style={styles.button}
        />
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, styles.centered]}
    >
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={[styles.title, { color: colors.error || '#FF5252' }]}>
          Verification Failed
        </Text>
        <Text style={[styles.errorText, { color: colors.error || '#FF5252' }]}>
          {error || 'Unable to verify your email. The link may be expired or invalid.'}
        </Text>
      </View>

      <Button
        title="Back to Sign In"
        onPress={() => router.replace('/signin')}
        style={styles.button}
      />
      
      <Button
        title="Request New Verification"
        onPress={() => router.push('/signup')}
        style={{ ...styles.button, ...styles.secondaryButton }}
        variant="outline"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: {
    padding: 24,
    minHeight: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  autoRedirect: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 16,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    width: '100%',
    marginBottom: 12,
  },
  secondaryButton: {
    marginTop: 8,
  },
});

export default VerifyEmail;