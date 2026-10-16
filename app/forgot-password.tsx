import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link, Stack, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validateEmail } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Mail } from 'lucide-react-native';

export default function ForgotPassword() {
  const router = useRouter();
  const { colors } = useTheme();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://example.invalid',
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Forgot Password',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            color: colors.text,
          },
          headerShadowVisible: false,
        }}
      />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { backgroundColor: colors.background },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {success ? (
            <View style={styles.successContainer}>
              <Text style={[styles.successTitle, { color: colors.text }]}>
                Check Your Email
              </Text>
              <Text style={[styles.successMessage, { color: colors.placeholder }]}>
                We&apos;ve sent a password reset link to {email}. Please check your email to reset your password.
              </Text>
              <Button
                title="Back to Sign In"
                onPress={() => router.replace('/signin')}
                style={{ marginTop: 24 }}
              />
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Forgot Password
                </Text>
                <Text style={[styles.subtitle, { color: colors.placeholder }]}>
                  Enter your email address and we&apos;ll send you a link to reset your password
                </Text>
              </View>

              {error ? (
                <View style={[styles.errorContainer, { backgroundColor: 'rgba(255, 82, 82, 0.1)' }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <View style={styles.form}>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}>
                    <Mail size={20} color={colors.placeholder} />
                  </View>
                  <Input
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    containerStyle={styles.inputContainer}
                  />
                </View>

                <Button
                  title="Send Reset Link"
                  onPress={handleResetPassword}
                  loading={loading}
                  fullWidth
                />

                <View style={styles.footer}>
                  <Text style={[styles.footerText, { color: colors.placeholder }]}>
                    Remember your password?{' '}
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
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    marginRight: 8,
    marginTop: -13,
  },
  inputContainer: {
    flex: 1,
  },
  errorContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 16,
  },
  link: {
    fontSize: 16,
    fontWeight: '500',
  },
  successContainer: {
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
});