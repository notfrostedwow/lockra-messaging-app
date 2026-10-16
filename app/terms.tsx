import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Stack , useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react-native';

export default function TermsOfService() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen 
        options={{
          headerTitle: 'Terms of Service',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <Button
              variant="ghost"
              onPress={() => router.back()}
              icon={<ArrowLeft size={24} color={colors.text} />}
            />
          ),
        }} 
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          Terms of Service for Lockra
        </Text>
        <Text style={[styles.date, { color: colors.text }]}>
          Legacy reference text: 3rd July 2025
        </Text>
        
        <Text style={[styles.intro, { color: colors.text }]}>
          <Text style={styles.bold}>Unpublished portfolio demo.</Text> Use synthetic data only.
          The legacy terms structure below is retained for review, not published service terms.
          DM text encryption has explicit key and recovery limits; encrypted file lockers are not implemented.
        </Text>
        
        <View style={styles.separator} />
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Acceptance of Terms</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            By using Lockra, you agree to be bound by these Terms of Service (&quot;Terms&quot;). 
            These Terms apply to all users and govern your use of the app. We may update 
            these Terms at any time and will notify users by updating the effective date above.
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Eligibility</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            You must be at least 18 years old to use Lockra. By using the app, you confirm 
            that you meet this requirement and are legally able to agree to these Terms.
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Account Responsibility</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            You are responsible for maintaining the security of your account and all activity 
            that occurs under it. Use a strong password and don&apos;t share your account access with others.
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Privacy</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            We respect your privacy. Please see our Privacy Policy for details on how your 
            data is handled. We do not sell your personal data and only collect what&apos;s 
            necessary to run the service.
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>5. User Conduct and Prohibited Use</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            You agree not to use Lockra:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: colors.text }]}>• For any unlawful or illegal purposes.</Text>
            <Text style={[styles.bulletItem, { color: colors.text }]}>• To harass, defraud, impersonate, or abuse others.</Text>
            <Text style={[styles.bulletItem, { color: colors.text }]}>• To transmit spam, malware, or harmful content.</Text>
            <Text style={[styles.bulletItem, { color: colors.text }]}>• To engage in or promote any form of criminal activity or illegal business.</Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Disclaimer of Responsibility for Illegal Use</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            Lockra is a platform tool, not a participant in user communications or activities. 
            <Text style={styles.bold}> The offline demo uses local synthetic data and does not connect calls. Provider privacy terms require separate review before real integration.</Text>
          </Text>
          <Text style={[styles.sectionText, { color: colors.text, marginTop: 8 }]}>
            <Text style={styles.bold}>The owner, developers, and affiliates of Lockra are not liable </Text> 
            for any illegal activity, business, transactions, or communications conducted by 
            users on the platform.
          </Text>
          <Text style={[styles.sectionText, { color: colors.text, marginTop: 8 }]}>
            Users are solely responsible for complying with local laws and regulations. If you 
            use Lockra for any illegal purposes, you do so entirely at your own risk and liability.
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Subscriptions and Payments</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            Some features may require payment. Pricing and subscription terms are disclosed 
            within the app. All payments are final unless otherwise required by law.
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Limitation of Liability</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            To the fullest extent permitted by law, <Text style={styles.bold}>Lockra and its owners shall not be liable for any damages</Text>, 
            including direct, indirect, incidental, or consequential, resulting from your use or 
            inability to use the app.
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>9. Termination</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            We may suspend or terminate your account for violating these Terms. You can delete 
            your account at any time. Termination may result in permanent loss of access to data.
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>10. Indemnity</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            You agree to indemnify and hold harmless Lockra, its owners, affiliates, and employees 
            from any claims or damages arising from your use of the app or violation of these Terms.
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>11. Governing Law</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            These Terms are governed by the laws of the United Kingdom. Any disputes will be 
            resolved in the courts of United Kingdom.
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>12. Contact Us</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            If you have any questions, contact us at:
          </Text>
          <Text style={[styles.contactItem, { color: colors.primary }]}>
            Email: support@example.invalid
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  intro: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.3)',
    marginVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  bold: {
    fontWeight: '700',
  },
  bulletList: {
    marginTop: 8,
    marginLeft: 8,
  },
  bulletItem: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
  },
  contactItem: {
    fontSize: 16,
    marginTop: 8,
    marginLeft: 8,
    fontWeight: '500',
  },
}); 
