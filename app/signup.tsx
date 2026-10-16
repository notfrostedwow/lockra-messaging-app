import { DemoPanel } from '@/components/DemoPanel';
import { isDemo } from '@/lib/runtime';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSignUp } from '@/lib/auth';
import { useTheme } from '@/contexts/ThemeContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { validateEmail, validateUsername, validatePassword } from '@/lib/utils';
import { Lock, Mail, User } from 'lucide-react-native';
// Removed old connector import - user sync now handled in AuthContext

export default function SignUp() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const { colors } = useTheme();
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    if (!email) {
      setError('Email is required');
      return false;
    } 
    if (!validateEmail(email)) {
      setError('Please enter a valid email');
      return false;
    }
    
    if (!username) {
      setError('Username is required');
      return false;
    } 
    if (!validateUsername(username)) {
      setError('Username must be 3-20 characters, letters, numbers, and underscores only');
      return false;
    }
    
    if (!password) {
      setError('Password is required');
      return false;
    } 
    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    if (!agreedToTerms) {
      setError('You must agree to the terms of service');
      return false;
    }
    
    return true;
  };

  const handleSignUp = async () => {
    if (isDemo) { setError('Use a synthetic identity above. Real credentials are never submitted.'); return; }
    if (!isLoaded || !validateForm()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Start the sign-up process with Clerk - include username with email and password
      await signUp.create({
        emailAddress: email,
        password,
        username, // Include username in the initial creation
      });
      
      console.log("Sign-up created with username: [details redacted]");
      
      // Send the verification email
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });
      
      // Set pendingVerification to true to show the verification form
      setPendingVerification(true);
    } catch (err: any) {
      console.error("Sign up error: [details redacted]");
      setError(err.errors?.[0]?.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!isLoaded || !verificationCode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Attempt to verify the email address
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      
      if (result.status === 'complete') {
        console.log("Verification complete. User data: [details redacted]");
        
        // Set the active session in Clerk
        await setActive({ session: result.createdSessionId });
        
        // User sync with Supabase is now handled automatically in AuthContext
        
        // Navigate to the home screen
        router.replace('/(tabs)');
      } else {
        console.log("Verification status: [details redacted]");
        setError('Unable to verify email. Please try again.');
      }
    } catch (err: any) {
      console.error("Verification error: [details redacted]");
      setError(err.errors?.[0]?.message || 'An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  // Email verification screen
  if (pendingVerification) {
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
              <Text style={[styles.title, { color: colors.text }]}>Verify Your Email</Text>
              <Text style={[styles.subtitle, { color: colors.placeholder }]}>
                We&apos;ve sent a verification code to {email}
              </Text>
            </View>

            <View style={styles.form}>
            <DemoPanel />
              <View style={styles.inputContainer}>
                <Input
                  placeholder="Verification Code"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />
              </View>

              {error && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {error}
                </Text>
              )}

              <Button
                title="Verify Email"
                onPress={handleVerification}
                loading={loading}
                fullWidth
                style={{ marginTop: 16 }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Sign up screen
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
            <Text style={[styles.title, { color: colors.text }]}>Sign Up</Text>
            <Text style={[styles.subtitle, { color: colors.placeholder }]}>
              Create an account to get started
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Input
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={20} color={colors.placeholder} />}
              />
            </View>

            <View style={styles.inputContainer}>
              <Input
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                leftIcon={<User size={20} color={colors.placeholder} />}
              />
            </View>

            <View style={styles.inputContainer}>
              <Input
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                leftIcon={<Lock size={20} color={colors.placeholder} />}
              />
            </View>

            <View style={styles.inputContainer}>
              <Input
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                leftIcon={<Lock size={20} color={colors.placeholder} />}
              />
            </View>

            <View style={styles.termsContainer}>
              <Checkbox
                checked={agreedToTerms}
                onToggle={() => setAgreedToTerms(!agreedToTerms)}
                color={colors.primary}
                label={
                  <View style={styles.termsLabelContainer}>
                    <Text style={{ color: colors.text }}>I agree to the </Text>
                    <Link href="/terms" asChild>
                      <TouchableOpacity>
                        <Text style={{ color: colors.primary, fontWeight: '500' }}>
                          Terms of Service
                        </Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                }
              />
            </View>

            {error && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            )}

            <Button
              title="Sign Up"
              onPress={handleSignUp}
              loading={loading}
              fullWidth
              style={{ marginTop: 16 }}
            />

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.placeholder }]}>
                Already have an account?{' '}
              </Text>
              <Link href="/signin" asChild>
                <TouchableOpacity>
                  <Text style={[styles.link, { color: colors.primary }]}>
                    Sign In
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
  termsContainer: {
    marginBottom: 16,
  },
  termsLabelContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 8,
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