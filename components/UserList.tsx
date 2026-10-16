import { useStableEvent } from '@/hooks/useStableEvent';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { Search, CheckCircle2 } from 'lucide-react-native';

interface User {
  id: string;
  username: string;
  is_verified: boolean;
  created_at: string;
}

interface UserListProps {
  onClose?: () => void;
}

export const UserList: React.FC<UserListProps> = ({ onClose }) => {
  const { colors } = useTheme();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  

  

  const loadUsers = useStableEvent(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_visible_users', {
        search_query: null
      });

      if (error) {
        console.error("Error loading users: [details redacted]");
        return;
      }

      setUsers(data || []);
    } catch {
      console.error("Unexpected error loading users: [details redacted]");
    } finally {
      setLoading(false);
    }
  });

  const searchUsers = useStableEvent(async () => {
    try {
      setSearching(true);
      const { data, error } = await supabase.rpc('get_visible_users', {
        search_query: searchQuery
      });

      if (error) {
        console.error("Error searching users: [details redacted]");
        return;
      }

      setUsers(data || []);
    } catch {
      console.error("Unexpected error searching users: [details redacted]");
    } finally {
      setSearching(false);
    }
  });

  const handleUserPress = (userId: string) => {
    // Navigate to chat or user profile
    router.push(`/chat/${userId}`);
    if (onClose) {
      onClose();
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[styles.userItem, { borderBottomColor: colors.border }]}
      onPress={() => handleUserPress(item.id)}
    >
      <View style={styles.userInfo}>
        <Text style={[styles.username, { color: colors.text }]}>
          {item.username}
        </Text>
        {item.is_verified && (
          <CheckCircle2 size={16} color={colors.primary} style={styles.verifiedIcon} />
        )}
      </View>
      <Text style={[styles.joinDate, { color: colors.placeholder }]}>
        Joined {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (searchQuery) {
        searchUsers();
      } else {
        loadUsers();
      }
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [loadUsers, searchQuery, searchUsers]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Search size={20} color={colors.placeholder} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search users..."
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {searching && (
            <View style={styles.searchingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
          
          {users.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No users found
              </Text>
            </View>
          ) : (
            <FlatList
              data={users}
              renderItem={renderUser}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchingIndicator: {
    padding: 8,
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  userItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  joinDate: {
    fontSize: 14,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
}); 