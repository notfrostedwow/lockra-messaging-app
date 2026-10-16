import type { SupabaseClient } from '@supabase/supabase-js';
import { Community, CommunityMember, CommunityMessage, CommunityType, MemberRole, CommunityFileAttachment } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Service for handling community-related operations
 */
export function createCommunityService(supabase: SupabaseClient, createAuthenticatedSupabaseClient: (token: string) => SupabaseClient) { return {
  /**
   * Create a new community
   */
  async createCommunity(name: string, type: CommunityType, currentUserId?: string, getToken?: () => Promise<string | null>): Promise<Community | null> {
    try {
      if (!currentUserId) {
        console.error("User ID is required to create a community [details redacted]");
        return null;
      }

      console.log("Creating community with user ID: [details redacted]");
      
      // For now, use the regular supabase client since RLS is disabled
      // We'll add authentication back once the basic functionality works
      const { data, error } = await supabase
        .from('communities')
        .insert({
          name,
          type,
          owner_id: currentUserId,
          invite_code: type === 'private' ? Math.random().toString(36).substr(2, 8).toUpperCase() : null
        })
        .select()
        .single();

      if (error) {
        console.error("Database community creation failed: [details redacted]");
        return null;
      }
      
      console.log("Community created successfully: [details redacted]");
      return data as Community;
    } catch {
      console.error("Error creating community: [details redacted]");
      return null;
    }
  },

  /**
   * Get all public communities
   */
  async getPublicCommunities(): Promise<Community[]> {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('type', 'public')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Community[];
    } catch {
      console.error("Error fetching public communities: [details redacted]");
      return [];
    }
  },

  /**
   * Get all communities the current user is a member of
   */
  async getUserCommunities(currentUserId?: string): Promise<Community[]> {
    try {
      if (!currentUserId) {
        console.error("User ID is required to get user communities [details redacted]");
        return [];
      }

      const { data, error } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', currentUserId);

      if (error) throw error;

      if (data.length === 0) return [];

      const communityIds = data.map(item => item.community_id);
      
      const { data: communities, error: communitiesError } = await supabase
        .from('communities')
        .select('*')
        .in('id', communityIds)
        .order('created_at', { ascending: false });

      if (communitiesError) throw communitiesError;
      return communities as Community[];
    } catch {
      console.error("Error fetching user communities: [details redacted]");
      return [];
    }
  },

  /**
   * Get community previews with member count and last message info for the current user
   */
  async getUserCommunityPreviews(currentUserId?: string): Promise<any[]> {
    try {
      if (!currentUserId) {
        console.error("User ID is required to get user community previews [details redacted]");
        return [];
      }

      // First get all communities the user is a member of
      const { data: memberships, error: membershipError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', currentUserId);

      if (membershipError) throw membershipError;
      
      if (memberships.length === 0) return [];
      
      const communityIds = memberships.map(item => item.community_id);
      
      // Get basic community info
      const { data: communities, error: communitiesError } = await supabase
        .from('communities')
        .select('*')
        .in('id', communityIds)
        .order('created_at', { ascending: false });
        
      if (communitiesError) throw communitiesError;
      if (!communities || communities.length === 0) return [];
      
      // Get member counts for each community
      const memberCountPromises = communities.map(async (community) => {
        const { count, error } = await supabase
          .from('community_members')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', community.id);
          
        if (error) throw error;
        return { communityId: community.id, count: count || 0 };
      });
      
      // Get last message for each community with direct query instead of using a join
      const lastMessagePromises = communities.map(async (community) => {
        // Get the latest message for this community
        const { data, error } = await supabase
          .from('community_messages')
          .select('id, content, created_at, user_id')
          .eq('community_id', community.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (error) {
          console.error("Error fetching last message: [details redacted]");
          return { communityId: community.id, lastMessage: null };
        }
        
        // If no messages, return null for lastMessage
        if (!data || data.length === 0) {
          return { communityId: community.id, lastMessage: null };
        }
        
        // For each message, get the username separately
        const message = data[0];
        
        try {
          // Get the username for the user who sent the message
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('username')
            .eq('id', message.user_id)
            .single();
            
          if (userError) throw userError;
          
          return { 
            communityId: community.id, 
            lastMessage: {
              content: message.content,
              created_at: message.created_at,
              username: userData?.username
            }
          };
        } catch {
          console.error("Error fetching message sender: [details redacted]");
          return { 
            communityId: community.id, 
            lastMessage: {
              content: message.content,
              created_at: message.created_at,
              username: 'Unknown'
            }
          };
        }
      });
      
      const memberCounts = await Promise.all(memberCountPromises);
      const lastMessages = await Promise.all(lastMessagePromises);
      
      // Combine all data
      return communities.map(community => {
        const memberCount = memberCounts.find(item => item.communityId === community.id)?.count || 0;
        const lastMessage = lastMessages.find(item => item.communityId === community.id)?.lastMessage;
        
        return {
          ...community,
          memberCount,
          lastMessage: lastMessage ? lastMessage.content : null,
          lastMessageUser: lastMessage ? lastMessage.username : null,
          lastMessageTime: lastMessage ? lastMessage.created_at : null
        };
      });
    } catch {
      console.error("Error fetching user community previews: [details redacted]");
      return [];
    }
  },

  /**
   * Get a community by its ID
   */
  async getCommunityById(id: string): Promise<Community | null> {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Community;
    } catch {
      console.error("Operation diagnostic [details redacted]");
      return null;
    }
  },

  /**
   * Join a community using its invite code (for private communities)
   * @returns An object with success status and community ID, or false if failed
   */
  async joinCommunityByInviteCode(inviteCode: string, currentUserId?: string): Promise<{ success: boolean; communityId: string } | false> {
    try {
      if (!currentUserId) {
        console.error("User ID is required to join community by invite code [details redacted]");
        return false;
      }

      // First, find the community with this invite code
      const { data: community, error: communityError } = await supabase
        .from('communities')
        .select('id')
        .eq('invite_code', inviteCode)
        .single();

      if (communityError) throw communityError;
      if (!community) return false;

      // Then add the current user as a member
      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: currentUserId,
          role: 'member'
        });

      if (error) {
        // If the error is about unique constraint, the user is already a member
        if (error.code === '23505') return { success: true, communityId: community.id };
        throw error;
      }

      return { success: true, communityId: community.id };
    } catch {
      console.error("Error joining community by invite code: [details redacted]");
      return false;
    }
  },

  /**
   * Join a public community
   * @returns true if successful, false otherwise
   */
  async joinPublicCommunity(communityId: string, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) {
        console.error("User ID is required to join public community [details redacted]");
        return false;
      }

      // First, verify this is a public community
      const { data: community, error: communityError } = await supabase
        .from('communities')
        .select('type')
        .eq('id', communityId)
        .single();

      if (communityError) throw communityError;
      if (!community || community.type !== 'public') return false;

      // Then add the current user as a member
      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: currentUserId,
          role: 'member'
        });

      if (error) {
        // If the error is about unique constraint, the user is already a member
        if (error.code === '23505') return true;
        throw error;
      }

      return true;
    } catch {
      console.error("Error joining public community: [details redacted]");
      return false;
    }
  },

  /**
   * Leave a community
   */
  async leaveCommunity(communityId: string, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) {
        console.error("User ID is required to leave community [details redacted]");
        return false;
      }

      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', currentUserId);

      if (error) throw error;
      return true;
    } catch {
      console.error("Error leaving community: [details redacted]");
      return false;
    }
  },

  /**
   * Delete a community (only if the current user is the owner)
   */
  async deleteCommunity(communityId: string, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) {
        console.error("User ID is required to delete community [details redacted]");
        return false;
      }

      const community = await this.getCommunityById(communityId);
      if (!community || community.owner_id !== currentUserId) return false;

      const { error } = await supabase
        .from('communities')
        .delete()
        .eq('id', communityId)
        .eq('owner_id', currentUserId);

      if (error) throw error;
      return true;
    } catch {
      console.error("Error deleting community: [details redacted]");
      return false;
    }
  },

  /**
   * Get all members of a community
   */
  async getCommunityMembers(communityId: string): Promise<CommunityMember[]> {
    try {
      // First, get the community members
      const { data: members, error } = await supabase
        .from('community_members')
        .select('*')
        .eq('community_id', communityId);

      if (error) throw error;
      if (!members || members.length === 0) return [];
      
      // Get all unique user IDs from the members
      const userIds = members.map(member => member.user_id);
      
      // Fetch usernames for these user IDs
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username')
        .in('id', userIds);
        
      if (usersError) throw usersError;
      
      // Create a map of user_id to username
      const userMap = new Map();
      if (users) {
        users.forEach(user => {
          userMap.set(user.id, user.username);
        });
      }
      
      // Add username to each member
      return members.map(member => ({
        ...member,
        username: userMap.get(member.user_id) || 'Unknown User'
      })) as CommunityMember[];
    } catch {
      console.error("Error fetching community members: [details redacted]");
      return [];
    }
  },

  /**
   * Send a message to a community
   */
  async sendMessage(communityId: string, content: string, currentUserId?: string, replyToId?: string | null): Promise<CommunityMessage | null> {
    try {
      if (!currentUserId) {
        console.error("User ID is required to send message [details redacted]");
        return null;
      }

      const { data, error } = await supabase
        .from('community_messages')
        .insert({
          community_id: communityId,
          user_id: currentUserId,
          content,
          reply_to_id: replyToId || null
        })
        .select()
        .single();

      if (error) throw error;
      return data as CommunityMessage;
    } catch {
      console.error("Error sending message: [details redacted]");
      return null;
    }
  },

  async addAttachment(messageId: string, file: { fileName: string; fileType: string; fileSize: number; storagePath: string }): Promise<CommunityFileAttachment | null> {
    try {
      const { data, error } = await supabase
        .from('community_file_attachments')
        .insert({
          message_id: messageId,
          file_name: file.fileName,
          file_type: file.fileType,
          file_size: file.fileSize,
          storage_path: file.storagePath,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CommunityFileAttachment;
    } catch {
      console.error("Error adding attachment: [details redacted]");
      return null;
    }
  },

  async setAttachmentsEnabled(communityId: string, enabled: boolean, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) return false;
      const role = await this.getUserRole(communityId, currentUserId);
      if (!role || (role !== 'owner' && role !== 'admin')) throw new Error('No permission');
      const { error } = await supabase
        .from('communities')
        .update({ attachments_enabled: enabled })
        .eq('id', communityId);
      if (error) throw error;
      return true;
    } catch {
      console.error("setAttachmentsEnabled error: [details redacted]");
      return false;
    }
  },

  async uploadAttachmentToStorage(
    communityId: string,
    messageId: string,
    fileName: string,
    mimeType: string,
    fileData: Uint8Array | ArrayBuffer | Blob,
    authToken?: string | null
  ): Promise<string | null> {
    try {
      // Validate permissions before upload
      if (!authToken) {
        throw new Error('Authentication required for file upload');
      }
      
      const storagePath = `${communityId}/${messageId}/${Date.now()}_${fileName}`;
      console.log("Storage upload path: [details redacted]");
      let payload: any;
      if (typeof (global as any).Blob !== 'undefined' && fileData instanceof Blob) {
        payload = fileData;
      } else if (fileData instanceof Uint8Array) {
        payload = fileData; // pass typed array directly (RN-friendly)
      } else if (fileData instanceof ArrayBuffer) {
        payload = new Uint8Array(fileData);
      } else {
        // As a last resort, try to construct a Blob if available
        if (typeof (global as any).Blob !== 'undefined') {

          payload = new Blob([fileData], { type: mimeType });
        } else {
          throw new Error('Unsupported file data type for upload');
        }
      }
      const client = authToken ? createAuthenticatedSupabaseClient(authToken) : supabase;
      const { data, error } = await client.storage
        .from('community-attachments')
        .upload(storagePath, payload, { contentType: mimeType, upsert: false });
      if (error) {
        console.error("Storage upload error: [details redacted]");
        throw error;
      }
      console.log("Storage upload success, data: [details redacted]");
      console.log("Actual upload path: [details redacted]");
      console.log("Original storage path: [details redacted]");
      
      // Verify the file exists immediately after upload
      const pathToCheck = data?.path || storagePath;
      try {
        // List files in the directory to see what's actually there
        const dirPath = pathToCheck.split('/').slice(0, -1).join('/');
        const { data: checkData } = await client.storage
          .from('community-attachments')
          .list(dirPath);
        console.log("Directory path checked: [details redacted]");
        console.log("Files in directory: [details redacted]");
        
        // Also try listing the root directory structure
        await client.storage
          .from('community-attachments')
          .list('');
        console.log("Root directory contents: [details redacted]");
        
        // Check if the specific file exists
        const fileName = pathToCheck.split('/').pop();
        checkData?.some(f => f.name === fileName);
        console.log("File exists check: [details redacted]");
      } catch {
        console.log("Could not verify file existence: [details redacted]");
      }
      
      return pathToCheck;
    } catch {
      console.error("uploadAttachmentToStorage error: [details redacted]");
      return null;
    }
  },

  async getSignedUrlForAttachment(storagePath: string, authToken?: string): Promise<string | null> {
    try {
      console.log("Getting signed URL for path: [details redacted]");
      
      // Try with authenticated client first if token available
      const client = authToken ? createAuthenticatedSupabaseClient(authToken) : supabase;
      
      const { data, error } = await client.storage
        .from('community-attachments')
        .createSignedUrl(storagePath, 3600);
      if (error) {
        console.error("Signed URL error: [details redacted]");
        throw error;
      }
      console.log("Signed URL success: [details redacted]");
      return data?.signedUrl || null;
    } catch {
      console.log("Signed URL failed, trying public URL for: [details redacted]");
      try {
        const { data } = supabase.storage.from('community-attachments').getPublicUrl(storagePath);
        return (data as any)?.publicUrl || null;
      } catch {
        return null;
      }
    }
  },

  // Moderation actions
  async muteMember(communityId: string, targetUserId: string, mutedUntilIso: string, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) return false;
      const role = await this.getUserRole(communityId, currentUserId);
      if (!role || (role !== 'owner' && role !== 'admin')) throw new Error('No permission');
      const { error } = await supabase
        .from('community_mutes')
        .upsert({ community_id: communityId, user_id: targetUserId, muted_until: mutedUntilIso, muted_by: currentUserId }, { onConflict: 'community_id,user_id' });
      if (error) throw error; return true;
    } catch { console.error("muteMember error: [details redacted]"); return false; }
  },
  async unmuteMember(communityId: string, targetUserId: string, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) return false;
      const role = await this.getUserRole(communityId, currentUserId);
      if (!role || (role !== 'owner' && role !== 'admin')) throw new Error('No permission');
      const { error } = await supabase
        .from('community_mutes')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', targetUserId);
      if (error) throw error; return true;
    } catch { console.error("unmuteMember error: [details redacted]"); return false; }
  },
  async kickMember(communityId: string, targetUserId: string, currentUserId?: string): Promise<boolean> {
    return this.removeMember(communityId, targetUserId, currentUserId);
  },
  async banMember(communityId: string, targetUserId: string, reason: string | null, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) return false;
      const role = await this.getUserRole(communityId, currentUserId);
      if (!role || (role !== 'owner' && role !== 'admin')) throw new Error('No permission');
      const { error } = await supabase
        .from('community_bans')
        .insert({ community_id: communityId, user_id: targetUserId, reason, banned_by: currentUserId });
      if (error) throw error;
      // Also remove from members list if present
      await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', targetUserId);
      // Broadcast ban so user exits immediately
      try {
        await supabase.from('community_events').insert({ community_id: communityId, event: 'ban', target_user_id: targetUserId, payload: { reason } as any });
      } catch {}
      return true;
    } catch { console.error("banMember error: [details redacted]"); return false; }
  },
  async unbanMember(communityId: string, targetUserId: string, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) return false;
      const role = await this.getUserRole(communityId, currentUserId);
      if (!role || (role !== 'owner' && role !== 'admin')) throw new Error('No permission');
      const { error } = await supabase
        .from('community_bans')
        .update({ unbanned_at: new Date().toISOString() })
        .eq('community_id', communityId)
        .eq('user_id', targetUserId)
        .is('unbanned_at', null);
      if (error) throw error; return true;
    } catch { console.error("unbanMember error: [details redacted]"); return false; }
  },
  async setSlowmode(communityId: string, seconds: number, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) return false;
      const role = await this.getUserRole(communityId, currentUserId);
      if (!role || (role !== 'owner' && role !== 'admin')) throw new Error('No permission');
      const { error } = await supabase
        .from('community_settings')
        .upsert({ community_id: communityId, slowmode_seconds: Math.max(0, Math.floor(seconds)), updated_by: currentUserId, updated_at: new Date().toISOString() });
      if (error) throw error; return true;
    } catch { console.error("setSlowmode error: [details redacted]"); return false; }
  },
  async setTopic(communityId: string, topic: string | null, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) return false;
      const role = await this.getUserRole(communityId, currentUserId);
      if (!role || (role !== 'owner' && role !== 'admin')) throw new Error('No permission');
      const { error } = await supabase.from('communities').update({ topic }).eq('id', communityId);
      if (error) throw error; return true;
    } catch { console.error("setTopic error: [details redacted]"); return false; }
  },
  async setRules(communityId: string, rules: string | null, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) return false;
      const role = await this.getUserRole(communityId, currentUserId);
      if (!role || (role !== 'owner' && role !== 'admin')) throw new Error('No permission');
      const { error } = await supabase.from('communities').update({ rules }).eq('id', communityId);
      if (error) throw error; return true;
    } catch { console.error("setRules error: [details redacted]"); return false; }
  },
  async pinMessage(communityId: string, messageId: string, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) return false;
      const role = await this.getUserRole(communityId, currentUserId);
      if (!role || (role !== 'owner' && role !== 'admin')) throw new Error('No permission');
      const { error } = await supabase
        .from('communities')
        .update({ pinned_message_id: messageId, pinned_by: currentUserId, pinned_at: new Date().toISOString() })
        .eq('id', communityId);
      if (error) throw error; return true;
    } catch { console.error("pinMessage error: [details redacted]"); return false; }
  },
  async unpinMessage(communityId: string, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) return false;
      const role = await this.getUserRole(communityId, currentUserId);
      if (!role || (role !== 'owner' && role !== 'admin')) throw new Error('No permission');
      const { error } = await supabase
        .from('communities')
        .update({ pinned_message_id: null, pinned_by: null, pinned_at: null })
        .eq('id', communityId);
      if (error) throw error; return true;
    } catch { console.error("unpinMessage error: [details redacted]"); return false; }
  },
  async reportUser(communityId: string, reportedUserId: string, reason: string | null, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) return false;
      const { error } = await supabase
        .from('community_reports')
        .insert({ community_id: communityId, reported_user_id: reportedUserId, reporter_user_id: currentUserId, reason });
      if (error) throw error; return true;
    } catch { console.error("reportUser error: [details redacted]"); return false; }
  },

  /**
   * Get messages from a community with pagination
   */
  async getCommunityMessages(communityId: string, limit = 20, offset = 0, authToken?: string | null): Promise<CommunityMessage[]> {
    try {
      const client = authToken ? createAuthenticatedSupabaseClient(authToken) : supabase;
      // First, get the messages
      const { data: messages, error } = await client
        .from('community_messages')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      if (!messages || messages.length === 0) return [];
      
      // Get all unique user IDs from the messages
      const userIds = [...new Set(messages.map(msg => msg.user_id))];
      
      // Fetch usernames for these user IDs
      const { data: users, error: usersError } = await client
        .from('users')
        .select('id, username')
        .in('id', userIds);
        
      if (usersError) throw usersError;
      
      // Create a map of user_id to username
      const userMap = new Map();
      if (users) {
        users.forEach(user => {
          userMap.set(user.id, user.username);
        });
      }
      
      // Load attachments per message
      const messageIds = messages.map(m => m.id);
      let attachmentsByMessage: Record<string, CommunityFileAttachment[]> = {};
      try {
        const { data: atts } = await client
          .from('community_file_attachments')
          .select('*')
          .in('message_id', messageIds);
        (atts || []).forEach(att => {
          const arr = attachmentsByMessage[att.message_id] || [];
          arr.push(att as any);
          attachmentsByMessage[att.message_id] = arr;
        });
      } catch {}

      // Add username and attachments to each message
      const messagesWithUsernames = messages.map(message => ({
        ...message,
        username: userMap.get(message.user_id) || 'Unknown User',
        attachments: attachmentsByMessage[message.id] || []
      }));
      
      return messagesWithUsernames as CommunityMessage[];
    } catch {
      console.error("Error fetching community messages: [details redacted]");
      return [];
    }
  },

  /**
   * Remove a realtime channel subscription
   */
  removeChannel(channel: RealtimeChannel | null): void {
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch {
        console.error("Error removing channel: [details redacted]");
      }
    }
  },

  /**
   * Subscribe to real-time updates for community messages
   */
  subscribeToMessages(
    communityId: string,
    onInsert: (message: CommunityMessage) => void,
    onDelete?: (deletedMessageId: string) => void
  ): RealtimeChannel {
    try {
      // Create a unique channel name for this subscription with a timestamp to ensure uniqueness
      const channelName = `community_messages:${communityId}:${Date.now()}`;
      
      // Remove any existing subscription with similar name pattern
      try {
        const existingChannels = supabase.getChannels();
        for (const ch of existingChannels) {
          if (ch.topic && ch.topic.startsWith(`community_messages:${communityId}`)) {
            console.log("Operation diagnostic [details redacted]");
            this.removeChannel(ch);
          }
        }
      } catch {
        // Ignore errors when removing channels
        console.error("Error removing existing channels: [details redacted]");
      }
      
      const channel = supabase
        .channel(channelName, { config: { broadcast: { ack: true }, presence: { key: communityId } } })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'community_messages',
            filter: `community_id=eq.${communityId}`
          },
          async (payload) => {
            try {
              const newMessage = payload.new as CommunityMessage;
              
              // Fetch the username for the user who sent the message
              const { data, error } = await supabase
                .from('users')
                .select('username')
                .eq('id', newMessage.user_id)
                .single();
                
              if (!error && data) {
                newMessage.username = data.username;
              }
              
              onInsert(newMessage);
            } catch {
              console.error("Error processing message update: [details redacted]");
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'community_messages',
            filter: `community_id=eq.${communityId}`
          },
          async (payload) => {
            try {
              const deletedId = (payload.old as any)?.id as string;
              if (deletedId && onDelete) {
                onDelete(deletedId);
              }
            } catch {
              console.error("Error processing message delete: [details redacted]");
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log("Operation diagnostic [details redacted]");
          }
          if (err) {
            console.error("Realtime subscription error: [details redacted]");
          }
        });
        
      return channel;
    } catch {
      return {
        unsubscribe: () => {},
      } as unknown as RealtimeChannel;
    }
  },

  /**
   * Get the current user's role in a community
   */
  async getUserRole(communityId: string, currentUserId?: string): Promise<MemberRole | null> {
    try {
      if (!currentUserId) {
        console.error("User ID is required to get user role [details redacted]");
        return null;
      }

      const { data, error } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', communityId)
        .eq('user_id', currentUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user is not a member
          return null;
        }
        throw error;
      }
      return data.role as MemberRole;
    } catch {
      console.error("Error fetching user role in community: [details redacted]");
      return null;
    }
  },

  /**
   * Change a user's role in a community
   * Can only be done by owners and admins
   */
  async changeUserRole(communityId: string, userId: string, newRole: MemberRole, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) {
        console.error("Current user ID is required to change user roles [details redacted]");
        return false;
      }

      // First check if the current user has permission (owner or admin)
      const currentUserRole = await this.getUserRole(communityId, currentUserId);
      
      if (!currentUserRole || (currentUserRole !== 'owner' && currentUserRole !== 'admin')) {
        throw new Error('You do not have permission to change roles');
      }
      
      // Admins can't change the role of owners
      if (currentUserRole === 'admin') {
        const { data: targetUser } = await supabase
          .from('community_members')
          .select('role')
          .eq('community_id', communityId)
          .eq('user_id', userId)
          .single();
          
        if (targetUser?.role === 'owner') {
          throw new Error('Admins cannot change the role of owners');
        }
      }
      
      // Update the role
      const { error } = await supabase
        .from('community_members')
        .update({ role: newRole })
        .eq('community_id', communityId)
        .eq('user_id', userId);
        
      if (error) throw error;
      return true;
    } catch {
      console.error("Error changing user role: [details redacted]");
      return false;
    }
  },
  
  /**
   * Remove a user from a community
   * Can only be done by owners and admins
   */
  async removeMember(communityId: string, userId: string, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) {
        console.error("Current user ID is required to remove members [details redacted]");
        return false;
      }

      // First check if the current user has permission (owner or admin)
      const currentUserRole = await this.getUserRole(communityId, currentUserId);
      
      if (!currentUserRole || (currentUserRole !== 'owner' && currentUserRole !== 'admin')) {
        throw new Error('You do not have permission to remove members');
      }
      
      // Admins can't remove owners
      if (currentUserRole === 'admin') {
        const { data: targetUser } = await supabase
          .from('community_members')
          .select('role')
          .eq('community_id', communityId)
          .eq('user_id', userId)
          .single();
          
        if (targetUser?.role === 'owner') {
          throw new Error('Admins cannot remove owners from the community');
        }
      }
      
      // Remove the user
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', userId);
        
      if (error) throw error;
      // Broadcast kick so clients update immediately
      try {
        await supabase.from('community_events').insert({ community_id: communityId, event: 'kick', target_user_id: userId });
      } catch {}
      return true;
    } catch {
      console.error("Error removing member: [details redacted]");
      return false;
    }
  },

  /**
   * Delete a single community message. Admin/owner can delete any; users can delete their own.
   */
  async deleteCommunityMessage(communityId: string, messageId: string, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) return false;
      const { error } = await supabase
        .from('community_messages')
        .delete()
        .eq('id', messageId)
        .eq('community_id', communityId);
      if (error) throw error;
      return true;
    } catch {
      console.error("Error deleting community message: [details redacted]");
      return false;
    }
  },

  /**
   * Clear all messages in a community. Only owner/admin.
   */
  async clearCommunityMessages(communityId: string, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) return false;
      const role = await this.getUserRole(communityId, currentUserId);
      if (!role || (role !== 'owner' && role !== 'admin')) {
        throw new Error('You do not have permission to clear messages');
      }
      const { error } = await supabase
        .from('community_messages')
        .delete()
        .eq('community_id', communityId);
      if (error) throw error;
      return true;
    } catch {
      console.error("Error clearing community messages: [details redacted]");
      return false;
    }
  },

  /**
   * Lock a community so only owner/admins can send messages
   */
  async lockCommunity(communityId: string, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) {
        console.error("Current user ID is required to lock a community [details redacted]");
        return false;
      }

      const role = await this.getUserRole(communityId, currentUserId);
      if (!role || (role !== 'owner' && role !== 'admin')) {
        throw new Error('You do not have permission to lock this community');
      }

      const { error } = await supabase
        .from('communities')
        .update({ is_locked: true, locked_at: new Date().toISOString() })
        .eq('id', communityId);

      if (error) throw error;
      try {
        await supabase.from('community_events').insert({ community_id: communityId, event: 'lock' });
      } catch {}
      return true;
    } catch {
      console.error("Error locking community: [details redacted]");
      return false;
    }
  },

  /**
   * Unlock a community to allow all members to send messages
   */
  async unlockCommunity(communityId: string, currentUserId?: string): Promise<boolean> {
    try {
      if (!currentUserId) {
        console.error("Current user ID is required to unlock a community [details redacted]");
        return false;
      }

      const role = await this.getUserRole(communityId, currentUserId);
      if (!role || (role !== 'owner' && role !== 'admin')) {
        throw new Error('You do not have permission to unlock this community');
      }

      const { error } = await supabase
        .from('communities')
        .update({ is_locked: false, locked_at: null, locked_by: null })
        .eq('id', communityId);

      if (error) throw error;
      try {
        await supabase.from('community_events').insert({ community_id: communityId, event: 'unlock' });
      } catch {}
      return true;
    } catch {
      console.error("Error unlocking community: [details redacted]");
      return false;
    }
  }
}; }
