import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, MessageSquare, Shield, Lock, Bell, Clock, Video, Image as ImageIcon, File, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

export default function FeaturesScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const features: FeatureItem[] = [
    {
      id: '1',
      title: 'Encrypted DM Text',
      description: 'New DM text uses device-held keys after explicit fingerprint comparison. Legacy plaintext is labelled. Independent security review is still required.',
      icon: <MessageSquare size={24} color={colors.primary} />,
    },
    {
      id: '2',
      title: 'Privacy Controls',
      description: 'Control who can see your profile and contact you.',
      icon: <Shield size={24} color={colors.primary} />,
    },
    {
      id: '3',
      title: 'Voice & Video Calls',
      description: 'LiveKit client and authenticated calling API implemented with mock tests. Disabled in demo; real two-client calls and native builds remain unverified.',
      icon: <Video size={24} color={colors.primary} />,
    },
    {
      id: '4',
      title: 'Self-Destructing Messages',
      description: "Not implemented: automatic message expiry.",
      icon: <Clock size={24} color={colors.primary} />,
    },
    {
      id: '5',
      title: 'Media Sharing',
      description: 'Attachment source is preserved. Cloud uploads are disabled in offline demo.',
      icon: <ImageIcon size={24} color={colors.primary} />,
    },
    {
      id: '6',
      title: 'Notification Controls',
      description: 'Customize how and when you receive notifications.',
      icon: <Bell size={24} color={colors.primary} />,
    },
    {
      id: '7',
      title: 'Group Chats',
      description: 'Community messages and membership; no group encryption claim.',
      icon: <MessageSquare size={24} color={colors.primary} />,
      comingSoon: true,
    },
    {
      id: '8',
      title: 'Document Sharing',
      description: 'Document encryption is not implemented.',
      icon: <File size={24} color={colors.primary} />,
      comingSoon: true,
    },
  ];

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen
        options={{
          title: 'App Features',
          headerStyle: {
            backgroundColor: '#1A1D25',
          },
          headerTitleStyle: {
            color: '#FFFFFF',
          },
          headerLeft: () => (
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => router.back()}
            >
              <ChevronLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: '#111318' }]}>
        <LinearGradient
          colors={[`${colors.primary}30`, '#111318']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <Lock size={60} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>
              Lockra Features
            </Text>
            <Text style={[styles.headerSubtitle, { color: 'rgba(255, 255, 255, 0.7)' }]}>
              Explore the preserved application and its current verification status
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.featuresContainer}>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[styles.featureCard, { backgroundColor: '#1A1D25' }]}
              onPress={() => {
                if (!feature.comingSoon) {
                  // In a real app, this would navigate to a feature detail page
                  alert(`Feature: ${feature.title}`);
                }
              }}
              disabled={feature.comingSoon}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}>
                {feature.icon}
              </View>
              <View style={styles.featureContent}>
                <View style={styles.featureTitleContainer}>
                  <Text style={[styles.featureTitle, { color: '#FFFFFF' }]}>
                    {feature.title}
                  </Text>
                  {feature.comingSoon && (
                    <View style={[styles.comingSoonBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.comingSoonText}>Coming Soon</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.featureDescription, { color: '#FFFFFF' }]}>
                  {feature.description}
                </Text>
              </View>
              {!feature.comingSoon && (
                <ChevronRight size={20} color="rgba(255, 255, 255, 0.5)" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.securityInfoCard, { backgroundColor: '#1A1D25' }]}>
          <Text style={[styles.securityTitle, { color: '#FFFFFF' }]}>
            Your Security is our Priority
          </Text>
          <Text style={[styles.securityDescription, { color: '#FFFFFF' }]}>
            This restoration is for local evaluation. Synthetic identities are not real authentication.
            Backend authorization, device behavior and production security need independent review.
          </Text>
          <TouchableOpacity 
            style={[styles.learnMoreButton, { borderColor: colors.primary }]}
            onPress={() => router.push('/security')}
          >
            <Text style={[styles.learnMoreText, { color: colors.primary }]}>
              Learn More About Security
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerGradient: {
    paddingTop: 40,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  featuresContainer: {
    padding: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  comingSoonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  securityInfoCard: {
    margin: 16,
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  securityTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  securityDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  learnMoreButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  learnMoreText: {
    fontWeight: '500',
  },
}); 
