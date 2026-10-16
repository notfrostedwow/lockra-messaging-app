import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { User, Info, Shield, Megaphone, Key, ShieldCheck, LogOut, ChevronLeft, Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { billingService } from '@/lib/billingService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const Sidebar = (props: DrawerContentComponentProps | { onClose: () => void }) => {
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const closeMenu = () => 'onClose' in props ? props.onClose() : props.navigation.closeDrawer();

  // Icon color based on theme
  const iconColor = theme === 'dark' ? '#8B9DC3' : '#6B7280';

  const baseMenuItems = [
    {
      title: 'My Profile',
      icon: <User size={20} color={iconColor} />,
      onPress: () => router.push('/profile')
    },
    {
      title: 'Contacts',
      icon: <Megaphone size={20} color={iconColor} />,
      onPress: () => router.push('/contacts')
    },
    {
      title: 'Referral Codes',
      icon: <Key size={20} color={iconColor} />,
      onPress: () => router.push('/invite')
    }
  ];

  // Add Admin Panel only for admin users
  const adminMenuItem = user?.role === 'admin' ? [
    {
      title: 'Admin Panel',
      icon: <ShieldCheck size={20} color={iconColor} />,
      onPress: () => router.push('/admin-panel')
    },
    {
      type: 'divider'
    }
  ] : [];

  const menuItems = [
    ...baseMenuItems,
    ...adminMenuItem,
    {
      title: 'App Features',
      icon: <Info size={20} color={iconColor} />,
      onPress: () => router.push('/features')
    },
    {
      title: 'Terms of Service',
      icon: <Shield size={20} color={iconColor} />,
      onPress: () => router.push('/terms')
    }
  ];

  const displayName = user?.username || user?.user_metadata?.full_name || 'zelle';
  const [hasActiveSub, setHasActiveSub] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      if (!user?.id) return setHasActiveSub(false);
      const sub = await billingService.getActiveSubscription(user.id);
      setHasActiveSub(!!sub);
    })();
  }, [user?.id]);

  const isPremium = Boolean(
    hasActiveSub ||
    (user as any)?.is_premium ||
    (user as any)?.plan === 'premium' ||
    (user as any)?.plan === 'lifetime' ||
    ((user as any)?.premium_until && new Date((user as any)?.premium_until) > new Date()) ||
    (user as any)?.subscription_status === 'active'
  );
  const [localAdHours, setLocalAdHours] = useState<number>(Number((user as any)?.ad_hours_used ?? 0));
  const adHoursUsed = localAdHours;
  const adHoursCap = 100;
  const usagePct = Math.max(0, Math.min(1, adHoursUsed / adHoursCap));

  const [watchingAd, setWatchingAd] = useState(false);

  // Load local ad usage if DB field doesn't exist
  useEffect(() => {
    const loadLocalUsage = async () => {
      if (!user?.id) return;
      try {
        const key = `ad_hours_used:${user.id}`;
        const val = await AsyncStorage.getItem(key);
        if (val !== null) {
          const parsed = Number(val);
          if (!Number.isNaN(parsed)) setLocalAdHours(parsed);
        }
      } catch {}
    };
    loadLocalUsage();
  }, [user?.id]);

  const handleWatchAd = async () => {
    if (isPremium || watchingAd) return;
    try {
      setWatchingAd(true);
      // Dynamically import to avoid bundling if not needed
      // Falls back gracefully if the module is not installed
      // Package: expo-ads-admob
      // npm i expo-ads-admob
      const admob = await import('@/lib/ads');
      const { AdMobRewarded } = admob;
      // Set the provided unit ID
      // Test devices can be set via setTestDeviceIDAsync in development if needed
      AdMobRewarded.setAdUnitID('AD_PROVIDER_NOT_CONFIGURED');

      let rewarded = false;
      const rewardListener = AdMobRewarded.addEventListener?.('rewardedVideoUserDidEarnReward', () => {
        rewarded = true;
      });
      const closeListener = AdMobRewarded.addEventListener?.('rewardedVideoDidDismiss', async () => {
        try {
          if (rewarded && user?.id) {
            // Increment ad usage locally
            const next = Math.min(adHoursCap, (adHoursUsed + 1));
            setLocalAdHours(next);
            // Persist locally as fallback
            try { await AsyncStorage.setItem(`ad_hours_used:${user.id}`, String(next)); } catch {}
            // Try to persist in DB if column exists
            try {
              await supabase
                .from('users')
                .update({ ad_hours_used: next })
                .eq('id', user.id);
            } catch {}
          }
        } finally {
          rewardListener?.remove?.();
          closeListener?.remove?.();
          setWatchingAd(false);
        }
      });

      // Load and show
      await AdMobRewarded.requestAdAsync?.();
      await AdMobRewarded.showAdAsync?.();
    } catch {
      // Fallback if ads module is missing or fails
      setWatchingAd(false);
      console.warn("Ad playback failed or AdMob module missing: [details redacted]");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      console.error("Error signing out: [details redacted]");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme === 'dark' ? '#0F1419' : '#F3F4F6' }]}>
      {/* Header with time and menu title */}
      <View style={styles.header}>
        <View style={styles.menuHeader}>
          <Text style={[styles.menuTitle, { color: theme === 'dark' ? '#FFFFFF' : '#1F2937' }]}>Menu</Text>
          <Pressable
            style={styles.backButton}
            onPress={closeMenu}
          >
            <ChevronLeft size={24} color={theme === 'dark' ? '#FFFFFF' : '#1F2937'} />
          </Pressable>
        </View>
      </View>

      {/* Menu items */}
      <ScrollView style={styles.menuScrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => {
            if ('type' in item && item.type === 'divider') {
              return (
                <View
                  key={`divider-${index}`}
                  style={[styles.divider, { backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}
                />
              );
            }

            return (
              <Pressable
                key={item.title}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed
                ]}
                onPress={() => { closeMenu(); item.onPress?.(); }}
              >
                <View style={styles.iconContainer}>{item.icon}</View>
                <Text style={[styles.menuText, { color: theme === 'dark' ? '#FFFFFF' : '#1F2937' }]}>
                  {item.title}
                </Text>
              </Pressable>
            );
          })}

          {/* Premium section */}
          <View style={styles.premiumWrapper}>
            <LinearGradient
              colors={isPremium ? ['#FFD54F', '#FFA000'] : ['#2A2F3D', '#1F2430']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumCard}
            >
              <View style={styles.premiumHeader}>
                <View style={[styles.crownBadge, { backgroundColor: isPremium ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)' }]}>
                  <Crown size={18} color={isPremium ? '#5B3A00' : '#E8E6FF'} />
                </View>
                <Text style={[styles.premiumTitle, { color: isPremium ? '#2D2000' : '#FFFFFF' }]}>Premium</Text>
              </View>

              <Text style={[styles.premiumPlanText, { color: isPremium ? '#2D2000' : 'rgba(255,255,255,0.9)' }]}>
                {isPremium ? 'Lifetime plan active' : 'Synthetic free plan (ads disabled)'}
              </Text>

              {!isPremium && (
                <View style={styles.usageContainer}>
                  <View style={styles.usageBarBg}>
                    <View style={[styles.usageBarFill, { width: `${Math.round(usagePct * 100)}%` }]} />
                  </View>
                  <Text style={styles.usageText}>Legacy reward workflow: {adHoursUsed}/{adHoursCap} hours</Text>
                </View>
              )}

              {!isPremium && (
                <Pressable
                  onPress={handleWatchAd}
                  disabled={watchingAd}
                  style={({ pressed }) => [
                    styles.watchAdBtn,
                    pressed && { opacity: 0.9 },
                    watchingAd && { opacity: 0.6 }
                  ]}
                >
                  <Text style={styles.watchAdText}>{watchingAd ? 'Loading ad…' : 'Ads unavailable'}</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => router.push('/premium')}
                style={({ pressed }) => [
                  styles.premiumCta,
                  { backgroundColor: isPremium ? 'rgba(255,255,255,0.9)' : '#5865F2' },
                  pressed && { opacity: 0.9 }
                ]}
              >
                <Text style={[styles.premiumCtaText, { color: isPremium ? '#1F2937' : '#FFFFFF' }]}>
                  {isPremium ? 'Manage' : 'Upgrade'}
                </Text>
              </Pressable>
            </LinearGradient>
          </View>
        </View>
      </ScrollView>

      {/* Bottom user section */}
      <View style={styles.bottomSection}>
        <View style={[styles.divider, { backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]} />

        {/* User info */}
        <View style={styles.userSection}>
          <Text style={styles.userLabel}>User</Text>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <User size={20} color="#4A90E2" />
            </View>
            <Text style={[styles.userName, { color: theme === 'dark' ? '#FFFFFF' : '#1F2937' }]}>{displayName}</Text>
          </View>


        </View>

        {/* Logout button */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            {
              backgroundColor: theme === 'dark' ? 'rgba(231, 76, 60, 0.2)' : 'rgba(231, 76, 60, 0.1)',
              borderColor: theme === 'dark' ? 'rgba(231, 76, 60, 0.3)' : 'rgba(231, 76, 60, 0.2)'
            },
            pressed && styles.logoutButtonPressed
          ]}
          onPress={handleSignOut}
        >
          <LogOut size={18} color="#E74C3C" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
    width: '100%',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  timeContainer: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  backButton: {
    padding: 8,
  },
  menuScrollView: {
    flex: 1,
  },
  menuContainer: {
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    marginVertical: 20,
    marginHorizontal: 20,
  },
  bottomSection: {
    paddingBottom: 30,
  },
  userSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  userLabel: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 44,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    marginRight: 8,
  },
  statusText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '400',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 20,
  },
  logoutButtonPressed: {
    opacity: 0.7,
  },
  logoutText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginLeft: 44,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  premiumWrapper: {
    marginTop: 12,
    marginHorizontal: 0,
  },
  premiumCard: {
    borderRadius: 16,
    padding: 14,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  crownBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  premiumPlanText: {
    fontSize: 13,
    marginBottom: 8,
  },
  usageContainer: {
    marginBottom: 10,
  },
  usageBarBg: {
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: '#7C85FF',
  },
  usageText: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)'
  },
  premiumCta: {
    marginTop: 6,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  premiumCtaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  watchAdBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#3B82F6',
  },
  watchAdText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
