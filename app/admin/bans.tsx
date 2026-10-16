import { useStableEvent } from '@/hooks/useStableEvent';
import { Alert } from '@/lib/alert';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, UserCheck, Ban, Clock, AlertTriangle, Calendar, User as UserIcon } from 'lucide-react-native';
import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { User } from '@/types/user-profile';

export default function BanManagement() {
  const { colors } = useTheme();
  const { user: currentUser, getToken } = useAuth();
  const router = useRouter();
  const [bannedUsers, setBannedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUnbanModal, setShowUnbanModal] = useState(false);
  const [unbanReason, setUnbanReason] = useState('');

  // Check admin access
  

  const loadBannedUsers = useStableEvent(async () => {
    try {
      // Use regular supabase client for read operations
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('banned', true)
        .order('banned_at', { ascending: false });

      if (error) {
        console.error("Error loading banned users: [details redacted]");
        Alert.alert('Error', 'Failed to load banned users');
        return;
      }

      setBannedUsers(data || []);
    } catch {
      console.error("Error loading banned users: [details redacted]");
      Alert.alert('Error', 'Failed to load banned users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  });

  

  const onRefresh = () => {
    setRefreshing(true);
    loadBannedUsers();
  };

  const handleUnbanUser = async () => {
    if (!selectedUser) return;

    try {
      const token = await getToken();
      if (!token) return;

      const authenticatedSupabase = createAuthenticatedSupabaseClient(token);
      
      const { error } = await authenticatedSupabase
        .from('users')
        .update({
          banned: false,
          banned_at: null,
          banned_reason: null,
          can_send: true,
        })
        .eq('id', selectedUser.id);

      if (error) {
        Alert.alert('Error', 'Failed to unban user');
        return;
      }

      // Log the unban action (if you have an admin_logs table)
      try {
        await authenticatedSupabase
          .from('admin_logs')
          .insert({
            admin_id: currentUser?.id,
            action: 'unban_user',
            target_user_id: selectedUser.id,
            reason: unbanReason || 'No reason provided',
            created_at: new Date().toISOString(),
          });
      } catch {
        console.warn("Failed to log admin action: [details redacted]");
      }

      Alert.alert('Success', 'User has been unbanned');
      setShowUnbanModal(false);
      setSelectedUser(null);
      setUnbanReason('');
      loadBannedUsers();
    } catch {
      Alert.alert('Error', 'Failed to unban user');
    }
  };

  const handleExtendBan = async (user: User, days: number) => {
    Alert.alert(
      'Extend Ban',
      `Extend ban for ${user.username || user.email} by ${days} days?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Extend',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) return;

              const authenticatedSupabase = createAuthenticatedSupabaseClient(token);
              
              const newTimeoutDate = new Date();
              newTimeoutDate.setDate(newTimeoutDate.getDate() + days);
              
              const { error } = await authenticatedSupabase
                .from('users')
                .update({
                  timeout_until: newTimeoutDate.toISOString(),
                })
                .eq('id', user.id);

              if (error) {
                Alert.alert('Error', 'Failed to extend ban');
                return;
              }

              Alert.alert('Success', `Ban extended by ${days} days`);
              loadBannedUsers();
            } catch {
              Alert.alert('Error', 'Failed to extend ban');
            }
          },
        },
      ]
    );
  };

  const filteredUsers = bannedUsers.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const getBanDuration = (bannedAt: string | null) => {
    if (!bannedAt) return 'Unknown';
    const banDate = new Date(bannedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - banDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days ago`;
  };

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      Alert.alert('Access Denied', 'Admin access required', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  }, [currentUser, router]);

useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadBannedUsers();
    }
  }, [currentUser, loadBannedUsers]);

  if (currentUser?.role !== 'admin') {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ban Management</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <Ban size={24} color={colors.error} />
          <Text style={[styles.statNumber, { color: colors.error }]}>{bannedUsers.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Banned Users</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search banned users..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Banned Users List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <UserCheck size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'No banned users found' : 'No banned users'}
            </Text>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <View
              key={user.id}
              style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.userInfo}>
                <View style={styles.userHeader}>
                  <View style={styles.userNameContainer}>
                    <UserIcon size={20} color={colors.textSecondary} />
                    <Text style={[styles.userName, { color: colors.text }]}>
                      {user.username || 'No username'}
                    </Text>
                  </View>
                  <View style={[styles.bannedBadge, { backgroundColor: colors.error + '20' }]}>
                    <Ban size={12} color={colors.error} />
                    <Text style={[styles.bannedText, { color: colors.error }]}>Banned</Text>
                  </View>
                </View>
                
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                  {user.email}
                </Text>
                
                <View style={styles.banInfo}>
                  <View style={styles.banItem}>
                    <Calendar size={14} color={colors.textTertiary} />
                    <Text style={[styles.banText, { color: colors.textTertiary }]}>
                      Banned: {formatDate(user.banned_at)} ? {formatDateTime(user.banned_at)}
                    </Text>
                  </View>
                  
                  <View style={styles.banItem}>
                    <Clock size={14} color={colors.textTertiary} />
                    <Text style={[styles.banText, { color: colors.textTertiary }]}>
                      Duration: {getBanDuration(user.banned_at)}
                    </Text>
                  </View>
                  
                  {user.banned_reason && (
                    <View style={styles.banItem}>
                      <AlertTriangle size={14} color={colors.warning} />
                      <Text style={[styles.banText, { color: colors.textTertiary }]}>
                        Reason: {user.banned_reason}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.success }]}
                  onPress={() => {
                    setSelectedUser(user);
                    setShowUnbanModal(true);
                  }}
                >
                  <UserCheck size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Unban</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.warning }]}
                  onPress={() => handleExtendBan(user, 7)}
                >
                  <Clock size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>+7d</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Unban Modal */}
      <Modal
        visible={showUnbanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUnbanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Unban User
            </Text>
            
            {selectedUser && (
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {selectedUser.username || selectedUser.email}
              </Text>
            )}
            
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
              Reason for unbanning (optional):
            </Text>
            
            <TextInput
              style={[
                styles.reasonInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                }
              ]}
              placeholder="Enter reason..."
              placeholderTextColor={colors.placeholder}
              value={unbanReason}
              onChangeText={setUnbanReason}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowUnbanModal(false);
                  setSelectedUser(null);
                  setUnbanReason('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.success }]}
                onPress={handleUnbanUser}
              >
                <Text style={styles.modalButtonText}>Unban</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  statsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  userCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  bannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  bannedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
  },
  banInfo: {
    gap: 4,
  },
  banItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  banText: {
    fontSize: 12,
  },
  actionButtons: {
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});