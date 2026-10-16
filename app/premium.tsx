import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, Crown, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';


export default function PremiumScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const isPremium = Boolean(
    (user as any)?.is_premium ||
    (user as any)?.plan === 'premium' ||
    (user as any)?.plan === 'lifetime' ||
    ((user as any)?.premium_until && new Date((user as any)?.premium_until) > new Date()) ||
    (user as any)?.subscription_status === 'active'
  );

  // Optionally fetch subscription details here if you want to show them
  // const sub = await billingService.getActiveSubscription(user?.id)

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Premium',
          headerStyle: { backgroundColor: '#111318' },
          headerTitleStyle: { color: '#fff' },
          headerLeft: () => (
            <TouchableOpacity style={{ padding: 8 }} onPress={() => router.back()}>
              <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>
          )
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: '#111318' }]}
        contentContainerStyle={{ padding: 16 }}
      >
        <LinearGradient colors={[`${colors.primary}30`, '#111318']} style={styles.hero}>
          <View style={styles.heroBadge}>
            <Crown size={22} color="#1F2937" />
          </View>
          <Text style={styles.heroTitle}>{isPremium ? 'You are Premium' : 'Go Premium'}</Text>
          <Text style={styles.heroSubtitle}>
            Unlock enhanced privacy, ad‑free experience, and priority support.
          </Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Benefits</Text>
          {[
            'Ad‑free experience',
            'Full‑quality media',
            'Priority support',
            'Early access features',
          ].map((b) => (
            <View key={b} style={styles.benefitRow}>
              <CheckCircle2 size={18} color={colors.primary} />
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: isPremium ? 'rgba(255,255,255,0.1)' : colors.primary, borderColor: isPremium ? 'rgba(255,255,255,0.2)' : colors.primary }]}
          disabled={isPremium}
          onPress={() => {/* hook up purchase flow */}}
        >
          <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>
            {isPremium ? 'Premium Active' : 'Upgrade Now'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.backLink]} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFD54F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1A1D25',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },
  ctaButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
  },
  backLink: {
    alignItems: 'center',
    marginTop: 12,
  },
  backLinkText: {
    color: 'rgba(255,255,255,0.8)',
  },
});


