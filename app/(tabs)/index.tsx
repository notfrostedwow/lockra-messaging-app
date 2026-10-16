import { useStableEvent } from '@/hooks/useStableEvent';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { communityService } from '@/lib/communityService';
import { Avatar } from '../../components/ui/Avatar';
import { formatChatTimestamp } from '../../lib/utils';
import { CirclePlus as PlusCircle, Search, Globe, Lock } from 'lucide-react-native';



interface ChatPreview {
  id: string;
  username: string;
  lastMessage: string;
  timestamp: string;
  hasUnread: boolean;
  unreadCount: number;
  isIncoming?: boolean;
  isCommunity?: boolean;
  type?: 'public' | 'private';
  memberCount?: number;
}

// Add sections for different types of chats
type Section = {
  title: string;
  data: ChatPreview[];
};

export default function ChatList() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, loading: authLoading } = useAuth();
  
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [communitiesPreview, setCommunitiesPreview] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const flatListRef = useRef<FlatList>(null);
  
  // Show all items in a single list but with section headers
  const sectionsData: Section[] = [
    {
      title: 'Communities',
      data: communitiesPreview
    },
    {
      title: 'Direct Messages',
      data: chatPreviews
    }
  ];

  // Add a focus effect to refresh the communities list and chat previews when the tab is focused
  

  // Auto-refresh communities every 30 seconds in the background
  

  // Function to fetch user's communities
  const fetchUserCommunities = useStableEvent(async () => {
    if (!user?.id) {
      console.log("No user ID available for fetching communities [details redacted]");
      return;
    }
    
    try {
      const userCommunities = await communityService.getUserCommunityPreviews(user.id);
      if (userCommunities && userCommunities.length > 0) {
        const communityPreviews = userCommunities.map(community => ({
          id: community.id,
          username: community.name,
          lastMessage: community.lastMessage || 'No messages yet',
          timestamp: community.lastMessageTime || community.created_at,
          hasUnread: false, // TODO: Implement unread counts for communities
          unreadCount: 0,
          isCommunity: true,
          type: community.type,
          memberCount: community.memberCount
        }));
        
        setCommunitiesPreview(communityPreviews);
      } else {
        setCommunitiesPreview([]);
      }
    } catch {
      console.error("Error fetching user communities: [details redacted]");
    }
  });

  // Function to refresh chat previews (used when returning from chat screens)
  const refreshChatPreviews = useStableEvent(async () => {
    if (!user?.id) return;

    try {
      // Fetch messages where user is sender or receiver
      const { data: sentMessages, error: sentError } = await supabase
        .from('messages')
        .select('id, content, timestamp, receiver_username')
        .eq('sender_id', user.id)
        .order('timestamp', { ascending: false })
        .range(0, pageSize - 1);

      if (sentError) throw sentError;

      const { data: receivedMessages, error: receivedError } = await supabase
        .from('messages')
        .select('id, content, timestamp, sender_id, read')
        .eq('receiver_username', user.username)
        .order('timestamp', { ascending: false })
        .range(0, pageSize - 1);

      if (receivedError) throw receivedError;

      // Get unique users from messages
      const uniqueUsers = new Map<string, ChatPreview>();

      // Process received messages and get user details first
      if (receivedMessages && receivedMessages.length > 0) {
        // Get usernames for senders
        const senderIds = receivedMessages.map((msg) => msg.sender_id);
        const { data: senders, error: sendersError } = await supabase
          .from('users')
          .select('id, username')
          .in('id', senderIds);

        if (sendersError) throw sendersError;

        // Create a map of sender_id to username
        const senderMap = new Map();
        if (senders) {
          senders.forEach((sender) => {
            senderMap.set(sender.id, sender.username);
          });
        }

        // Group messages by sender
        const messagesBySender = new Map();
        receivedMessages.forEach(message => {
          const senderUsername = senderMap.get(message.sender_id);
          if (senderUsername) {
            if (!messagesBySender.has(senderUsername)) {
              messagesBySender.set(senderUsername, []);
            }
            messagesBySender.get(senderUsername).push(message);
          }
        });

        // Process each sender's messages
        for (const [senderUsername, messages] of messagesBySender) {
          // Count unread messages
          const unreadMessages = messages.filter((msg: { read: boolean }) => !msg.read);
          const latestMessage = messages[0];
          
          uniqueUsers.set(senderUsername, {
            id: latestMessage.id,
            username: senderUsername,
            lastMessage: latestMessage.content,
            timestamp: latestMessage.timestamp,
            hasUnread: unreadMessages.length > 0,
            unreadCount: unreadMessages.length,
            isIncoming: true
          });
        }
      }

      // Process sent messages after, to ensure we don't overwrite unread counts
      if (sentMessages) {
        for (const message of sentMessages) {
          if (!uniqueUsers.has(message.receiver_username)) {
            uniqueUsers.set(message.receiver_username, {
              id: message.id,
              username: message.receiver_username,
              lastMessage: message.content,
              timestamp: message.timestamp,
              hasUnread: false,
              unreadCount: 0,
              isIncoming: false
            });
          } else {
            // Update timestamp and last message if this sent message is more recent
            const existing = uniqueUsers.get(message.receiver_username)!;
            if (new Date(message.timestamp) > new Date(existing.timestamp)) {
              uniqueUsers.set(message.receiver_username, {
                ...existing,
                id: message.id,
                lastMessage: message.content,
                timestamp: message.timestamp,
                isIncoming: false
                // Keep the existing unread status since this is a sent message
              });
            }
          }
        }
      }

      // Convert map to array and sort by timestamp
      const chats = Array.from(uniqueUsers.values()).sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      setChatPreviews(chats);
    } catch {
      console.error("Error refreshing chat previews: [details redacted]");
    }
  });

  

  // Separate effect for pagination
  

  const handleChatPress = async (item: ChatPreview) => {
    // Navigate to the appropriate chat screen
    if (item.isCommunity) {
      router.push(`/community/${item.id}`);
    } else {
      router.push(`/chat/${item.username}`);
    }
  };

  const handleNewChatPress = () => {
    router.push('/new-chat');
  };

  const loadMoreMessages = () => {
    if (hasMoreMessages && !loadingMore && !loading) {
      setLoadingMore(true);
      setPage(prevPage => prevPage + 1);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    
    try {
      // Refresh communities
      await fetchUserCommunities();
      
      // Refresh direct messages by re-running the same logic as the main effect
      if (user) {
        // Fetch messages where user is sender or receiver
        const { data: sentMessages, error: sentError } = await supabase
          .from('messages')
          .select('id, content, timestamp, receiver_username')
          .eq('sender_id', user.id)
          .order('timestamp', { ascending: false })
          .range(0, pageSize - 1);

        if (sentError) throw sentError;

        const { data: receivedMessages, error: receivedError } = await supabase
          .from('messages')
          .select('id, content, timestamp, sender_id, read')
          .eq('receiver_username', user.username)
          .order('timestamp', { ascending: false })
          .range(0, pageSize - 1);

        if (receivedError) throw receivedError;
        
        // Check if there are more messages to load
        setHasMoreMessages((sentMessages?.length || 0) + (receivedMessages?.length || 0) >= pageSize);

        // Get unique users from messages
        const uniqueUsers = new Map<string, ChatPreview>();

        // Process received messages and get user details first
        if (receivedMessages && receivedMessages.length > 0) {
          // Get usernames for senders
          const senderIds = receivedMessages.map((msg) => msg.sender_id);
          const { data: senders, error: sendersError } = await supabase
            .from('users')
            .select('id, username')
            .in('id', senderIds);

          if (sendersError) throw sendersError;

          // Create a map of sender_id to username
          const senderMap = new Map();
          if (senders) {
            senders.forEach((sender) => {
              senderMap.set(sender.id, sender.username);
            });
          }

          // Group messages by sender
          const messagesBySender = new Map();
          receivedMessages.forEach(message => {
            const senderUsername = senderMap.get(message.sender_id);
            if (senderUsername) {
              if (!messagesBySender.has(senderUsername)) {
                messagesBySender.set(senderUsername, []);
              }
              messagesBySender.get(senderUsername).push(message);
            }
          });

          // Process each sender's messages
          for (const [senderUsername, messages] of messagesBySender) {
            // Count unread messages
            const unreadMessages = messages.filter((msg: { read: boolean }) => !msg.read);
            const latestMessage = messages[0];
            
            // Simple message preview
            let messagePreview = latestMessage.content;

            uniqueUsers.set(senderUsername, {
              id: latestMessage.id,
              username: senderUsername,
              lastMessage: messagePreview,
              timestamp: latestMessage.timestamp,
              hasUnread: unreadMessages.length > 0,
              unreadCount: unreadMessages.length,
              isIncoming: true
            });
          }
        }

        // Process sent messages after, to ensure we don't overwrite unread counts
        if (sentMessages) {
          for (const message of sentMessages) {
            const messagePreview = message.content;
            
            if (!uniqueUsers.has(message.receiver_username)) {
              uniqueUsers.set(message.receiver_username, {
                id: message.id,
                username: message.receiver_username,
                lastMessage: messagePreview,
                timestamp: message.timestamp,
                hasUnread: false,
                unreadCount: 0,
                isIncoming: false
              });
            } else {
              // Update timestamp and last message if this sent message is more recent
              const existing = uniqueUsers.get(message.receiver_username)!;
              if (new Date(message.timestamp) > new Date(existing.timestamp)) {
                uniqueUsers.set(message.receiver_username, {
                  ...existing,
                  id: message.id,
                  lastMessage: messagePreview,
                  timestamp: message.timestamp,
                  isIncoming: false
                  // Keep the existing unread status since this is a sent message
                });
              }
            }
          }
        }

        // Convert map to array and sort by timestamp
        const chats = Array.from(uniqueUsers.values()).sort((a, b) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

        setChatPreviews(chats);
      }
    } catch {
      console.error("Error refreshing chats: [details redacted]");
    } finally {
      setRefreshing(false);
    }
  };

  const renderChatPreview = ({ item }: { item: ChatPreview }) => {
    const avatarSize = 50;

    return (
      <TouchableOpacity
        style={[styles.chatPreview, { borderBottomColor: colors.border }]}
        onPress={() => handleChatPress(item)}
      >
        <View style={styles.avatarContainer}>
          {item.isCommunity ? (
            <View style={[styles.communityAvatar, { backgroundColor: colors.primary }]}>
              {item.type === 'public' ? (
                <Globe size={24} color="#FFFFFF" />
              ) : (
                <Lock size={24} color="#FFFFFF" />
              )}
            </View>
          ) : (
            <Avatar
              size={avatarSize}
              name={item.username}
              style={styles.avatar}
            />
          )}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.username,
                { color: colors.text },
                item.hasUnread && styles.unreadUsername
              ]}
              numberOfLines={1}
            >
              {item.username}
              {item.isCommunity && ` (${item.memberCount || 0} members)`}
            </Text>
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
              {formatChatTimestamp(item.timestamp)}
            </Text>
          </View>

          <View style={styles.messageRow}>
            <Text
              style={[
                styles.messagePreview,
                { color: item.hasUnread ? colors.text : colors.textSecondary },
                item.hasUnread && styles.unreadMessage
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.isCommunity && item.lastMessage ? (
                <>
                  <Text style={styles.communityIndicator}>
                    {item.type === 'public' ? '🌐 ' : '🔒 '}
                  </Text>
                  {item.lastMessage}
                </>
              ) : (
                <>
                  {item.isIncoming ? '' : 'You: '}
                  {item.lastMessage}
                </>
              )}
            </Text>

            {item.unreadCount > 0 && (
              <View
                style={[
                  styles.unreadBadge,
                  { backgroundColor: colors.primary }
                ]}
              >
                <Text style={[styles.unreadCount, { color: '#FFFFFF' }]}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Add section header rendering
  const renderSectionHeader = ({ section }: { section: Section }) => {
    // Only render section headers if they have items
    if (section.data.length === 0) return null;
    
    return (
      <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {section.title}
        </Text>
      </View>
    );
  };

  useFocusEffect(
    React.useCallback(() => {
      if (user && !authLoading) {
        // Fetch communities when the tab is focused
        fetchUserCommunities();
        // Also refresh chat previews to update read status
        refreshChatPreviews();
      }
      return () => {};
    }, [user, authLoading, fetchUserCommunities, refreshChatPreviews])
  );

useEffect(() => {
    if (!user?.id || authLoading) return;

    const refreshInterval = setInterval(() => {
      // Silently refresh communities in the background
      fetchUserCommunities();
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [user?.id, authLoading, fetchUserCommunities]);

useEffect(() => {
    if (authLoading) return;
    if (!user) {
      return;
    }

    let mounted = true;
    let channel: any = null;

    const fetchChatPreviews = async () => {
      try {
        if (!mounted) return;
        setLoading(true);
        setError(null);

        // Fetch messages where user is sender or receiver
        const { data: sentMessages, error: sentError } = await supabase
          .from('messages')
          .select('id, content, timestamp, receiver_username')
          .eq('sender_id', user.id)
          .order('timestamp', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (sentError) throw sentError;

        const { data: receivedMessages, error: receivedError } = await supabase
          .from('messages')
          .select('id, content, timestamp, sender_id, read')
          .eq('receiver_username', user.username)
          .order('timestamp', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (receivedError) throw receivedError;
        
        // Check if there are more messages to load
        setHasMoreMessages((sentMessages?.length || 0) + (receivedMessages?.length || 0) >= pageSize);

        // Get unique users from messages
        const uniqueUsers = new Map<string, ChatPreview>();

        // Process received messages and get user details first
        if (receivedMessages && receivedMessages.length > 0) {
          // Get usernames for senders
          const senderIds = receivedMessages.map((msg) => msg.sender_id);
          const { data: senders, error: sendersError } = await supabase
            .from('users')
            .select('id, username')
            .in('id', senderIds);

          if (sendersError) throw sendersError;

          // Create a map of sender_id to username
          const senderMap = new Map();
          if (senders) {
            senders.forEach((sender) => {
              senderMap.set(sender.id, sender.username);
            });
          }

          // Group messages by sender
          const messagesBySender = new Map();
          receivedMessages.forEach(message => {
            const senderUsername = senderMap.get(message.sender_id);
            if (senderUsername) {
              if (!messagesBySender.has(senderUsername)) {
                messagesBySender.set(senderUsername, []);
              }
              messagesBySender.get(senderUsername).push(message);
            }
          });

          // Process each sender's messages
          for (const [senderUsername, messages] of messagesBySender) {
            // Count unread messages
            const unreadMessages = messages.filter((msg: { read: boolean }) => !msg.read);
            const latestMessage = messages[0];
            
            // Simple message preview
            let messagePreview = latestMessage.content;

            uniqueUsers.set(senderUsername, {
              id: latestMessage.id,
              username: senderUsername,
              lastMessage: messagePreview,
              timestamp: latestMessage.timestamp,
              hasUnread: unreadMessages.length > 0,
              unreadCount: unreadMessages.length,
              isIncoming: true
            });
          }
        }

        // Process sent messages after, to ensure we don't overwrite unread counts
        if (sentMessages) {
          for (const message of sentMessages) {
            const messagePreview = message.content;
            
            if (!uniqueUsers.has(message.receiver_username)) {
              uniqueUsers.set(message.receiver_username, {
                id: message.id,
                username: message.receiver_username,
                lastMessage: messagePreview,
                timestamp: message.timestamp,
                hasUnread: false,
                unreadCount: 0,
                isIncoming: false
              });
            } else {
              // Update timestamp and last message if this sent message is more recent
              const existing = uniqueUsers.get(message.receiver_username)!;
              if (new Date(message.timestamp) > new Date(existing.timestamp)) {
                uniqueUsers.set(message.receiver_username, {
                  ...existing,
                  id: message.id,
                  lastMessage: messagePreview,
                  timestamp: message.timestamp,
                  isIncoming: false
                  // Keep the existing unread status since this is a sent message
                });
              }
            }
          }
        }

        if (!mounted) return;

        // Convert map to array and sort by timestamp
        const chats = Array.from(uniqueUsers.values()).sort((a, b) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

        if (page === 0) {
          setChatPreviews(chats);
        } else {
          // Merge with existing chat previews, keeping only the most recent message per user
          setChatPreviews(prev => {
            const mergedChats = new Map<string, ChatPreview>();
            
            // Add existing chats to the map
            prev.forEach(chat => {
              mergedChats.set(chat.username, chat);
            });
            
            // Merge with new chats, keeping the most recent message
            chats.forEach(chat => {
              const existing = mergedChats.get(chat.username);
              if (!existing || new Date(chat.timestamp) > new Date(existing.timestamp)) {
                mergedChats.set(chat.username, chat);
              }
            });
            
            // Convert back to array and sort by timestamp
            return Array.from(mergedChats.values()).sort((a, b) => {
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
          });
        }
        
        // Fetch user communities (now handled by the separate fetchUserCommunities function)
        fetchUserCommunities();
        
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || 'Failed to load chats');
        console.error("Error fetching chat previews: [details redacted]");
      } finally {
        if (mounted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    fetchChatPreviews();

    // Subscribe to new messages and message updates
    channel = supabase.channel(`chat-previews-${user.id}`);
    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_username=eq.${user.username}`,
      }, async (payload: any) => {
        // Only process if message is actually for this user
        if (payload.new.receiver_username !== user.username) return;

        // Get sender's username
        const { data: sender } = await supabase
          .from('users')
          .select('username')
          .eq('id', payload.new.sender_id)
          .single();

        if (sender) {
          setChatPreviews(prev => {
            // Find existing chat preview for this user
            const existingIndex = prev.findIndex(p => p.username === sender.username);
            const messagePreview = payload.new.content;
            const isUnread = !payload.new.read;
            
            let updatedPreviews = [...prev];
            
            if (existingIndex !== -1) {
              // Update existing chat preview
              const updatedPreview = {
                ...updatedPreviews[existingIndex],
                lastMessage: messagePreview,
                timestamp: payload.new.timestamp,
                hasUnread: isUnread || updatedPreviews[existingIndex].hasUnread,
                unreadCount: isUnread ? 
                  updatedPreviews[existingIndex].unreadCount + 1 : 
                  updatedPreviews[existingIndex].unreadCount,
                isIncoming: true
              };
              
              updatedPreviews[existingIndex] = updatedPreview;
            } else {
              // Create new chat preview
              updatedPreviews = [{
                id: payload.new.id,
                username: sender.username,
                lastMessage: messagePreview,
                timestamp: payload.new.timestamp,
                hasUnread: isUnread,
                unreadCount: isUnread ? 1 : 0,
                isIncoming: true
              }, ...updatedPreviews];
            }
            
            // Sort by timestamp
            return updatedPreviews.sort((a, b) => {
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `receiver_username=eq.${user.username}`,
      }, (payload: any) => {
        if (payload.new.receiver_username !== user.username) return;
        
        // Handle read status updates
        if ('read' in payload.new && payload.new.read) {
          setChatPreviews(prev => {
            // Find the correct chat and update unread count
            return prev.map(preview => {
              // Find messages from this sender
              if (preview.isIncoming) {
                // Use the existing preview but mark as read if this was the unread message
                return {
                  ...preview,
                  hasUnread: preview.id === payload.new.id ? false : preview.hasUnread,
                  unreadCount: preview.id === payload.new.id ? 
                    Math.max(0, preview.unreadCount - 1) : preview.unreadCount
                };
              }
              return preview;
            });
          });
        }
      })

    return () => {
      mounted = false;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user, authLoading, page, fetchUserCommunities]);

const loadNextPage = useStableEvent(() => {
    if (page > 0 && user && !loading) {
      const loadMoreData = async () => {
        try {
          setLoadingMore(true);
          
          // Fetch messages where user is sender or receiver
          const { data: sentMessages, error: sentError } = await supabase
            .from('messages')
            .select('id, content, timestamp, receiver_username')
            .eq('sender_id', user.id)
            .order('timestamp', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (sentError) throw sentError;

          const { data: receivedMessages, error: receivedError } = await supabase
            .from('messages')
            .select('id, content, timestamp, sender_id, read')
            .eq('receiver_username', user.username)
            .order('timestamp', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (receivedError) throw receivedError;
          
          // Check if there are more messages to load
          setHasMoreMessages((sentMessages?.length || 0) + (receivedMessages?.length || 0) >= pageSize);

          // Process messages similar to the main effect...
          // [Same processing logic as above, but only updating the state with the new page data]
          
          // Get unique users from messages
          const uniqueUsers = new Map<string, ChatPreview>();
          
          // Process received messages
          if (receivedMessages && receivedMessages.length > 0) {
            const senderIds = receivedMessages.map((msg) => msg.sender_id);
            const { data: senders } = await supabase
              .from('users')
              .select('id, username')
              .in('id', senderIds);
              
            const senderMap = new Map();
            if (senders) {
              senders.forEach((sender) => {
                senderMap.set(sender.id, sender.username);
              });
            }
            
            // Group and process messages
            // [Similar to above]
            const messagesBySender = new Map();
            receivedMessages.forEach(message => {
              const senderUsername = senderMap.get(message.sender_id);
              if (senderUsername) {
                if (!messagesBySender.has(senderUsername)) {
                  messagesBySender.set(senderUsername, []);
                }
                messagesBySender.get(senderUsername).push(message);
              }
            });
            
            for (const [senderUsername, messages] of messagesBySender) {
              const unreadMessages = messages.filter((msg: { read: boolean }) => !msg.read);
              const latestMessage = messages[0];
              
              uniqueUsers.set(senderUsername, {
                id: latestMessage.id,
                username: senderUsername,
                lastMessage: latestMessage.content,
                timestamp: latestMessage.timestamp,
                hasUnread: unreadMessages.length > 0,
                unreadCount: unreadMessages.length,
                isIncoming: true
              });
            }
          }
          
          // Process sent messages
          if (sentMessages) {
            for (const message of sentMessages) {
              if (!uniqueUsers.has(message.receiver_username)) {
                uniqueUsers.set(message.receiver_username, {
                  id: message.id,
                  username: message.receiver_username,
                  lastMessage: message.content,
                  timestamp: message.timestamp,
                  hasUnread: false,
                  unreadCount: 0,
                  isIncoming: false
                });
              } else {
                const existing = uniqueUsers.get(message.receiver_username)!;
                if (new Date(message.timestamp) > new Date(existing.timestamp)) {
                  uniqueUsers.set(message.receiver_username, {
                    ...existing,
                    id: message.id,
                    lastMessage: message.content,
                    timestamp: message.timestamp,
                    isIncoming: false
                  });
                }
              }
            }
          }
          
          // Merge with existing chat previews
          setChatPreviews(prev => {
            const mergedChats = new Map<string, ChatPreview>();
            
            // Add existing chats to the map
            prev.forEach(chat => {
              mergedChats.set(chat.username, chat);
            });
            
            // Merge with new chats
            Array.from(uniqueUsers.values()).forEach(chat => {
              const existing = mergedChats.get(chat.username);
              if (!existing || new Date(chat.timestamp) > new Date(existing.timestamp)) {
                mergedChats.set(chat.username, chat);
              }
            });
            
            // Convert back to array and sort
            return Array.from(mergedChats.values()).sort((a, b) => {
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
          });
          
        } catch {
          console.error("Error loading more messages: [details redacted]");
        } finally {
          setLoadingMore(false);
        }
      };
      
      loadMoreData();
    }
  });
  useEffect(() => loadNextPage(), [page, user, loadNextPage]);

  if (!user) {
    // User is not authenticated, show sign-in prompt
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Please sign in to view your chats
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Chats</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.card }]}
            onPress={() => router.push('/new-chat')}
          >
            <Search size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.newChatButton, { backgroundColor: colors.primary }]}
            onPress={handleNewChatPress}
          >
            <PlusCircle size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : (chatPreviews.length === 0 && communitiesPreview.length === 0) ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No conversations yet
          </Text>
          <Text style={[styles.emptySuggestion, { color: colors.textTertiary }]}>
            Start a new chat or join a community
          </Text>
          <View style={styles.emptyActions}>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={handleNewChatPress}
            >
              <Text style={[styles.emptyButtonText, { color: '#FFFFFF' }]}>New Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(tabs)/communities')}
            >
              <Text style={[styles.emptyButtonText, { color: colors.text }]}>Join Community</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={sectionsData.flatMap(section => section.data)}
          ListHeaderComponent={renderSectionHeader({ section: sectionsData.find(section => section.data.length > 0) ?? sectionsData[0] })}
          renderItem={renderChatPreview}
          keyExtractor={(item) => (item.isCommunity ? `community-${item.id}` : `chat-${item.id}`)}
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={styles.loadingMore}
                size="small"
                color={colors.primary}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e1e1e1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatPreview: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    borderRadius: 25,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  unreadUsername: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagePreview: {
    fontSize: 14,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '500',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySuggestion: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emptyButtonText: {
    fontWeight: '600',
  },
  loadingMore: {
    padding: 16,
  },
  communityAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityIndicator: {
    marginRight: 4,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  }
});
