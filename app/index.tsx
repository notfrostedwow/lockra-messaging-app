import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';

export default function LandingPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  useEffect(() => { if (user) router.replace('/(tabs)'); }, [user, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Logo size="large" />

        <Text style={[styles.title, { color: colors.text }]}>
          Welcome to Lockra
        </Text>

        <Text style={[styles.subtitle, { color: colors.placeholder }]}>
          Private messaging for everyone
        </Text>

        <View style={styles.buttonContainer}>
          <Button
            title="Sign In"
            onPress={() => router.push('/signin')}
            style={styles.button}
          />

          <Button
            title="Sign Up"
            onPress={() => router.push('/signup')}
            variant="outline"
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Link href="/terms" asChild>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Terms of Service
              </Text>
            </TouchableOpacity>
          </Link>

          <Link href="/privacy" asChild>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Privacy Settings
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 32,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    gap: 16,
  },
  footerLink: {
    fontSize: 14,
  },
});
