import { Alert } from '@/lib/alert';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import {
  Bell,
  Moon,
  ChevronRight,
  Shield,
  Eye,
  Smartphone,
  HelpCircle,
  Globe,
  Database,
} from 'lucide-react-native';

export default function Settings() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [pushNotifications, setPushNotifications] = useState(true);

  const settingsCategories = [
    {
      title: 'Account',
      items: [
        {
          icon: Shield,
          title: 'Security',
          subtitle: 'Password, 2FA, and security settings',
          onPress: () => router.push('/security'),
        },
        {
          icon: Eye,
          title: 'Privacy',
          subtitle: 'Control your privacy settings',
          onPress: () => router.push('/privacy'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Bell,
          title: 'Notifications',
          subtitle: 'Manage notification preferences',
          hasSwitch: true,
          switchValue: pushNotifications,
          onSwitchChange: setPushNotifications,
        },
        {
          icon: Moon,
          title: 'Dark Mode',
          subtitle: 'Toggle between light and dark theme',
          hasSwitch: true,
          switchValue: theme === 'dark',
          onSwitchChange: toggleTheme,
        },
        {
          icon: Globe,
          title: 'Language',
          subtitle: 'English (US)',
          onPress: () => Alert.alert('Coming Soon', 'Language settings will be available soon.'),
        },
      ],
    },
    {
      title: 'App',
      items: [
        {
          icon: Database,
          title: 'Storage',
          subtitle: 'Manage app storage and cache',
          onPress: () => Alert.alert('Coming Soon', 'Storage management will be available soon.'),
        },
        {
          icon: Smartphone,
          title: 'Device Settings',
          subtitle: 'App permissions and device settings',
          onPress: () => Alert.alert('Coming Soon', 'Device settings will be available soon.'),
        },
        {
          icon: HelpCircle,
          title: 'Help & Support',
          subtitle: 'Get help and contact support',
          onPress: () => Alert.alert('Coming Soon', 'Help center will be available soon.'),
        },
      ],
    },
  ];

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Please sign in to view settings
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={[styles.profileSection, { backgroundColor: colors.card }]}>
        <Avatar username={user.username || user.email || 'User'} size={60} />
        <View style={styles.profileInfo}>
          <Text style={[styles.username, { color: colors.text }]}>
            {user.username || 'No username'}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>
            {user.email}
          </Text>
          {user.role === 'admin' && (
            <View style={[styles.adminBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.adminText, { color: colors.primary }]}>Admin</Text>
            </View>
          )}
        </View>
      </View>

      {/* Settings Categories */}
      {settingsCategories.map((category, categoryIndex) => (
        <View key={category.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {category.title}
          </Text>
          <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
            {category.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={item.title}
                style={[
                  styles.settingItem,
                  itemIndex < category.items.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={item.onPress}
                disabled={item.hasSwitch}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                    <item.icon size={20} color={colors.primary} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                      {item.subtitle}
                    </Text>
                  </View>
                </View>

                {item.hasSwitch ? (
                  <Switch
                    value={item.switchValue}
                    onValueChange={item.onSwitchChange}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                ) : (
                  <ChevronRight size={20} color={colors.textTertiary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}



      {/* App Version */}
      <View style={styles.versionSection}>
        <Text style={[styles.versionText, { color: colors.textTertiary }]}>
          Lockra v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    marginBottom: 8,
  },
  adminBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  adminText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingsGroup: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  versionSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  versionText: {
    fontSize: 12,
  },
});