import { Alert } from '@/lib/alert';
import { useStableEvent } from '@/hooks/useStableEvent';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Stack, useRouter } from 'expo-router';
import { Button } from '../components/ui/Button';
import { Shield, Smartphone, Key, LogOut, ArrowLeft } from 'lucide-react-native';

interface Session {
  id: string;
  created_at: string;
  last_active: string;
  device_type: string;
  ip_address: string;
  is_current: boolean;
  user_id: string;
  city?: string;
  country?: string;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  login_notifications: boolean;
  secure_boot_enabled: boolean;
}

const SecurityOption = ({
    icon: Icon,
    title,
    description,
    value,
    onToggle,
    isLast = false
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
      { borderBottomColor: colors.border },
      isLast && styles.lastOption
    ]}>
      <View style={styles.optionLeft}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '15' }]}>
          <Icon size={20} color={colors.primary} />
        </View>
        <View style={styles.optionText}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.optionDescription, { color: colors.placeholder }]}>
            {description}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
    </View>
  ); };

export default function Security() {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState<SecuritySettings>({
    two_factor_enabled: false,
    login_notifications: true,
    secure_boot_enabled: true,
  });
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  const saveSecuritySettings = async (newSettings: SecuritySettings) => {
    if (!user?.id) return;

    try {
      // Use regular supabase client for now to avoid RLS issues
      // In production, you'd want to set up proper RLS policies
      const { error } = await supabase
        .from('user_security_settings')
        .upsert({
          user_id: user.id,
          ...newSettings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.warn("Security settings not saved to database (RLS policy): [details redacted]");
        // For now, just keep settings in local state
        // In production, you'd configure proper RLS policies
      }
    } catch {
      console.warn("Security settings kept in local state only: [details redacted]");
      // Settings will persist in component state during session
    }
  };


  

  const loadSecuritySettings = useStableEvent(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_security_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Error loading security settings: [details redacted]");
        return;
      }
      
      if (data) {
        setSettings({
          two_factor_enabled: data.two_factor_enabled || false,
          login_notifications: data.login_notifications !== false,
          secure_boot_enabled: data.secure_boot_enabled !== false,
        });
      } else {
        await saveSecuritySettings(settings);
      }
    } catch {
      console.error("Unexpected error loading security settings: [details redacted]");
    } finally {
      setLoading(false);
    }
  });

  const loadActiveSessions = useStableEvent(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_active', { ascending: false });
        
      if (error) {
        console.error("Error loading sessions: [details redacted]");
        return;
      }

      // Clean up duplicate sessions
      if (data) {
        const uniqueDevices = new Map();
        const duplicates: string[] = [];

        // Keep only the most recent session for each device
        data.forEach(session => {
          if (uniqueDevices.has(session.device_type)) {
            const existingSession = uniqueDevices.get(session.device_type);
            if (new Date(session.last_active) > new Date(existingSession.last_active)) {
              duplicates.push(existingSession.id);
              uniqueDevices.set(session.device_type, session);
            } else {
              duplicates.push(session.id);
            }
          } else {
            uniqueDevices.set(session.device_type, session);
          }
        });

        // Delete duplicate sessions if any found
        if (duplicates.length > 0) {
          await supabase
            .from('user_sessions')
            .delete()
            .in('id', duplicates);
          
          // Set sessions to the unique list
          setSessions(Array.from(uniqueDevices.values()));
        } else {
          setSessions(data);
        }
      } else {
        setSessions([]);
      }
    } catch {
      console.error("Unexpected error loading sessions: [details redacted]");
    } finally {
      setSessionLoading(false);
    }
  });

  const setup2FA = async () => {
    try {
      setLoading(true);
      
      // Generate 2FA secret
      const { data: factorData, error: factorError } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });
      
      if (factorError) throw factorError;
      
      if (factorData) {
        // Show QR code setup modal
        Alert.alert(
          '2FA Setup',
          `Please scan this QR code with your authenticator app:\n\n${factorData.totp.qr_code}\n\nOr enter this code manually:\n${factorData.totp.secret}`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                // Cancel 2FA setup
                supabase.auth.mfa.unenroll({ factorId: factorData.id });
              }
            },
            {
              text: 'Verify',
              onPress: async () => {
                // Prompt for verification code
                Alert.prompt(
                  'Verify 2FA',
                  'Enter the code from your authenticator app',
                  async (code) => {
                    if (!code) return;
                    
                    try {
                      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
                        factorId: factorData.id
                      });
                      
                      if (challengeError) {
                        setError(challengeError.message);
                        throw challengeError;
                      }

                      const { error: verifyError } = await supabase.auth.mfa.verify({
                        factorId: factorData.id,
                        challengeId: challenge.id,
                        code
                      });
                      
                      if (verifyError) throw verifyError;
                      
                      // Update settings
                      const newSettings = {
                        ...settings,
                        two_factor_enabled: true
                      };
                      setSettings(newSettings);
                      await saveSecuritySettings(newSettings);
                      
                      Alert.alert('Success', '2FA has been enabled for your account');
                    } catch {
                      console.error("Error verifying 2FA: [details redacted]");
                      Alert.alert('Error', 'Failed to verify 2FA code');
                    }
                  }
                );
              }
            }
          ]
        );
      }
    } catch {
      console.error("Error setting up 2FA: [details redacted]");
      Alert.alert('Error', 'Failed to set up 2FA');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    Alert.alert(
      'Disable 2FA',
      'Are you sure you want to disable two-factor authentication? This will make your account less secure.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Get user's factors
              const { data: factors } = await supabase.auth.mfa.listFactors();
              
              if (factors && factors.totp.length > 0) {
                // Unenroll from all TOTP factors
                for (const factor of factors.totp) {
                  await supabase.auth.mfa.unenroll({ factorId: factor.id });
                }
              }
              
              // Update settings
              const newSettings = {
                ...settings,
                two_factor_enabled: false
              };
              setSettings(newSettings);
              await saveSecuritySettings(newSettings);
              
              Alert.alert('Success', '2FA has been disabled');
            } catch {
              console.error("Error disabling 2FA: [details redacted]");
              Alert.alert('Error', 'Failed to disable 2FA');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleToggle = async (setting: keyof SecuritySettings) => {
    if (setting === 'two_factor_enabled') {
      if (settings.two_factor_enabled) {
        await disable2FA();
      } else {
        await setup2FA();
      }
      return;
    }

    const newSettings = {
      ...settings,
      [setting]: !settings[setting],
    };
    setSettings(newSettings);
    await saveSecuritySettings(newSettings);
  };

  const handleEndSession = async (sessionId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) {
        console.error("Error ending session: [details redacted]");
        Alert.alert('Error', 'Failed to end session');
        return;
      }

      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch {
      console.error("Unexpected error ending session: [details redacted]");
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleEndAllSessions = () => {
    Alert.alert(
      'End All Sessions',
      'This will sign you out of all other devices. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End All',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;

            try {
              const currentSession = sessions.find(s => s.is_current);
              if (!currentSession) {
                Alert.alert('Error', 'Could not identify current session');
                return;
              }

              const { error } = await supabase
                .from('user_sessions')
                .delete()
                .eq('user_id', user.id)
                .neq('id', currentSession.id);

              if (error) {
                console.error("Error ending all sessions: [details redacted]");
                Alert.alert('Error', 'Failed to end all sessions');
                return;
              }

              await loadActiveSessions();
            } catch {
              console.error("Unexpected error ending all sessions: [details redacted]");
              Alert.alert('Error', 'An unexpected error occurred');
            }
          },
        },
      ]
    );
  };

  const getDeviceIcon = (deviceType: string) => {
    // Always return Smartphone icon since this is a mobile app
    return Smartphone;
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  const SessionItem = ({ 
    session,
    onRevoke,
    isCurrent
  }: { 
    session: Session;
    onRevoke: (id: string) => void;
    isCurrent: boolean;
  }) => {
    const { colors } = useTheme();
    const DeviceIcon = getDeviceIcon(session.device_type || '');
    
    const getLocationString = () => {
      if (session.city && session.country) {
        return `${session.city}, ${session.country}`;
      } else if (session.country) {
        return session.country;
      }
      return 'Unknown location';
    };

    return (
      <View style={[
        styles.sessionItem,
        { backgroundColor: colors.card }
      ]}>
        <View style={styles.sessionInfo}>
          <View style={[styles.deviceIcon, { backgroundColor: colors.primary + '15' }]}>
            <DeviceIcon size={20} color={colors.primary} />
          </View>
          <View style={styles.sessionDetails}>
            <View style={styles.sessionHeader}>
              <Text style={[styles.deviceType, { color: colors.text }]}>
                {session.device_type || 'Unknown Device'}
                {isCurrent && (
                  <Text style={[styles.currentBadgeText, { color: colors.success }]}>
                    {' '}• This device
                  </Text>
                )}
              </Text>
            </View>
            <Text style={[styles.sessionMeta, { color: colors.placeholder }]}>
              {getLocationString()}
            </Text>
            <Text style={[styles.sessionMeta, { color: colors.placeholder }]}>
              Last active {formatTimeAgo(session.last_active)}
            </Text>
          </View>
        </View>
        {!isCurrent && (
          <TouchableOpacity 
            onPress={() => onRevoke(session.id)}
            style={[styles.revokeButton, { backgroundColor: colors.error + '15' }]}
          >
            <LogOut size={18} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  useEffect(() => {
    if (user?.id) {
      loadSecuritySettings();
      loadActiveSessions();
    }
  }, [loadActiveSessions, loadSecuritySettings, user?.id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          headerTitle: "Security",
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
            <Shield size={28} color={colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Account Security
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.placeholder }]}>
            Manage your security settings and monitor active sessions
          </Text>
        </View>

        {/* Security Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Security Options
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <SecurityOption
              icon={Key}
              title="Two-Factor Authentication"
              description={settings.two_factor_enabled ? "Enabled" : "Disabled"}
              value={settings.two_factor_enabled}
              onToggle={() => settings.two_factor_enabled ? disable2FA() : setup2FA()}
            />
            <SecurityOption
              icon={Smartphone}
              title="Login Notifications"
              description="Get notified when someone logs into your account"
              value={settings.login_notifications}
              onToggle={() => handleToggle('login_notifications')}
            />
            <SecurityOption
              icon={Shield}
              title="Secure Boot"
              description="Require authentication each time you open the app"
              value={settings.secure_boot_enabled}
              onToggle={() => handleToggle('secure_boot_enabled')}
              isLast={true}
            />
          </View>
        </View>

        {/* Active Sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Active Sessions
            </Text>
            <TouchableOpacity 
              onPress={handleEndAllSessions}
              style={styles.endAllButton}
            >
              <Text style={[styles.endAllText, { color: colors.error }]}>End All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {sessionLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.placeholder }]}>
                  Loading sessions...
                </Text>
              </View>
            ) : sessions.length > 0 ? (
              sessions.map((session, index) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  onRevoke={handleEndSession}
                  isCurrent={session.is_current}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.placeholder }]}>
                  No active sessions found
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            onPress={signOut}
            variant="destructive"
            fullWidth
          >
            Sign Out of All Devices
          </Button>
        </View>
      </ScrollView>
    </View>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  
  // Header styles
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 16,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  
  // Section styles
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  
  // Security option styles
  optionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  lastOption: {
    borderBottomWidth: 0,
  },
  optionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    lineHeight: 20,
  },
  
  // Session styles
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionDetails: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceType: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  currentBadgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sessionMeta: {
    fontSize: 14,
    marginTop: 2,
    color: '#666',
  },
  revokeButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  endAllButton: {
    paddingHorizontal: 12,
  },
  endAllText: {
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  logoutContainer: {
    padding: 20,
  },
  headerButton: {
    padding: 8,
  },
});
