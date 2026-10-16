import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Stack, useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Edit2, ChevronLeft, User, AtSign, Calendar, Shield, Clock } from 'lucide-react-native';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const displayName = user?.username || user?.user_metadata?.full_name || 'User';
  const hasAvatar = user?.avatar_url || user?.user_metadata?.avatar_url;
  
  const accountDetails = [
    {
      icon: <User size={20} color={colors.primary} />,
      label: 'Username',
      value: user?.username || 'Not set',
    },
    {
      icon: <AtSign size={20} color={colors.primary} />,
      label: 'Email',
      value: user?.email || 'Not available',
    },
    {
      icon: <Calendar size={20} color={colors.primary} />,
      label: 'Account Created',
      value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
    },
    {
      icon: <Clock size={20} color={colors.primary} />,
      label: 'Last Sign In',
      value: (user as any)?.last_sign_in_at ? new Date((user as any).last_sign_in_at).toLocaleDateString() : 'N/A',
    },
    {
      icon: <Shield size={20} color={colors.primary} />,
      label: 'Account Type',
      value: user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Standard',
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Profile',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ChevronLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Edit2 size={20} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {hasAvatar ? (
              <Image
                source={{
                  uri: user?.avatar_url || user?.user_metadata?.avatar_url,
                }}
                style={styles.avatar}
              />
            ) : (
              <Avatar username={displayName} size={120} />
            )}
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>
            {user?.email || 'No email available'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Information</Text>
          
          {accountDetails.map((item, index) => (
            <View 
              key={index} 
              style={[
                styles.detailRow, 
                index < accountDetails.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
              ]}
            >
              <View style={styles.iconContainer}>{item.icon}</View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button 
            title="Edit Profile" 
            variant="primary"
            onPress={() => router.push('/settings')}
            style={{ marginBottom: 12 }}
          />
          <Button 
            title="Security Settings" 
            variant="outline"
            onPress={() => router.push('/security')}
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
}); 