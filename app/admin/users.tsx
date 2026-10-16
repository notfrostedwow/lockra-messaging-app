import { Alert } from '@/lib/alert';
import { useStableEvent } from '@/hooks/useStableEvent';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, MoreVertical, Ban, UserCheck, Shield, Clock, Calendar } from 'lucide-react-native';
import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { User } from '@/types/user-profile';

export default function UserManagement() {
  const { colors } = useTheme();
  const { user: currentUser, getToken } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'active' | 'banned' | 'admin'>('all');

  // Check admin access
  

  const loadUsers = useStableEvent(async () => {
    try {
      // Use regular supabase client for read operations
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filterType === 'active') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        query = query.gte('last_seen', yesterday.toISOString());
      } else if (filterType === 'banned') {
        query = query.eq('banned', true);
      } else if (filterType === 'admin') {
        query = query.eq('role', 'admin');
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading users: [details redacted]");
        Alert.alert('Error', 'Failed to load users');
        return;
      }

      setUsers(data || []);
    } catch {
      console.error("Error loading users: [details redacted]");
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  });

  

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleBanUser = async (user: User) => {
    Alert.alert(
      'Ban User',
      `Are you sure you want to ban ${user.username || user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) return;

              const authenticatedSupabase = createAuthenticatedSupabaseClient(token);
              
              const { error } = await authenticatedSupabase
                .from('users')
                .update({
                  banned: true,
                  banned_at: new Date().toISOString(),
                  banned_reason: 'Banned by admin',
                  can_send: false,
                })
                .eq('id', user.id);

              if (error) {
                Alert.alert('Error', 'Failed to ban user');
                return;
              }

              Alert.alert('Success', 'User has been banned');
              loadUsers();
            } catch {
              Alert.alert('Error', 'Failed to ban user');
            }
          },
        },
      ]
    );
  };

  const handleUnbanUser = async (user: User) => {
    Alert.alert(
      'Unban User',
      `Are you sure you want to unban ${user.username || user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unban',
          onPress: async () => {
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
                .eq('id', user.id);

              if (error) {
                Alert.alert('Error', 'Failed to unban user');
                return;
              }

              Alert.alert('Success', 'User has been unbanned');
              loadUsers();
            } catch {
              Alert.alert('Error', 'Failed to unban user');
            }
          },
        },
      ]
    );
  };

  const handleMakeAdmin = async (user: User) => {
    Alert.alert(
      'Make Admin',
      `Are you sure you want to make ${user.username || user.email} an admin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Make Admin',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) return;

              const authenticatedSupabase = createAuthenticatedSupabaseClient(token);
              
              const { error } = await authenticatedSupabase
                .from('users')
                .update({ role: 'admin' })
                .eq('id', user.id);

              if (error) {
                Alert.alert('Error', 'Failed to update user role');
                return;
              }

              Alert.alert('Success', 'User is now an admin');
              loadUsers();
            } catch {
              Alert.alert('Error', 'Failed to update user role');
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (user: User) => {
    if (user.banned) return colors.error;
    if (user.role === 'admin') return colors.primary;
    return colors.success;
  };

  const getStatusText = (user: User) => {
    if (user.banned) return 'Banned';
    if (user.role === 'admin') return 'Admin';
    return 'Active';
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
      loadUsers();
    }
  }, [currentUser, filterType, loadUsers]);

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>User Management</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search and Filter */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search users..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['all', 'active', 'banned', 'admin'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                {
                  backgroundColor: filterType === filter ? colors.primary : colors.card,
                  borderColor: colors.border,
                }
              ]}
              onPress={() => setFilterType(filter as any)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filterType === filter ? '#FFFFFF' : colors.text }
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Users List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          filteredUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                setSelectedUser(user);
                setShowUserModal(true);
              }}
            >
              <View style={styles.userInfo}>
                <View style={styles.userHeader}>
                  <Text style={[styles.userName, { color: colors.text }]}>
                    {user.username || 'No username'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(user) }]}>
                      {getStatusText(user)}
                    </Text>
                  </View>
                </View>
                
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                  {user.email}
                </Text>
                
                <View style={styles.userMeta}>
                  <View style={styles.metaItem}>
                    <Calendar size={14} color={colors.textTertiary} />
                    <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                      Joined {formatDate(user.created_at)}
                    </Text>
                  </View>
                  
                  {user.last_seen && (
                    <View style={styles.metaItem}>
                      <Clock size={14} color={colors.textTertiary} />
                      <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                        Last seen {formatDate(user.last_seen)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => {
                  setSelectedUser(user);
                  setShowUserModal(true);
                }}
              >
                <MoreVertical size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* User Details Modal */}
      <Modal
        visible={showUserModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {selectedUser && (
              <>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedUser.username || 'User Details'}
                </Text>
                
                <View style={styles.modalInfo}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Email:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedUser.email}</Text>
                </View>
                
                <View style={styles.modalInfo}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Role:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedUser.role}</Text>
                </View>
                
                <View style={styles.modalInfo}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Status:</Text>
                  <Text style={[styles.modalValue, { color: getStatusColor(selectedUser) }]}>
                    {getStatusText(selectedUser)}
                  </Text>
                </View>
                
                <View style={styles.modalActions}>
                  {selectedUser.banned ? (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.success }]}
                      onPress={() => {
                        setShowUserModal(false);
                        handleUnbanUser(selectedUser);
                      }}
                    >
                      <UserCheck size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Unban</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.error }]}
                      onPress={() => {
                        setShowUserModal(false);
                        handleBanUser(selectedUser);
                      }}
                    >
                      <Ban size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Ban</Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedUser.role !== 'admin' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setShowUserModal(false);
                        handleMakeAdmin(selectedUser);
                      }}
                    >
                      <Shield size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Make Admin</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: colors.border }]}
                  onPress={() => setShowUserModal(false)}
                >
                  <Text style={[styles.closeButtonText, { color: colors.text }]}>Close</Text>
                </TouchableOpacity>
              </>
            )}
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
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  userMeta: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  moreButton: {
    padding: 8,
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
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalValue: {
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});