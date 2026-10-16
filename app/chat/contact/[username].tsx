import { Alert } from '@/lib/alert';
import { useStableEvent } from '@/hooks/useStableEvent';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { ArrowLeft, Mail, Calendar, Info, Share2 as ShareIcon, MessageCircle } from 'lucide-react-native';
import { formatDate } from '@/lib/utils';
import { StatusBar } from 'expo-status-bar';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  created_at: string;
  bio?: string;
  show_email?: boolean;
}

export default function ContactInfoScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams();
  const { colors, theme } = useTheme();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  
  
  const fetchUserProfile = useStableEvent(async () => {
    try {
      setLoading(true);
      
      if (!currentUser) {
        throw new Error('You must be logged in to view contact information');
      }
      
      // First try to fetch user with privacy settings
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*, privacy_settings(*)')
          .eq('username', username)
          .single();
          
        if (userError) {
          throw userError;
        }
        
        if (!userData) {
          throw new Error('User not found');
        }
        
        // Process user data with privacy settings
        const showEmail = userData.privacy_settings?.show_email ?? false;
        
        setUser({
          ...userData,
          show_email: showEmail
        });
      } catch {
        // If that fails (likely because privacy_settings table doesn't exist yet),
        // fetch just the user data
        console.log("Error fetching with privacy settings, trying without: [details redacted]");
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .single();
          
        if (userError) {
          throw new Error('User not found');
        }
        
        if (!userData) {
          throw new Error('User not found');
        }
        
        // Default to not showing email if privacy settings don't exist
        setUser({
          ...userData,
          show_email: false
        });
      }
      
    } catch (err: any) {
      console.error("Error fetching user profile: [details redacted]");
      Alert.alert('Error', err.message || 'Failed to load contact information');
    } finally {
      setLoading(false);
    }
  });
  
  const handleShareProfile = async () => {
    if (!user) return;
    
    try {
      await Share.share({
        message: `Check out ${user.username} on Lockra!`,
        // In a real app, you would have a deep link URL here
        url: `https://example.invalid`,
      });
    } catch {
      console.error("Error sharing profile: [details redacted]");
    }
  };
  
  const handleSendMessage = () => {
    router.back();
  };
  
  useEffect(() => {
    fetchUserProfile();
  }, [currentUser, fetchUserProfile, username]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  if (!user) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Text style={[styles.errorText, { color: '#FFFFFF' }]}>
          User not found
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: '#1A1A1A' }]}>
      <StatusBar style="light" />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#252525', borderBottomColor: '#333333' }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>
          Contact Info
        </Text>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: '#252525', borderColor: '#333333' }]}>
          <View style={styles.profileHeader}>
            <Avatar username={user.username} size={100} />
            <Text style={[styles.username, { color: '#FFFFFF' }]}>
              {user.username}
            </Text>
            {user.bio && (
              <Text style={[styles.bio, { color: '#CCCCCC' }]}>
                {user.bio}
              </Text>
            )}
          </View>
          
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleSendMessage}
            >
              <MessageCircle size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#333333', borderColor: '#555555' }]}
              onPress={handleShareProfile}
            >
              <ShareIcon size={20} color="#FFFFFF" />
              <Text style={[styles.actionButtonTextSecondary, { color: '#FFFFFF' }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Info Section */}
        <View style={[styles.infoSection, { backgroundColor: '#252525', borderColor: '#333333' }]}>
          <Text style={[styles.sectionTitle, { color: '#AAAAAA' }]}>
            Contact Information
          </Text>
          
          {user.show_email && (
            <View style={styles.infoItem}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Mail size={20} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: '#AAAAAA' }]}>
                  Email
                </Text>
                <Text style={[styles.infoValue, { color: '#FFFFFF' }]}>
                  {user.email}
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.infoItem}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Calendar size={20} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: '#AAAAAA' }]}>
                Joined
              </Text>
              <Text style={[styles.infoValue, { color: '#FFFFFF' }]}>
                {formatDate(user.created_at)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Privacy Note */}
        {!user.show_email && (
          <View style={[styles.privacyNote, { backgroundColor: '#252525', borderColor: '#333333' }]}>
            <Info size={20} color="#AAAAAA" />
            <Text style={[styles.privacyNoteText, { color: '#AAAAAA' }]}>
              This user has chosen to keep their email private.
            </Text>
          </View>
        )}
      </ScrollView>
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
  profileSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 120,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  actionButtonTextSecondary: {
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  infoSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  privacyNoteText: {
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
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