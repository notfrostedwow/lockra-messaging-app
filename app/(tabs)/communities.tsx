import { useStableEvent } from '@/hooks/useStableEvent';
import { Alert } from '@/lib/alert';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { communityService } from '@/lib/communityService';
import { Community } from '@/types';
import { CirclePlus as PlusCircle, Users, Lock, Globe, ArrowRight, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function Communities() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  const [publicCommunities, setPublicCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joiningCommunity, setJoiningCommunity] = useState<string | null>(null);
  const [showJoinByCode, setShowJoinByCode] = useState(false);
  const [error, setError] = useState<string | null>(null);



  const loadPublicCommunities = useStableEvent(async () => {
    try {
      setLoading(true);
      setError(null);
      const communities = await communityService.getPublicCommunities();
      setPublicCommunities(communities);
    } catch (error) {
      console.error("Error loading communities: [details redacted]");
      // Set a user-friendly error message with the actual error details
      if (error instanceof Error) {
        setError(`Error fetching public communities: ${error.message}`);
      } else {
        setError('Failed to load communities');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  });
  useEffect(() => {
    loadPublicCommunities();
  }, [loadPublicCommunities]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPublicCommunities();
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to join communities');
      return;
    }

    try {
      setJoiningCommunity(communityId);
      const success = await communityService.joinPublicCommunity(communityId, user.id);
      
      if (success) {
        Alert.alert(
          'Success', 
          'You have joined the community!',
          [
            { 
              text: 'View Community', 
              onPress: () => {
                // Navigate to the specific community chat
                router.push(`/community/${communityId}`);
              }
            },
            {
              text: 'OK',
              onPress: () => {
                // Navigate to the chat tab to see all communities
                router.push('/');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to join the community');
      }
    } catch {
      console.error("Error joining community: [details redacted]");
      Alert.alert('Error', 'Failed to join the community');
    } finally {
      setJoiningCommunity(null);
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCode || inviteCode.length !== 8) {
      Alert.alert('Error', 'Please enter a valid 8-character invite code');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to join communities');
      return;
    }

    try {
      setLoading(true);
      const result = await communityService.joinCommunityByInviteCode(inviteCode, user.id);
      
      if (result) {
        // Get the community ID if possible
        let communityId: string | null = null;
        
        if (typeof result === 'object' && result.communityId) {
          communityId = result.communityId;
        }
        
        setInviteCode('');
        setShowJoinByCode(false);
        
        Alert.alert(
          'Success', 
          'You have joined the community!',
          [
            ...(communityId ? [{ 
              text: 'View Community', 
              onPress: () => {
                // Navigate to the specific community chat
                router.push(`/community/${communityId}`);
              }
            }] : []),
            {
              text: 'OK',
              onPress: () => {
                // Navigate to the chat tab to see all communities
                router.push('/');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Invalid invite code or community not found');
      }
    } catch {
      console.error("Error joining community by code: [details redacted]");
      Alert.alert('Error', 'Failed to join the community');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommunity = () => {
    // Will implement this in a separate screen
    router.push('/create-community');
  };

  const renderCommunityItem = ({ item }: { item: Community }) => (
    <View style={[styles.communityItem, { backgroundColor: colors.card }]}>
      <View style={styles.communityInfo}>
        <View style={styles.iconContainer}>
          {item.type === 'public' ? (
            <Globe size={24} color={colors.primary} />
          ) : (
            <Lock size={24} color={colors.primary} />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.communityName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.communityType, { color: colors.textSecondary }]}>
            {item.type === 'public' ? 'Public Community' : 'Private Community'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.joinButton, { backgroundColor: colors.primary }]}
        onPress={() => handleJoinCommunity(item.id)}
        disabled={joiningCommunity === item.id}
      >
        {joiningCommunity === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.joinButtonText}>Join</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Communities</Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={handleCreateCommunity}
        >
          <PlusCircle size={20} color="#fff" />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>
      
      {/* Join by code section */}
      <TouchableOpacity
        style={[styles.joinByCodeButton, { borderColor: colors.border }]}
        onPress={() => setShowJoinByCode(!showJoinByCode)}
      >
        <Lock size={18} color={colors.primary} />
        <Text style={[styles.joinByCodeText, { color: colors.text }]}>
          Join private community with code
        </Text>
        <ArrowRight size={18} color={colors.primary} />
      </TouchableOpacity>

      {showJoinByCode && (
        <View style={[styles.codeInputContainer, { backgroundColor: colors.card }]}>
          <TextInput
            style={[styles.codeInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="Enter 8-character invite code"
            placeholderTextColor={colors.textSecondary}
            value={inviteCode}
            onChangeText={setInviteCode}
            maxLength={8}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.codeSubmitButton, { backgroundColor: colors.primary }]}
            onPress={handleJoinByCode}
          >
            <Text style={styles.codeSubmitText}>Join</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Public Communities</Text>
      
      {/* Error message display with improved visibility */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error }]}>
          <AlertCircle size={20} color="#FFFFFF" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : publicCommunities.length > 0 ? (
        <FlatList
          data={publicCommunities}
          renderItem={renderCommunityItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Users size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No public communities available
          </Text>
          <Text style={[styles.emptySubText, { color: colors.textTertiary }]}>
            Create a new community or join with an invite code
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  joinByCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  joinByCodeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
  },
  codeInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    padding: 8,
  },
  codeInput: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
  codeSubmitButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  codeSubmitText: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  list: {
    paddingBottom: 16,
  },
  communityItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  communityType: {
    fontSize: 14,
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});