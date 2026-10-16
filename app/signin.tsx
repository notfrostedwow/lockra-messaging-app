import { DemoPanel } from '@/components/DemoPanel';
import { isDemo } from '@/lib/runtime';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSignIn } from '@/lib/auth';
import { useTheme } from '@/contexts/ThemeContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validateEmail } from '@/lib/utils';
import { Mail, Lock } from 'lucide-react-native';
// Removed old connector import - user sync now handled in AuthContext
// Removed old connector import - user sync now handled in AuthContext
import { useAuth } from '@/contexts/AuthContext';


// List of Clerk token keys to clear on sign in


export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { refreshProfile } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authComplete, setAuthComplete] = useState(false);

  // Effect to handle navigation after successful authentication
  useEffect(() => {
    if (authComplete) {
      // Force navigation after a short delay if it hasn't happened already
      const navigationTimer = setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);

      return () => clearTimeout(navigationTimer);
    }
  }, [authComplete, router]);

  const handleSignIn = async () => {
    if (isDemo) { setError('Use a synthetic identity above. Real credentials are never submitted.'); return; }
    if (!isLoaded) return;

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Attempt to sign in with Clerk
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        // Set the active session
        await setActive({ session: result.createdSessionId });

        // User sync is now handled automatically in AuthContext

        // Refresh the auth context to get the user profile
        await refreshProfile();

        // Mark authentication as complete and navigate
        setAuthComplete(true);
        router.replace('/(tabs)');
      } else {
        console.log("Sign in status: [details redacted]");
        setError('Unable to sign in. Please check your credentials and try again.');
        setLoading(false);
      }
    } catch (clerkError: any) {
      console.error("Clerk sign in error: [details redacted]");

      // Handle "Session already exists" error
      if (clerkError.errors &&
        clerkError.errors[0] &&
        clerkError.errors[0].message &&
        clerkError.errors[0].message.includes('Session already exists')) {

        console.log("Handling \"Session already exists\" error [details redacted]");

        try {
          // Instead of clearing tokens, try to use existing session
          console.log("Attempting to use existing session [details redacted]");

          // Refresh the auth context to get the user profile
          await refreshProfile();

          // Mark authentication as complete and navigate
          setAuthComplete(true);
          router.replace('/(tabs)');
          return;
        } catch {
          console.error("Error during retry with existing session: [details redacted]");
          setError('Unable to sign in. Please try again later.');
          setLoading(false);
        }
      } else {
        setError(clerkError.errors?.[0]?.message || 'An error occurred during sign in');
        setLoading(false);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Sign In</Text>
            <Text style={[styles.subtitle, { color: colors.placeholder }]}>
              Welcome back! Sign in to continue
            </Text>
          </View>

          <View style={styles.form}>
            <DemoPanel />
            <View style={styles.inputContainer}>
              <View style={styles.inputWithIconContainer}>
                <View style={styles.iconContainer}>
                  <Mail size={20} color={colors.placeholder} />
                </View>
                <Input
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={error && email.length === 0 ? 'Email is required' : ''}
                  containerStyle={styles.inputWithIcon}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWithIconContainer}>
                <View style={styles.iconContainer}>
                  <Lock size={20} color={colors.placeholder} />
                </View>
                <Input
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  error={error && password.length === 0 ? 'Password is required' : ''}
                  containerStyle={styles.inputWithIcon}
                />
              </View>
            </View>

            {error && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            )}

            <Button
              title="Sign In"
              onPress={handleSignIn}
              loading={loading}
              fullWidth
              style={styles.signInButton}
            />

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.placeholder }]}>
                Don&apos;t have an account?{' '}
              </Text>
              <Link href="/signup" asChild>
                <TouchableOpacity>
                  <Text style={[styles.link, { color: colors.primary }]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWithIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 24,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inputWithIcon: {
    flex: 1,
    marginBottom: 0,
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  signInButton: {
    width: '100%',
    marginTop: 8, // Reduced from 16 to 8 to be closer to the password field
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 