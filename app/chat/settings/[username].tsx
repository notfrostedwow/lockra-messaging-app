import { Alert } from '@/lib/alert';
import { useStableEvent } from '@/hooks/useStableEvent';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, BellOff, Bell } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

interface ChatSettings {
  id: string;
  user_id: string;
  chat_with: string;
  muted: boolean;
  created_at: string;
}

export default function ChatSettingsScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams();
  const { colors, theme } = useTheme();
  const { user: currentUser } = useAuth();
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  
  
  const fetchChatSettings = useStableEvent(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser) {
        throw new Error('You must be logged in to view chat settings');
      }
      
      // First, get the user ID for the username
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();
        
      if (userError || !userData) {
        throw new Error('User not found');
      }
      
      try {
        // Check if settings already exist
        const { data: existingSettings, error: settingsError } = await supabase
          .from('chat_settings')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('chat_with', userData.id)
          .single();
          
        if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
          throw new Error(`Failed to fetch settings: ${settingsError.message}`);
        }
        
        if (existingSettings) {
          setSettings(existingSettings);
        } else {
          // If the chat_settings table doesn't exist yet or no settings found,
          // just create a default settings object in memory
          setSettings({
            id: 'temp-id',
            user_id: currentUser.id,
            chat_with: userData.id,
            muted: false,
            created_at: new Date().toISOString()
          });
        }
      } catch {
        console.log("Error with chat_settings table, using default settings: [details redacted]");
        // If the chat_settings table doesn't exist yet,
        // just create a default settings object in memory
        setSettings({
          id: 'temp-id',
          user_id: currentUser.id,
          chat_with: userData.id,
          muted: false,
          created_at: new Date().toISOString()
        });
      }
      
    } catch (err: any) {
      console.error("Error fetching chat settings: [details redacted]");
      setError(err.message || 'Failed to load chat settings');
      Alert.alert('Error', err.message || 'Failed to load chat settings');
    } finally {
      setLoading(false);
    }
  });
  
  const handleToggleMute = async (value: boolean) => {
    try {
      setSaving(true);
      
      if (!currentUser || !settings) {
        throw new Error('Settings not loaded');
      }
      
      // Update local state immediately for better UX
      setSettings(prev => prev ? { ...prev, muted: value } : null);
      
      try {
        // Try to update settings in database if the table exists
        if (settings.id !== 'temp-id') {
          const { error } = await supabase
            .from('chat_settings')
            .update({ muted: value })
            .eq('id', settings.id);
            
          if (error) {
            throw error;
          }
        }
      } catch {
        console.log("Error updating settings in database, using local state only: [details redacted]");
        // If the update fails (likely because the table doesn't exist),
        // we'll just keep the setting in local state
      }
      
      // Show confirmation
      Alert.alert(
        value ? 'Notifications Muted' : 'Notifications Enabled',
        value 
          ? `You won't receive notifications from ${username}` 
          : `You'll now receive notifications from ${username}`
      );
      
    } catch (err: any) {
      console.error("Error updating chat settings: [details redacted]");
      Alert.alert('Error', err.message || 'Failed to update settings');
      // Revert the local state change
      setSettings(prev => prev ? { ...prev, muted: !value } : null);
    } finally {
      setSaving(false);
    }
  };
  
  useEffect(() => {
    fetchChatSettings();
  }, [currentUser, fetchChatSettings, username]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => fetchChatSettings()}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Chat Settings
        </Text>
      </View>
      
      {/* Settings */}
      <View style={styles.content}>
        <View style={[styles.settingsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                {settings?.muted ? (
                  <BellOff size={24} color={colors.primary} />
                ) : (
                  <Bell size={24} color={colors.primary} />
                )}
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Mute Notifications
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {settings?.muted 
                    ? `You won't receive notifications from ${username}` 
                    : `You'll receive notifications from ${username}`
                  }
                </Text>
              </View>
            </View>
            <Switch
              value={settings?.muted || false}
              onValueChange={handleToggleMute}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
              disabled={saving}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    paddingTop: 50, // Add extra padding for status bar
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  settingsSection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    padding: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 