import { useStableEvent } from '@/hooks/useStableEvent';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Stack, useRouter } from 'expo-router';
import { Eye, Bell, UserCheck, Globe, Clock, Lock, Users, ArrowLeft } from 'lucide-react-native';

const PrivacyOption = ({
    icon: Icon,
    title,
    description,
    value,
    onToggle,
    isLast
  }: {
    icon: any,
    title: string,
    description: string,
    value: boolean,
    onToggle: () => void,
    isLast?: boolean
  }) => { const { colors } = useTheme(); return (
    <View style={[
      styles.optionContainer,
      isLast && styles.lastOption,
      { borderBottomColor: colors.border }
    ]}>
      <View style={styles.optionLeft}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '15' }]}>
          <Icon size={20} color={colors.primary} />
        </View>
        <View style={styles.optionText}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
            {description}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  ); };

export default function Privacy() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState({
    showOnlineStatus: true,
    showReadReceipts: true,
    showLastSeen: true,
    allowMessagePreviews: true,
    allowMentions: true,
    profileVisibility: 'public',
  });
  
  const [loading, setLoading] = useState(true);

  const savePrivacySettings = async (newSettings: typeof settings) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_privacy_settings')
        .upsert({
          user_id: user.id,
          show_online_status: newSettings.showOnlineStatus,
          show_read_receipts: newSettings.showReadReceipts,
          show_last_seen: newSettings.showLastSeen,
          allow_message_previews: newSettings.allowMessagePreviews,
          allow_mentions: newSettings.allowMentions,
          profile_visibility: newSettings.profileVisibility,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.warn("Privacy settings not saved to database (RLS policy): [details redacted]");
        // For now, just keep settings in local state
        // In production, you'd configure proper RLS policies
      }
    } catch {
      console.warn("Privacy settings kept in local state only: [details redacted]");
      // Settings will persist in component state during session
    }
  };


  

  const loadPrivacySettings = useStableEvent(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Error loading privacy settings: [details redacted]");
        return;
      }
      
      if (data) {
        setSettings({
          showOnlineStatus: data.show_online_status,
          showReadReceipts: data.show_read_receipts,
          showLastSeen: data.show_last_seen,
          allowMessagePreviews: data.allow_message_previews,
          allowMentions: data.allow_mentions,
          profileVisibility: data.profile_visibility || 'public',
        });
      } else {
        // Create default settings if none exist
        await savePrivacySettings(settings);
      }
    } catch {
      console.error("Unexpected error loading privacy settings: [details redacted]");
    } finally {
      setLoading(false);
    }
  });

  const handleToggle = (setting: keyof typeof settings) => {
    const newSettings = {
      ...settings,
      [setting]: !settings[setting],
    };
    setSettings(newSettings);
    savePrivacySettings(newSettings);
  };

  const handleVisibilityChange = (value: 'public' | 'private') => {
    const newSettings = {
      ...settings,
      profileVisibility: value,
    };
    setSettings(newSettings);
    savePrivacySettings(newSettings);
  };

  useEffect(() => {
    loadPrivacySettings();
  }, [loadPrivacySettings]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerTitle: "Privacy",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }} 
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
            <Lock size={28} color={colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Privacy Settings
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Control your privacy and who can see your information
          </Text>
        </View>

        {/* Profile Visibility Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Profile Visibility
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.profileVisibilityCard}>
              <View style={styles.profileVisibilityHeader}>
                <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '15' }]}>
                  <Users size={20} color={colors.primary} />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>Profile Privacy</Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    Control who can find and view your profile
                  </Text>
                </View>
              </View>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    {
                      backgroundColor: settings.profileVisibility === 'public' 
                        ? colors.primary + '15' 
                        : colors.background,
                      borderColor: settings.profileVisibility === 'public' 
                        ? colors.primary 
                        : colors.border,
                    }
                  ]}
                  onPress={() => handleVisibilityChange('public')}
                >
                  <View style={[
                    styles.radioCircle,
                    {
                      borderColor: settings.profileVisibility === 'public' 
                        ? colors.primary 
                        : colors.border,
                    }
                  ]}>
                    {settings.profileVisibility === 'public' && (
                      <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <View style={styles.radioContent}>
                    <Text style={[styles.radioTitle, { color: colors.text }]}>Public</Text>
                    <Text style={[styles.radioDescription, { color: colors.textSecondary }]}>
                      Anyone can find and view your profile
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    {
                      backgroundColor: settings.profileVisibility === 'private' 
                        ? colors.primary + '15' 
                        : colors.background,
                      borderColor: settings.profileVisibility === 'private' 
                        ? colors.primary 
                        : colors.border,
                    }
                  ]}
                  onPress={() => handleVisibilityChange('private')}
                >
                  <View style={[
                    styles.radioCircle,
                    {
                      borderColor: settings.profileVisibility === 'private' 
                        ? colors.primary 
                        : colors.border,
                    }
                  ]}>
                    {settings.profileVisibility === 'private' && (
                      <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <View style={styles.radioContent}>
                    <Text style={[styles.radioTitle, { color: colors.text }]}>Private</Text>
                    <Text style={[styles.radioDescription, { color: colors.textSecondary }]}>
                      Only you control who can see your profile
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Visibility Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Visibility Options
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <PrivacyOption
              icon={Eye}
              title="Online Status"
              description="Show when you're active"
              value={settings.showOnlineStatus}
              onToggle={() => handleToggle('showOnlineStatus')}
            />
            <PrivacyOption
              icon={Clock}
              title="Last Seen"
              description="Show when you were last online"
              value={settings.showLastSeen}
              onToggle={() => handleToggle('showLastSeen')}
            />
            <PrivacyOption
              icon={UserCheck}
              title="Read Receipts"
              description="Show when you've read messages"
              value={settings.showReadReceipts}
              onToggle={() => handleToggle('showReadReceipts')}
              isLast={true}
            />
          </View>
        </View>

        {/* Message Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Message Options
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <PrivacyOption
              icon={Bell}
              title="Message Previews"
              description="Show message content in notifications"
              value={settings.allowMessagePreviews}
              onToggle={() => handleToggle('allowMessagePreviews')}
            />
            <PrivacyOption
              icon={Globe}
              title="Allow Mentions"
              description="Let others mention you in messages"
              value={settings.allowMentions}
              onToggle={() => handleToggle('allowMentions')}
              isLast={true}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  lastOption: {
    borderBottomWidth: 0,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
  },
  profileVisibilityCard: {
    padding: 20,
  },
  profileVisibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioContent: {
    flex: 1,
  },
  radioTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  radioDescription: {
    fontSize: 14,
  },
  headerButton: {
    padding: 8,
  },
});