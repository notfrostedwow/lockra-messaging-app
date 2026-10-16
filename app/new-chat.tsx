import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { ArrowLeft, Search, UserPlus, CheckCircle2 } from 'lucide-react-native';

type UserPreview = {
  id: string;
  username: string;
  is_verified: boolean;
  created_at: string;
};

export default function NewChat() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load public users on mount and when search query changes
  useEffect(() => {
    if (!user) return;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.rpc('get_visible_users', {
          search_query: searchQuery.trim() || null
        });

        if (error) throw error;

        // Filter out the current user
        const filteredUsers = (data || []).filter((u: UserPreview) => u.id !== user.id);
        setUsers(filteredUsers);
      } catch (err: any) {
        setError(err.message || 'Failed to load users');
        console.error("Error loading users: [details redacted]");
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, user]);

  const handleUserSelect = (username: string) => {
    router.push(`/chat/${username}`);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'New Chat',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            color: colors.text,
          },
          headerShadowVisible: false,
        }}
      />
      
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={20} color={colors.placeholder} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search users..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoFocus
          />
        </View>

        {error ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : users.length === 0 ? (
          <View style={styles.centered}>
            <UserPlus size={48} color={colors.placeholder} />
            <Text style={[styles.searchPrompt, { color: colors.placeholder }]}>
              {searchQuery.trim() 
                ? 'No users found' 
                : 'Search for users to start a new chat'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.userItem, { borderBottomColor: colors.border }]}
                onPress={() => handleUserSelect(item.username)}
              >
                <View style={styles.userInfo}>
                  <Avatar username={item.username} size={50} />
                  <View style={styles.userDetails}>
                    <View style={styles.usernameContainer}>
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
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  searchPrompt: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  userItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: 16,
    flex: 1,
  },
  usernameContainer: {
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
});