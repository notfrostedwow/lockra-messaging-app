import { Alert } from '@/lib/alert';
import { useStableEvent } from '@/hooks/useStableEvent';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { communityService } from '@/lib/communityService';
import { Community, CommunityMember, MemberRole } from '@/types';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Crown, Shield, User, MoreVertical, X, UserMinus } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';

export default function CommunityMembers() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<MemberRole | null>(null);
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  
  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin';
  const canManageMembers = isOwner || isAdmin;
  
  
  
  const loadCommunityData = useStableEvent(async () => {
    try {
      setLoading(true);
      
      // Load community details
      const communityData = await communityService.getCommunityById(id);
      if (!communityData) {
        Alert.alert('Error', 'Community not found');
        router.back();
        return;
      }
      setCommunity(communityData);
      
      // Load user role
      const role = await communityService.getUserRole(id, user?.id);
      setUserRole(role);
      
      // Load members
      const communityMembers = await communityService.getCommunityMembers(id);
      setMembers(communityMembers);
    } catch {
      console.error("Error loading community data: [details redacted]");
      Alert.alert('Error', 'Failed to load community data');
    } finally {
      setLoading(false);
    }
  });
  
  const handleRemoveMember = async () => {
    if (!selectedMember || !canManageMembers) return;
    
    // Don't allow removing the owner
    if (selectedMember.role === 'owner' && userRole !== 'owner') {
      Alert.alert('Error', 'You cannot remove the owner of the community');
      return;
    }
    
    // Don't allow removing yourself - use leave community instead
    if (selectedMember.user_id === user?.id) {
      Alert.alert('Error', 'You cannot remove yourself. Use the leave community option instead.');
      return;
    }
    
    try {
      setActionLoading(true);
      
      const success = await communityService.removeMember(id, selectedMember.user_id, user?.id);
      
      if (success) {
        // Update the local state
        setMembers(prev => prev.filter(m => m.user_id !== selectedMember.user_id));
        Alert.alert('Success', `${selectedMember.username} has been removed from the community`);
      } else {
        Alert.alert('Error', 'Failed to remove member');
      }
    } catch {
      console.error("Error removing member: [details redacted]");
      Alert.alert('Error', 'Failed to remove member');
    } finally {
      setActionLoading(false);
      setActionModalVisible(false);
      setSelectedMember(null);
    }
  };
  
  const handleRoleChange = async (newRole: MemberRole) => {
    if (!selectedMember || !canManageMembers) return;
    
    // Don't allow changing the owner's role if you're not the owner
    if (selectedMember.role === 'owner' && userRole !== 'owner') {
      Alert.alert('Error', 'You cannot change the role of the owner');
      return;
    }
    
    // Don't allow making someone else owner
    if (newRole === 'owner' && userRole === 'owner') {
      Alert.alert(
        'Transfer Ownership',
        `Are you sure you want to transfer ownership to ${selectedMember.username}? You will become an admin.`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Transfer',
            onPress: async () => {
              try {
                setActionLoading(true);
                
                // First make the target member owner
                const success = await communityService.changeUserRole(id, selectedMember.user_id, 'owner', user?.id);
                
                if (success) {
                  // Then downgrade current user to admin
                  await communityService.changeUserRole(id, user!.id, 'admin', user!.id);
                  
                  // Update local state
                  setMembers(prev => prev.map(m => {
                    if (m.user_id === selectedMember.user_id) {
                      return { ...m, role: 'owner' };
                    } else if (m.user_id === user?.id) {
                      return { ...m, role: 'admin' };
                    }
                    return m;
                  }));
                  
                  // Update user's own role
                  setUserRole('admin');
                  
                  Alert.alert('Success', `Ownership transferred to ${selectedMember.username}`);
                } else {
                  Alert.alert('Error', 'Failed to transfer ownership');
                }
              } catch {
                console.error("Error transferring ownership: [details redacted]");
                Alert.alert('Error', 'Failed to transfer ownership');
              } finally {
                setActionLoading(false);
                setActionModalVisible(false);
                setSelectedMember(null);
              }
            }
          }
        ]
      );
      return;
    }
    
    try {
      setActionLoading(true);
      
      const success = await communityService.changeUserRole(id, selectedMember.user_id, newRole, user?.id);
      
      if (success) {
        // Update the local state
        setMembers(prev => prev.map(m => {
          if (m.user_id === selectedMember.user_id) {
            return { ...m, role: newRole };
          }
          return m;
        }));
        
        Alert.alert('Success', `${selectedMember.username}'s role has been changed to ${getRoleText(newRole)}`);
      } else {
        Alert.alert('Error', 'Failed to change member role');
      }
    } catch {
      console.error("Error changing member role: [details redacted]");
      Alert.alert('Error', 'Failed to change member role');
    } finally {
      setActionLoading(false);
      setActionModalVisible(false);
      setSelectedMember(null);
    }
  };
  
  const handleLeaveCommunity = async () => {
    if (!user) return;
    
    // If the user is the owner and there are other members, they need to transfer ownership first
    if (userRole === 'owner' && members.length > 1) {
      Alert.alert(
        'Transfer Ownership',
        'You are the owner of this community. You need to transfer ownership to another member before leaving.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'View Members',
            onPress: () => {
              // Close the modal and let them select a new owner
              setActionModalVisible(false);
              setSelectedMember(null);
            }
          }
        ]
      );
      return;
    }
    
    Alert.alert(
      'Leave Community',
      'Are you sure you want to leave this community?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Leave',
          onPress: async () => {
            try {
              setActionLoading(true);
              
              const success = await communityService.leaveCommunity(id, user?.id);
              
              if (success) {
                Alert.alert('Success', 'You have left the community');
                router.replace('/(tabs)');
              } else {
                Alert.alert('Error', 'Failed to leave the community');
              }
            } catch {
              console.error("Error leaving community: [details redacted]");
              Alert.alert('Error', 'Failed to leave the community');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const getMemberCount = () => {
    return `${members.length} ${members.length === 1 ? 'Member' : 'Members'}`;
  };
  
  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case 'owner':
        return <Crown size={16} color={colors.warning} />;
      case 'admin':
        return <Shield size={16} color={colors.primary} />;
      default:
        return <User size={16} color={colors.textSecondary} />;
    }
  };
  
  const getRoleText = (role: MemberRole) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      default:
        return 'Member';
    }
  };
  
  const renderMember = ({ item }: { item: CommunityMember }) => {
    const isCurrentUser = item.user_id === user?.id;
    const canManageThisMember = canManageMembers && 
                               !isCurrentUser && 
                               !(item.role === 'owner' && userRole !== 'owner');
    
    return (
      <View style={[styles.memberItem, { backgroundColor: colors.card }]}>
        <Avatar 
          name={item.username || 'User'} 
          size={40} 
          fontSize={16} 
        />
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: colors.text }]}>
            {item.username || 'Unknown User'}
            {isCurrentUser && ' (You)'}
          </Text>
          <View style={styles.roleContainer}>
            {getRoleIcon(item.role)}
            <Text style={[styles.roleText, { color: colors.textSecondary }]}>
              {getRoleText(item.role)}
            </Text>
          </View>
        </View>
        
        {canManageThisMember && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              setSelectedMember(item);
              setActionModalVisible(true);
            }}
          >
            <MoreVertical size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  useEffect(() => {
    if (!id || !user) return;
    
    loadCommunityData();
  }, [id, loadCommunityData, user]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Community Members
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {community?.name} • {getMemberCount()}
          </Text>
        </View>
      </View>
      
      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.roleInfoContainer}>
              <Text style={[styles.roleInfoTitle, { color: colors.text }]}>
                Roles
              </Text>
              <View style={styles.roleInfoItem}>
                <Crown size={16} color={colors.warning} />
                <Text style={[styles.roleInfoText, { color: colors.textSecondary }]}>
                  Owner - Can delete the community and manage all members
                </Text>
              </View>
              <View style={styles.roleInfoItem}>
                <Shield size={16} color={colors.primary} />
                <Text style={[styles.roleInfoText, { color: colors.textSecondary }]}>
                  Admin - Can manage members except the owner
                </Text>
              </View>
              <View style={styles.roleInfoItem}>
                <User size={16} color={colors.textSecondary} />
                <Text style={[styles.roleInfoText, { color: colors.textSecondary }]}>
                  Member - Can view and send messages
                </Text>
              </View>
            </View>
            
            {community?.type === 'private' && (
              <View style={[styles.inviteCodeContainer, { backgroundColor: colors.card }]}>
                <Text style={[styles.inviteCodeLabel, { color: colors.text }]}>
                  Invite Code
                </Text>
                <Text style={[styles.inviteCode, { color: colors.primary }]}>
                  {community.invite_code}
                </Text>
                <Text style={[styles.inviteCodeInfo, { color: colors.textSecondary }]}>
                  Share this code with others to invite them to this private community
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.leaveButton, { backgroundColor: colors.error }]}
              onPress={handleLeaveCommunity}
            >
              <Text style={styles.leaveButtonText}>Leave Community</Text>
            </TouchableOpacity>
          </View>
        }
      />
      
      {/* Member action modal */}
      <Modal
        visible={actionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setActionModalVisible(false);
          setSelectedMember(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedMember?.username}
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setActionModalVisible(false);
                  setSelectedMember(null);
                }}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Role actions */}
            {canManageMembers && selectedMember && selectedMember.role !== 'owner' && (
              <>
                <Text style={[styles.modalSectionTitle, { color: colors.textSecondary }]}>
                  Change Role
                </Text>
                <View style={styles.modalActions}>
                  {isOwner && (
                    <TouchableOpacity
                      style={[
                        styles.roleButton, 
                        { backgroundColor: colors.warning + '20' }
                      ]}
                      onPress={() => handleRoleChange('owner')}
                      disabled={actionLoading}
                    >
                      <Crown size={18} color={colors.warning} />
                      <Text style={[styles.roleButtonText, { color: colors.warning }]}>
                        Make Owner
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedMember.role !== 'admin' && (
                    <TouchableOpacity
                      style={[
                        styles.roleButton, 
                        { backgroundColor: colors.primary + '20' }
                      ]}
                      onPress={() => handleRoleChange('admin')}
                      disabled={actionLoading}
                    >
                      <Shield size={18} color={colors.primary} />
                      <Text style={[styles.roleButtonText, { color: colors.primary }]}>
                        Make Admin
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedMember.role !== 'member' && (
                    <TouchableOpacity
                      style={[
                        styles.roleButton, 
                        { backgroundColor: colors.textSecondary + '20' }
                      ]}
                      onPress={() => handleRoleChange('member')}
                      disabled={actionLoading}
                    >
                      <User size={18} color={colors.textSecondary} />
                      <Text style={[styles.roleButtonText, { color: colors.textSecondary }]}>
                        Make Member
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
            
            {/* Remove action */}
            {canManageMembers && selectedMember && selectedMember.role !== 'owner' && (
              <>
                <Text style={[styles.modalSectionTitle, { color: colors.textSecondary }]}>
                  Actions
                </Text>
                <TouchableOpacity
                  style={[
                    styles.actionButton, 
                    { backgroundColor: colors.error + '20' }
                  ]}
                  onPress={handleRemoveMember}
                  disabled={actionLoading}
                >
                  <UserMinus size={18} color={colors.error} />
                  <Text style={[styles.actionButtonText, { color: colors.error }]}>
                    Remove from Community
                  </Text>
                </TouchableOpacity>
              </>
            )}
            
            {actionLoading && (
              <ActivityIndicator 
                style={styles.actionLoader} 
                color={colors.primary} 
              />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
  },
  list: {
    padding: 16,
  },
  listHeader: {
    marginBottom: 16,
  },
  roleInfoContainer: {
    marginBottom: 24,
  },
  roleInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  roleInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleInfoText: {
    marginLeft: 8,
    fontSize: 14,
  },
  inviteCodeContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  inviteCodeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inviteCode: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
  },
  inviteCodeInfo: {
    fontSize: 14,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 14,
    marginLeft: 4,
  },
  actionButton: {
    padding: 8,
  },
  leaveButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '90%',
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSectionTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  modalActions: {
    marginBottom: 16,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  roleButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  actionButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  actionLoader: {
    marginTop: 16,
  }
}); 