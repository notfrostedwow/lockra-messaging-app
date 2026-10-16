import { Alert } from '@/lib/alert';
import { randomCommandValue } from '@/lib/communityRandom';
import { useStableEvent } from '@/hooks/useStableEvent';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { communityService } from '@/lib/communityService';
import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { Community, CommunityMessage, CommunityMember, MemberRole } from '@/types';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Send, Users, Info, MoreVertical, Paperclip } from 'lucide-react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { Banner } from '@/components/ui/Banner';
import { RealtimeChannel } from '@supabase/supabase-js';

// Memoized attachment display component for performance
const AttachmentDisplay = React.memo(({ attachment, isCurrentUser, colors, communityService, getToken }: { 
  attachment: any; 
  isCurrentUser: boolean; 
  colors: any;
  communityService: any;
  getToken: any;
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  

  useEffect(() => {
    const loadImage = async () => {
      if (attachment.file_type.startsWith('image/')) {
        try {
          console.log("Community: Loading image for attachment: [details redacted]");
          // Get auth token for signed URL
          const token = await getToken().catch(() => null);
          console.log("Community: Auth token available: [details redacted]");
          // Use the service method for signed URLs
          const url = await communityService.getSignedUrlForAttachment(attachment.storage_path, token);
          console.log("Community: Got signed URL: [details redacted]");
          if (url) {
            setImageUrl(url);
            console.log("Community: Image URL set successfully for [details redacted]");
          } else {
            // Try without auth token as fallback
            console.log("Community: Trying fallback without auth for [details redacted]");
            const fallbackUrl = await communityService.getSignedUrlForAttachment(attachment.storage_path, null);
            if (fallbackUrl) {
              setImageUrl(fallbackUrl);
              console.log("Community: Fallback URL worked [details redacted]");
            }
          }
        } catch {
          console.error("Community: Error loading image: [details redacted]");
        }
      }
      setLoading(false);
    };
    loadImage();
  }, [attachment.storage_path, attachment.file_type, communityService, getToken]);

  if (attachment.file_type.startsWith('image/')) {
    return (
      <View style={styles.imageAttachmentContainer}>
        {loading ? (
          <View style={styles.imageLoadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : imageUrl ? (
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.attachmentImage}
            resizeMode="cover"
            onLoad={() => console.log("Community: Image rendered successfully [details redacted]")}
            onError={(e) => console.log("Community: Image render error: [details redacted]")}
          />
        ) : (
          <View style={styles.imageErrorContainer}>
            <Text style={[styles.attachmentText, { color: isCurrentUser ? '#FFFFFF' : colors.text }]}>
              📷 {attachment.file_name || 'Image'}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.fileAttachmentContainer}>
      <Text style={[styles.attachmentText, { color: isCurrentUser ? '#FFFFFF' : colors.text }]}>
        📎 {attachment.file_name}
      </Text>
      <Text style={[styles.fileSizeText, { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
        {formatFileSize(attachment.file_size)}
      </Text>
    </TouchableOpacity>
  );
});

// Memoized message component for performance
const MessageItem = React.memo(({ item, isCurrentUser, colors, isSelected, onLongPress, onPress, communityService, getToken }: {
  item: any;
  isCurrentUser: boolean;
  colors: any;
  isSelected: boolean;
  onLongPress: () => void;
  onPress: () => void;
  communityService: any;
  getToken: any;
}) => {
  const messageDate = new Date(item.created_at);
  
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={onLongPress}
      onPress={onPress}
      style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        { maxWidth: '80%' }
      ]}
    >
      <View style={[
        styles.messageBubble,
        isCurrentUser
          ? styles.currentUserBubble
          : [styles.otherUserBubble, { backgroundColor: colors.card }],
        isSelected && styles.selectedBubble
      ]}>
        {!isCurrentUser && (
          <Text style={[styles.messageUsername, { color: colors.primary }]}>
            {item.username || 'Unknown User'}
          </Text>
        )}
        
        {item.content && (
          <Text style={[
            styles.messageText,
            { color: isCurrentUser ? '#FFFFFF' : colors.text }
          ]}>
            {item.content}
          </Text>
        )}
        
        {/* Render attachments */}
        {item.attachments && item.attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            {item.attachments.map((attachment: any) => (
              <AttachmentDisplay 
                key={attachment.id} 
                attachment={attachment} 
                isCurrentUser={isCurrentUser}
                colors={colors}
                communityService={communityService}
                getToken={getToken}
              />
            ))}
          </View>
        )}
        
        {/* Only show loading for messages that truly have nothing */}
        {!item.content && (!item.attachments || item.attachments.length === 0) && (
          <Text style={[
            styles.messageText,
            { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : colors.textSecondary, fontStyle: 'italic' }
          ]}>
            Loading...
          </Text>
        )}
        
        <Text style={[
          styles.messageTime,
          { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
        ]}>
          {messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        
        {isSelected && (
          <View style={[styles.checkWrap, { borderColor: colors.primary, backgroundColor: colors.primary }]}>
            <View style={styles.checkDot} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// Helper function for file size formatting
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function CommunityChat() {
  const { colors } = useTheme();
  const { user, getToken } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  useSafeAreaInsets();

  const [community, setCommunity] = useState<Community | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [userRole, setUserRole] = useState<MemberRole | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [page, setPage] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandSuggestions, setCommandSuggestions] = useState<{ command: string; label: string }[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<CommunityMember[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [banner, setBanner] = useState<{ visible: boolean; text: string; type?: 'info'|'success'|'warning'|'error' }>({ visible: false, text: '' });
  useState<Record<string, string>>({});

  const MESSAGES_PER_PAGE = 20;
  const { width: screenWidth } = Dimensions.get('window');
  const isTablet = screenWidth > 768;

  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const eventsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const broadcastChannelRef = useRef<RealtimeChannel | null>(null);
  const didInitialAutoScrollRef = useRef<boolean>(false);
  const pickImageFromLibrary = async (): Promise<{ uri: string; fileName?: string; mimeType?: string } | null> => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow photo library access to pick images.');
        return null;
      }
      const mediaTypes = (ImagePicker as any).MediaType?.image ?? (ImagePicker as any).MediaTypeOptions?.Images ?? ImagePicker.MediaTypeOptions.Images;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        quality: 1,
        allowsMultipleSelection: false,
      });

      if (!result || result.canceled || !result.assets || result.assets.length === 0) return null;

      const asset = result.assets[0];
      return { uri: asset.uri, fileName: asset.fileName ?? undefined, mimeType: asset.mimeType ?? undefined };
    } catch {
      console.log("pickImageFromLibrary error: [details redacted]");
      Alert.alert('Error', 'Failed to open image library');
      return null;
    }
  };

  

  // Simplified upload handler
  const handleImageUpload = async () => {
    try {
      const picked = await pickImageFromLibrary();
      if (!picked) return;

      // Show uploading state
      setBanner({ visible: true, text: 'Uploading image...', type: 'info' });
      
      // Compress image
      const manipulated = await ImageManipulator.manipulateAsync(
        picked.uri,
        [{ resize: { width: 1440 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Create message first (empty, we'll add attachment after)
      const msg = await communityService.sendMessage(id, '', user?.id);
      if (!msg) throw new Error('Failed to create message');
      
      // Add to local messages at the bottom (newest messages)
      setMessages(prev => [...prev, msg]);

      // Convert to uint8 array
      const base64 = await FileSystem.readAsStringAsync(manipulated.uri, { encoding: FileSystem.EncodingType.Base64 });
      const uint8 = Buffer.from(base64, 'base64');
      const fileName = `image_${Date.now()}.jpg`;
      const approxSize = Math.floor((base64.length * 3) / 4);

      // Get token and upload
      const token = await getToken().catch(() => null);
      console.log("About to upload to storage... [details redacted]");
      const storagePath = await communityService.uploadAttachmentToStorage(id, msg.id, fileName, 'image/jpeg', uint8, token);
      console.log("Upload result, storagePath: [details redacted]");
      if (!storagePath) throw new Error('Storage upload failed');

      // Wait a moment for storage consistency
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create attachment record
      const client = token ? createAuthenticatedSupabaseClient(token) : supabase;
      const { data: attachment, error } = await client
        .from('community_file_attachments')
        .insert({
          message_id: msg.id,
          file_name: fileName,
          file_type: 'image/jpeg',
          file_size: approxSize,
          storage_path: storagePath,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state with attachment 
      setMessages(prev => prev.map(m => 
        m.id === msg.id 
          ? { ...m, attachments: [attachment] } 
          : m
      ));

      setBanner({ visible: true, text: 'Image uploaded successfully!', type: 'success' });
    } catch (e: any) {
      console.error("Upload error: [details redacted]");
      setBanner({ visible: true, text: 'Upload failed: ' + e.message, type: 'error' });
    }
  };

  const handleFileUpload = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });

      if (!r || r.canceled || !r.assets || r.assets.length === 0) return;

      const asset = r.assets[0];

      setBanner({ visible: true, text: 'Uploading file...', type: 'info' });

      const msg = await communityService.sendMessage(id, '', user?.id);
      if (!msg) throw new Error('Failed to create message');
      
      // Add to local messages at the bottom (newest messages)
      setMessages(prev => [...prev, msg]);

      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const uint8 = Buffer.from(base64, 'base64');
      const approxSize = Math.floor((base64.length * 3) / 4);

      const token = await getToken().catch(() => null);
      const storagePath = await communityService.uploadAttachmentToStorage(id, msg.id, asset.name || `file_${Date.now()}`, asset.mimeType || 'application/octet-stream', uint8, token);
      if (!storagePath) throw new Error('Storage upload failed');

      const client = token ? createAuthenticatedSupabaseClient(token) : supabase;
      const { data: attachment, error } = await client
        .from('community_file_attachments')
        .insert({
          message_id: msg.id,
          file_name: asset.name || 'file',
          file_type: asset.mimeType || 'application/octet-stream',
          file_size: approxSize,
          storage_path: storagePath,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => prev.map(m => 
        m.id === msg.id 
          ? { ...m, attachments: [attachment] } 
          : m
      ));

      setBanner({ visible: true, text: 'File uploaded successfully!', type: 'success' });
    } catch (e: any) {
      console.error("File upload error: [details redacted]");
      setBanner({ visible: true, text: 'Upload failed: ' + e.message, type: 'error' });
    }
  };

  // Helpers: resolve username, parse timespan, fetch user info
  const resolveUsernameToId = async (username: string): Promise<string> => {
    // Accept raw UUID
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRe.test(username)) return username;

    // Try exact username (case-insensitive)
    let { data } = await supabase
      .from('users')
      .select('id')
      .ilike('username', username)
      .single();
    if (data?.id) return data.id as string;

    // Try display_name
    const { data: byDisplay } = await supabase
      .from('users')
      .select('id')
      .ilike('display_name', username)
      .limit(1)
      .maybeSingle?.() ?? { data: null };
    if (byDisplay?.id) return byDisplay.id as string;

    throw new Error('User not found');
  };

  const computeFutureISO = (spec: string): string => {
    // supports like 10s, 5m, 2h, 1d
    const m = spec.match(/^(\d+)([smhd])$/i);
    const now = new Date();
    if (!m) {
      // default 10 minutes
      now.setMinutes(now.getMinutes() + 10);
      return now.toISOString();
    }
    const val = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    switch (unit) {
      case 's': now.setSeconds(now.getSeconds() + val); break;
      case 'm': now.setMinutes(now.getMinutes() + val); break;
      case 'h': now.setHours(now.getHours() + val); break;
      case 'd': now.setDate(now.getDate() + val); break;
    }
    return now.toISOString();
  };

  const fetchUserInfo = async (username: string): Promise<string> => {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, created_at')
      .eq('username', username)
      .single();
    if (error || !data) return 'User not found';
    // Joined date and role in this community
    let roleText = 'not a member';
    try {
      const { data: member } = await supabase
        .from('community_members')
        .select('role, joined_at')
        .eq('community_id', id)
        .eq('user_id', data.id)
        .single();
      if (member) roleText = `${member.role} (joined ${new Date(member.joined_at).toLocaleDateString()})`;
    } catch {}
    return `ID: ${data.id}\nRole: ${roleText}\nJoined platform: ${new Date(data.created_at).toLocaleDateString()}`;
  };

  // Replace the current trailing mention token with a full username
  const replaceCurrentMention = (text: string, fullUsername: string): string => {
    return text.replace(/@([A-Za-z0-9_.-]*)$/, '@' + fullUsername);
  };

  

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
      setIsLocked(Boolean(communityData.is_locked));

      // Load user role
      const role = await communityService.getUserRole(id, user?.id);
      setUserRole(role);

      if (!role) {
        // User is not a member of this community
        Alert.alert('Error', 'You are not a member of this community');
        router.back();
        return;
      }

      // Load initial messages with pagination (use auth for attachments)
      let token: string | null = null;
      try { token = await getToken(); } catch {}
      const communityMessages = await communityService.getCommunityMessages(id, MESSAGES_PER_PAGE, 0, token);
      console.log("Community: Loaded [details redacted]");
      console.log("Community: Messages with attachments: [details redacted]");
      setMessages(communityMessages.reverse()); // Reverse to show newest at bottom
      setPage(0);
      setHasMoreMessages(communityMessages.length === MESSAGES_PER_PAGE);
      didInitialAutoScrollRef.current = false; // reset initial scroll flag on new load

      // Load members for mention suggestions
      try {
        const m = await communityService.getCommunityMembers(id);
        setMembers(m || []);
      } catch {}

      // Subscribe to real-time updates
      realtimeChannelRef.current = communityService.subscribeToMessages(
        id,
        (newMessage) => {
          // Handle system control messages for lock state
          const content = (newMessage as any)?.content || '';
          if (content === '__SYSTEM__:CHAT_LOCKED') {
            setIsLocked(true);
            return;
          }
          if (content === '__SYSTEM__:CHAT_UNLOCKED') {
            setIsLocked(false);
            return;
          }
          setMessages((prev) => {
            if (prev.find(m => m.id === (newMessage as any).id)) return prev;
            return [...prev, newMessage];
          });
          // Scroll to bottom on new message
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        },
        (deletedMessageId) => {
          setMessages((prev) => prev.filter(m => m.id !== deletedMessageId));
        }
      );

      // Auto-scroll to bottom after loading initial messages
      setTimeout(() => {
        if (flatListRef.current && communityMessages.length > 0) {
          flatListRef.current.scrollToEnd({ animated: false });
          didInitialAutoScrollRef.current = true;
        }
      }, 200);
    } catch {
      console.error("Error loading community data: [details redacted]");
      Alert.alert('Error', 'Failed to load community data');
    } finally {
      setLoading(false);
    }
  });

  // Auto-scroll to bottom when screen comes into focus
  

  const handleLoadMore = async () => {
    if (loadingMore || !hasMoreMessages) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const offset = nextPage * MESSAGES_PER_PAGE;

      let token: string | null = null;
      try { token = await getToken(); } catch {}
      const olderMessages = await communityService.getCommunityMessages(id, MESSAGES_PER_PAGE, offset, token);

      if (olderMessages.length > 0) {
        // Add older messages to the beginning of the list
        setMessages(prev => [...olderMessages.reverse(), ...prev]);
        setPage(nextPage);
        setHasMoreMessages(olderMessages.length === MESSAGES_PER_PAGE);
      } else {
        setHasMoreMessages(false);
      }
    } catch {
      console.error("Error loading more messages: [details redacted]");
    } finally {
      setLoadingMore(false);
    }
  };

  const isAdminOrOwner = userRole === 'owner' || userRole === 'admin';
  const toggleSelection = useStableEvent((messageId: string) => {
    setSelectedIds(prev => prev.includes(messageId) ? prev.filter(id => id !== messageId) : [...prev, messageId]);
  });
  const startSelection = useStableEvent((messageId: string) => {
    setSelectionMode(true);
    setSelectedIds([messageId]);
  });
  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const allowedIds = isAdminOrOwner ? selectedIds : selectedIds.filter(id => messages.find(m => m.id === id)?.user_id === user?.id);
    if (allowedIds.length === 0) {
      Alert.alert('Error', 'You can only delete your own messages');
      return;
    }
    let success = 0;
    for (const mid of allowedIds) {
      try {
        const ok = await communityService.deleteCommunityMessage(id, mid, user?.id);
        if (ok) success++;
      } catch {}
    }
    if (success === 0) {
      Alert.alert('Error', 'No messages were deleted');
    }
    clearSelection();
  };
  const handlePinSelected = async () => {
    if (!isAdminOrOwner) {
      Alert.alert('Error', 'Only owners and admins can pin messages');
      return;
    }
    if (selectedIds.length !== 1) {
      Alert.alert('Select one message', 'Please select exactly one message to pin');
      return;
    }
    const ok = await communityService.pinMessage(id, selectedIds[0], user?.id);
    if (!ok) {
      Alert.alert('Error', 'Failed to pin message');
    } else {
      Alert.alert('Pinned', 'Message has been pinned');
    }
    clearSelection();
  };

  // Ultra-responsive send message handler
  const handleSendPress = () => {
    // Prevent empty messages
    if (!messageText.trim() || !user || !id || sending) {
      return;
    }

    // Store message content before clearing
    const messageContent = messageText.trim();

    // Clear input immediately for better UX
    setMessageText('');

    // Keep focus on input
    setTimeout(() => textInputRef.current?.focus(), 10);

    // Set UI state
    setSending(true);

    // Perform the actual send operation
      sendMessageAsync(messageContent)
        .catch(error => {
          console.error("Error sending message: [details redacted]");
          Alert.alert('Error', 'Failed to send message');
        })
        .finally(() => {
          setSending(false);
        });
  };

  // Async function to handle the actual message sending
  const sendMessageAsync = async (messageContent: string) => {
    try {
      // Slash commands
      if (messageContent.startsWith('/')) {
        const command = messageContent.trim().toLowerCase();
        if (command.startsWith('/lock-chat')) {
          if (userRole === 'owner' || userRole === 'admin') {
            const ok = await communityService.lockCommunity(id, user?.id);
            if (ok) {
              setIsLocked(true);
              Alert.alert('Chat locked', 'Only owners and admins can send messages');
              return true;
            } else {
              throw new Error('Failed to lock chat');
            }
          } else {
            throw new Error('Only owners and admins can lock the chat');
          }
        } else if (command.startsWith('/unlock-chat')) {
          if (userRole === 'owner' || userRole === 'admin') {
            const ok = await communityService.unlockCommunity(id, user?.id);
            if (ok) {
              setIsLocked(false);
              Alert.alert('Chat unlocked', 'All members can send messages');
              return true;
            } else {
              throw new Error('Failed to unlock chat');
            }
          } else {
            throw new Error('Only owners and admins can unlock the chat');
          }
        } else if (command.startsWith('/clear')) {
          if (!(userRole === 'owner' || userRole === 'admin')) {
            throw new Error('Only owners and admins can clear the chat');
          }
          // Optional numeric argument: /clear [N]
          const parts = messageContent.trim().split(/\s+/);
          const countArg = parts[1] ? parseInt(parts[1], 10) : NaN;
          if (!isNaN(countArg) && countArg > 0) {
            const toDelete = messages.slice(-countArg).map(m => m.id);
            for (const mId of toDelete) {
              communityService.deleteCommunityMessage(id, mId, user?.id).catch(() => {});
            }
            Alert.alert('Clearing', 'Requested deletion of last ' + countArg + ' messages');
            return true;
          }
          Alert.alert(
            'Clear chat?',
            'This will permanently delete all messages in this community for everyone.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: async () => {
                const ok = await communityService.clearCommunityMessages(id, user?.id);
                if (ok) {
                  setMessages([]);
                  Alert.alert('Cleared', 'All messages have been deleted');
                } else {
                  Alert.alert('Error', 'Failed to clear messages');
                }
              }}
            ]
          );
          return true;
        } else if (command.startsWith('/mute')) {
          if (!(userRole === 'owner' || userRole === 'admin')) throw new Error('No permission');
          // /mute @user [time]
          const match = messageContent.match(/^\/mute\s+@([\w\.\-]+)(?:\s+(\S+))?/i);
          if (!match) throw new Error('Usage: /mute @user [time]');
          const username = match[1];
          const time = match[2] || '10m';
          const mutedUntil = computeFutureISO(time);
          const userId = await resolveUsernameToId(username);
          const ok = await communityService.muteMember(id, userId, mutedUntil, user?.id);
          if (!ok) throw new Error('Failed to mute');
          Alert.alert('Muted', `@${username} until ${new Date(mutedUntil).toLocaleString()}`);
          return true;
        } else if (command.startsWith('/unmute')) {
          if (!(userRole === 'owner' || userRole === 'admin')) throw new Error('No permission');
          const match = messageContent.match(/^\/unmute\s+@([\w\.\-]+)/i);
          if (!match) throw new Error('Usage: /unmute @user');
          const username = match[1];
          const userId = await resolveUsernameToId(username);
          const ok = await communityService.unmuteMember(id, userId, user?.id);
          if (!ok) throw new Error('Failed to unmute');
          Alert.alert('Unmuted', `@${username}`);
          return true;
        } else if (command.startsWith('/kick')) {
          if (!(userRole === 'owner' || userRole === 'admin')) throw new Error('No permission');
          const match = messageContent.match(/^\/kick\s+@([\w\.\-]+)(?:\s+(.+))?/i);
          if (!match) throw new Error('Usage: /kick @user [reason]');
          const username = match[1];
          const userId = await resolveUsernameToId(username);
          const ok = await communityService.kickMember(id, userId, user?.id);
          if (!ok) throw new Error('Failed to kick');
          Alert.alert('Kicked', `@${username} removed`);
          return true;
        } else if (command.startsWith('/ban')) {
          if (!(userRole === 'owner' || userRole === 'admin')) throw new Error('No permission');
          const match = messageContent.match(/^\/ban\s+@([\w\.\-]+)(?:\s+(.+))?/i);
          if (!match) throw new Error('Usage: /ban @user [reason]');
          const username = match[1];
          const reason = match[2] || null;
          const userId = await resolveUsernameToId(username);
          const ok = await communityService.banMember(id, userId, reason, user?.id);
          if (!ok) throw new Error('Failed to ban');
          Alert.alert('Banned', '@' + username + (reason ? ' for ' + reason : ''));
          return true;
        } else if (command.startsWith('/unban')) {
          if (!(userRole === 'owner' || userRole === 'admin')) throw new Error('No permission');
          const match = messageContent.match(/^\/unban\s+@([\w\.\-]+)/i);
          if (!match) throw new Error('Usage: /unban @user');
          const username = match[1];
          const userId = await resolveUsernameToId(username);
          const ok = await communityService.unbanMember(id, userId, user?.id);
          if (!ok) throw new Error('Failed to unban');
          Alert.alert('Unbanned', `@${username}`);
          return true;
        } else if (command.startsWith('/slowmode')) {
          if (!(userRole === 'owner' || userRole === 'admin')) throw new Error('No permission');
          const match = messageContent.match(/^\/slowmode\s+(\d+)/i);
          if (!match) throw new Error('Usage: /slowmode [seconds]');
          const seconds = parseInt(match[1], 10);
          const ok = await communityService.setSlowmode(id, seconds, user?.id);
          if (!ok) throw new Error('Failed to set slowmode');
          Alert.alert('Slowmode', `${seconds}s per message`);
          return true;
        } else if (command.startsWith('/enable-attachments')) {
          if (!(userRole === 'owner' || userRole === 'admin')) throw new Error('No permission');
          const ok = await communityService.setAttachmentsEnabled(id, true, user?.id);
          if (ok) {
            setCommunity(prev => prev ? ({ ...prev, attachments_enabled: true } as any) : prev);
            Alert.alert('Attachments enabled', 'All members can now upload files');
            return true;
          } else {
            throw new Error('Failed to enable attachments');
          }
        } else if (command.startsWith('/set-topic')) {
          if (!(userRole === 'owner' || userRole === 'admin')) throw new Error('No permission');
          const match = messageContent.match(/^\/set-topic\s+(.+)/i);
          if (!match) throw new Error('Usage: /set-topic [text]');
          const ok = await communityService.setTopic(id, match[1], user?.id);
          if (!ok) throw new Error('Failed to set topic');
          Alert.alert('Topic updated');
          return true;
        } else if (command.startsWith('/rules')) {
          if (community?.rules) Alert.alert('Community Rules', community.rules);
          else Alert.alert('No rules set');
          return true;
        } else if (command.startsWith('/announce')) {
          if (!(userRole === 'owner' || userRole === 'admin')) throw new Error('No permission');
          const match = messageContent.match(/^\/announce\s+(.+)/i);
          if (!match) throw new Error('Usage: /announce [message]');
          await communityService.sendMessage(id, `[ANNOUNCEMENT] ${match[1]}`, user?.id);
          return true;
        } else if (command.startsWith('/pin')) {
          if (!(userRole === 'owner' || userRole === 'admin')) throw new Error('No permission');
          const match = messageContent.match(/^\/pin\s+([0-9a-f\-]+)/i);
          if (!match) throw new Error('Usage: /pin [message-id]');
          const ok = await communityService.pinMessage(id, match[1], user?.id);
          if (!ok) throw new Error('Failed to pin');
          Alert.alert('Pinned');
          return true;
        } else if (command.startsWith('/unpin')) {
          if (!(userRole === 'owner' || userRole === 'admin')) throw new Error('No permission');
          const ok = await communityService.unpinMessage(id, user?.id);
          if (!ok) throw new Error('Failed to unpin');
          Alert.alert('Unpinned');
          return true;
        } else if (command.startsWith('/poll')) {
          Alert.alert('Coming soon', 'Polls will be implemented next.');
          return true;
        } else if (command.startsWith('/giveaway')) {
          Alert.alert('Coming soon', 'Giveaways will be implemented next.');
          return true;
        } else if (command.startsWith('/coinflip')) {
          const result = randomCommandValue(2) === 1 ? 'Heads' : 'Tails';
          await communityService.sendMessage(id, `Coinflip: ${result}`, user?.id);
          return true;
        } else if (command.startsWith('/roll')) {
          const match = messageContent.match(/^\/roll\s*(\d+)?/i);
          const max = match && match[1] ? Math.max(1, parseInt(match[1], 10)) : 100;
          const val = randomCommandValue(max);
          await communityService.sendMessage(id, `Rolled ${val} (1-${max})`, user?.id);
          return true;
        } else if (command.startsWith('/whois')) {
          const match = messageContent.match(/^\/whois\s+@([\w\.\-]+)/i);
          if (!match) throw new Error('Usage: /whois @user');
          const username = match[1];
          const info = await fetchUserInfo(username);
          Alert.alert(`@${username}`, info);
          return true;
        } else if (command.startsWith('/stats')) {
          Alert.alert('Coming soon', 'Community stats will be implemented next.');
          return true;
        } else if (command.startsWith('/report')) {
          const match = messageContent.match(/^\/report\s+@([\w\.\-]+)(?:\s+(.+))?/i);
          if (!match) throw new Error('Usage: /report @user [reason]');
          const username = match[1];
          const reason = match[2] || null;
          const userId = await resolveUsernameToId(username);
          const ok = await communityService.reportUser(id, userId, reason, user?.id);
          if (!ok) throw new Error('Failed to report');
          Alert.alert('Reported', '@' + username + (reason ? ' for ' + reason : ''));
          return true;
        } else {
          Alert.alert('Unknown command', 'Supported: /lock-chat, /unlock-chat, /clear');
          return true;
        }
      }

      // Enforce lock on client side too
      if (isLocked && !(userRole === 'owner' || userRole === 'admin')) {
        throw new Error('Chat is locked. Only owners and admins can send messages');
      }

      // Send message to the service
      await communityService.sendMessage(id, messageContent, user?.id);
      return true;
    } catch (error) {
      console.error("Send message error: [details redacted]");
      throw error;
    }
  };

  const handleViewMembers = () => {
    if (community) {
      router.push(`/community/members/${id}`);
    }
  };



    const renderMessage = useCallback(({ item }: { item: CommunityMessage }) => {
    const isCurrentUser = item.user_id === user?.id;
    const isSelected = selectedIds.includes(item.id);

    return (
      <MessageItem
        item={item}
        isCurrentUser={isCurrentUser}
        colors={colors}
        isSelected={selectionMode && isSelected}
        onLongPress={() => startSelection(item.id)}
        onPress={() => {
          if (selectionMode) {
            toggleSelection(item.id);
          }
        }}
        communityService={communityService}
        getToken={getToken}
      />
    );
  }, [user?.id, selectedIds, selectionMode, colors, startSelection, toggleSelection, getToken]);

  useEffect(() => {
    if (!banner.visible) return;
    const t = setTimeout(() => setBanner({ visible: false, text: '' }), 2500);
    return () => clearTimeout(t);
  }, [banner.visible]);

useEffect(() => {
    if (!id || !user) return;

    // Clean up any existing subscription before setting up a new one
    if (realtimeChannelRef.current) {
      communityService.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    loadCommunityData();

    // Subscribe to community lock state changes
    const communityChannel = supabase
      .channel(`community:${id}:${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'communities',
        filter: `id=eq.${id}`
      }, (payload) => {
        const row: any = payload.new ?? payload.old;
        if (row && typeof row.is_locked === 'boolean') {
          setIsLocked(Boolean(row.is_locked));
        } else {
          // If payload lacks the flag, refetch as fallback
          communityService.getCommunityById(id).then((c) => {
            if (c && typeof (c as any).is_locked === 'boolean') {
              setIsLocked(Boolean((c as any).is_locked));
            }
          }).catch(() => {});
        }
      })
      .subscribe();

    // Subscribe to membership deletion for current user (kick/leave)
    const membershipChannel = supabase
      .channel(`community_members:${id}:${user.id}:${Date.now()}`)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'community_members',
        filter: `community_id=eq.${id}`
      }, (payload) => {
        const oldRow = payload.old as any;
        if (oldRow?.user_id === user.id) {
          Alert.alert('Removed', 'You were removed from this community');
          router.back();
        }
      })
      .subscribe();
    // Broadcast channel with stable name for cross-client signals (legacy)
    try {
      if (broadcastChannelRef.current) {
        supabase.removeChannel(broadcastChannelRef.current);
        broadcastChannelRef.current = null;
      }
      broadcastChannelRef.current = supabase
        .channel(`community-broadcast:${id}`)
        .on('broadcast', { event: 'lock' }, () => { setIsLocked(true); setBanner({ visible: true, text: 'Chat locked', type: 'warning' }); })
        .on('broadcast', { event: 'unlock' }, () => { setIsLocked(false); setBanner({ visible: true, text: 'Chat unlocked', type: 'success' }); })
        .on('broadcast', { event: 'kick' }, (payload: any) => {
          const p = payload?.payload || {};
          if (p.userId === user.id) {
            Alert.alert('Removed', 'You were removed from this community');
            router.back();
          }
        })
        .on('broadcast', { event: 'ban' }, (payload: any) => {
          const p = payload?.payload || {};
          if (p.userId === user.id) {
            Alert.alert('Banned', 'You were banned from this community');
            router.back();
          }
        })
        .subscribe();

      // Subscribe to durable events table (most reliable path)
      supabase
        .channel(`community-events:${id}:${Date.now()}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'community_events',
          filter: `community_id=eq.${id}`
        }, (payload) => {
          const ev: any = payload.new;
          if (!ev) return;
          if (ev.event === 'lock') { setIsLocked(true); setBanner({ visible: true, text: 'Chat locked', type: 'warning' }); }
          if (ev.event === 'unlock') { setIsLocked(false); setBanner({ visible: true, text: 'Chat unlocked', type: 'success' }); }
          if (ev.event === 'kick' && ev.target_user_id === user.id) {
            Alert.alert('Removed', 'You were removed from this community');
            // Soft reload to members list or index
            router.back();
          }
          if (ev.event === 'ban' && ev.target_user_id === user.id) {
            Alert.alert('Banned', 'You were banned from this community');
            router.back();
          }
        })
        .subscribe();
    } catch {}

    return () => {
      if (eventsChannelRef.current) { supabase.removeChannel(eventsChannelRef.current); eventsChannelRef.current = null; }
      // Clean up realtime subscription
      if (realtimeChannelRef.current) {
        communityService.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      try {
        supabase.removeChannel(communityChannel);
      } catch {}
      try {
        supabase.removeChannel(membershipChannel);
      } catch {}
      try {
        if (broadcastChannelRef.current) {
          supabase.removeChannel(broadcastChannelRef.current);
          broadcastChannelRef.current = null;
        }
      } catch {}
      try {
        // Remove all event channels for safety
        supabase.getChannels().forEach((ch) => {
          if (ch.topic && (ch.topic as string).startsWith(`realtime:public:community_events`)) {
            try { supabase.removeChannel(ch); } catch {}
          }
        });
      } catch {}
    };
  }, [id, loadCommunityData, router, user]);

useFocusEffect(
    React.useCallback(() => {
      if (messages.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    }, [messages.length])
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -5 : 0}
      >
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />

        <View style={[
          styles.header, 
          { backgroundColor: colors.card },
          isTablet && styles.headerTablet
        ]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={isTablet ? 20 : 24} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.communityInfo}
            onPress={handleViewMembers}
          >
            <Text style={[
              styles.communityName, 
              { color: colors.text },
              isTablet && styles.communityNameTablet
            ]} numberOfLines={1}>
              {community?.name || 'Community'}
            </Text>
            <View style={styles.communityTypeContainer}>
              <Text style={[
                styles.communityType, 
                { color: colors.textSecondary },
                isTablet && styles.communityTypeTablet
              ]}>
                {community?.type === 'private' ? 'Private Community' : 'Public Community'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.membersButton}
            onPress={handleViewMembers}
          >
            <Users size={isTablet ? 20 : 24} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.moreButton} onPress={() => setBanner({ visible: true, text: community?.is_locked ? 'Chat is locked' : community?.attachments_enabled ? 'Attachments enabled' : 'Attachments disabled', type: 'info' })}>
            <MoreVertical size={isTablet ? 20 : 24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Top banner for status */}
        {banner.visible && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <Banner visible={banner.visible} message={banner.text} type={banner.type} onClose={() => setBanner({ visible: false, text: '' })} colors={{ ...colors, error: colors.error || '#EF4444' }} />
          </View>
        )}

        {!messages || messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Info size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No messages yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Be the first to send a message!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => `${item.id}:${index}`}
            contentContainerStyle={styles.messagesList}
            keyboardShouldPersistTaps="always"
            onLayout={() => {
              if (flatListRef.current && messages && messages.length > 0) {
                try {
                  flatListRef.current.scrollToEnd({ animated: false });
                  didInitialAutoScrollRef.current = true;
                } catch {
                  console.log("Error scrolling to end: [details redacted]");
                }
              }
            }}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            initialNumToRender={20}
            ListHeaderComponent={
              loadingMore ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
            ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
          />
        )}

        {/* removed duplicate top-level suggestion lists; now rendered only above input */}

        {selectionMode && (
          <View style={[styles.selectionBar, { backgroundColor: colors.card, borderColor: colors.textSecondary + '33' }]}>
            <TouchableOpacity style={styles.selectionBtn} onPress={clearSelection}>
              <Text style={[styles.selectionBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.selectionBtn} onPress={handlePinSelected}>
              <Text style={[styles.selectionBtnText, { color: (isAdminOrOwner && selectedIds.length === 1) ? colors.primary : colors.textSecondary }]}>Pin</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectionBtn} onPress={handleDeleteSelected}>
              <Text style={[styles.selectionBtnText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        <View>
          { (showCommandMenu && commandSuggestions.length > 0) || (showMentionMenu && mentionSuggestions.length > 0) ? (
            <View style={[styles.suggestionsContainer, { backgroundColor: colors.card, borderColor: colors.textSecondary + '33' }]}>
              <ScrollView keyboardShouldPersistTaps="handled">
                {showCommandMenu && commandSuggestions.map((item) => (
                  <TouchableOpacity
                    key={item.command}
                    style={styles.commandItem}
                    onPress={() => {
                      const insertTextMap: Record<string, string> = {
                        '/lock-chat': '/lock-chat ',
                        '/unlock-chat': '/unlock-chat ',
                        '/mute @user [time]': '/mute @',
                        '/unmute @user': '/unmute @',
                        '/kick @user [reason]': '/kick @',
                        '/ban @user [reason]': '/ban @',
                        '/unban @user': '/unban @',
                        '/slowmode [seconds]': '/slowmode ',
                        '/clear [number]': '/clear ',
                        '/set-topic [text]': '/set-topic ',
                        '/pin [message-id]': '/pin ',
                        '/unpin': '/unpin ',
                        '/rules': '/rules',
                        '/announce [message]': '/announce ',
                        '/poll [q] | [opt1] | [opt2]': '/poll ',
                        '/giveaway [item] [time]': '/giveaway ',
                        '/coinflip': '/coinflip',
                        '/roll [number]': '/roll ',
                        '/whois @user': '/whois @',
                        '/stats': '/stats',
                        '/report @user [reason]': '/report @',
                      };
                      const display = insertTextMap[item.command] ?? item.command + ' ';
                      setMessageText(display);
                      setShowCommandMenu(false);
                      setTimeout(() => textInputRef.current?.focus(), 10);
                    }}
                  >
                    <Text style={[styles.commandText, { color: colors.text }]}>{item.command}</Text>
                    <Text style={[styles.commandDesc, { color: colors.textSecondary }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
                {showMentionMenu && mentionSuggestions.map((m) => (
                  <TouchableOpacity
                    key={m.user_id}
                    style={styles.commandItem}
                    onPress={() => {
                      const replaced = replaceCurrentMention(messageText, m.username || '');
                      setMessageText(replaced + ' ');
                      setShowMentionMenu(false);
                      setTimeout(() => textInputRef.current?.focus(), 10);
                    }}
                  >
                    <Text style={[styles.commandText, { color: colors.text }]}>@{m.username}</Text>
                    <Text style={[styles.commandDesc, { color: colors.textSecondary }]}>{m.role}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null }

        <View style={[
          styles.inputContainer,
          isTablet && styles.inputContainerTablet
        ]}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={async () => {
              try {
                if (!(userRole === 'owner' || userRole === 'admin' || community?.attachments_enabled)) {
                  Alert.alert('Attachments disabled', 'Only owners/admins can attach files');
                  return;
                }
                Alert.alert('Add attachment', 'Choose type', [
                  { text: 'Images', onPress: () => handleImageUpload() },
                  { text: 'Files', onPress: () => handleFileUpload() },
                  { text: 'Cancel', style: 'cancel' }
                ]);
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to attach');
              }
            }}
          >
            <Paperclip size={20} color={colors.text} />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, {
              color: colors.text,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderWidth: 0,
            }]}
            placeholder={isLocked && !(userRole === 'owner' || userRole === 'admin') ? 'Chat is locked' : 'Type a message...'}
            placeholderTextColor={colors.textSecondary}
            value={messageText}
            onChangeText={(text) => {
              setMessageText(text);
              const canUseCommands = userRole === 'owner' || userRole === 'admin';
              if (!canUseCommands) {
                setShowCommandMenu(false);
                // still allow mention suggestions
              }
              if (text.startsWith('/')) {
                const query = text.slice(1).toLowerCase();
                const allCommands: { command: string; label: string }[] = [
                  { command: '/lock-chat', label: 'Lock chat so only owner/admin can post' },
                  { command: '/unlock-chat', label: 'Unlock chat so all members can post' },
                  { command: '/mute @user [time]', label: 'Temporarily mute a member' },
                  { command: '/unmute @user', label: 'Unmute a member' },
                  { command: '/kick @user [reason]', label: 'Remove a user from the community' },
                  { command: '/ban @user [reason]', label: 'Permanently ban a user' },
                  { command: '/unban @user', label: 'Unban a user' },
                  { command: '/slowmode [seconds]', label: 'Limit how often each person can send messages' },
                  { command: '/clear [number]', label: 'Delete recent messages or all' },
                  { command: '/set-topic [text]', label: 'Set the pinned announcement/topic' },
                  { command: '/pin [message-id]', label: 'Pin a message' },
                  { command: '/unpin', label: 'Unpin the pinned message' },
                  { command: '/rules', label: 'Show community rules' },
                  { command: '/announce [message]', label: 'Send an admin announcement' },
                  { command: '/poll [q] | [opt1] | [opt2]', label: 'Start a poll (coming soon)' },
                  { command: '/giveaway [item] [time]', label: 'Start a giveaway (coming soon)' },
                  { command: '/coinflip', label: 'Flip a coin' },
                  { command: '/roll [number]', label: 'Roll a random number' },
                  { command: '/whois @user', label: 'Show user info' },
                  { command: '/stats', label: 'Show community stats (coming soon)' },
                  { command: '/report @user [reason]', label: 'Report a user to moderators' },
                ];
                const firstToken = text.trim().split(/\s+/)[0].toLowerCase();
                const commandTokens = new Set(allCommands.map(c => c.command.split(' ')[0]));
                // Only show command dropdown if the first token is NOT a recognized command yet
                if (!commandTokens.has(firstToken)) {
                  const filtered = allCommands.filter(c => c.command.toLowerCase().includes(query));
                  setCommandSuggestions(filtered);
                  setShowCommandMenu(filtered.length > 0 && canUseCommands);
                } else {
                  setShowCommandMenu(false);
                }
              } else {
                setShowCommandMenu(false);
              }

              // Mention suggestions: detect @partial at the end of current token
              const mentionMatch = text.match(/@([A-Za-z0-9_.-]*)$/);
              if (mentionMatch) {
                const q = mentionMatch[1].toLowerCase();
                const list = members.filter(m =>
                  (m.username || '').toLowerCase().includes(q)
                ).slice(0, 20);
                setMentionSuggestions(list);
                setShowMentionMenu(list.length > 0);
              } else {
                setShowMentionMenu(false);
              }
            }}
            multiline
            maxLength={1000}
            ref={textInputRef}
            editable={!isLocked || userRole === 'owner' || userRole === 'admin'}
          />
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={handleSendPress}
            disabled={!messageText.trim() || sending || (isLocked && !(userRole === 'owner' || userRole === 'admin'))}
            style={[
              styles.sendButton,
              {
                backgroundColor: (!messageText.trim() || sending || (isLocked && !(userRole === 'owner' || userRole === 'admin')))
                  ? '#cccccc'
                  : colors.primary
              }
            ]}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        </View>
      </KeyboardAvoidingView>
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
  loaderContainer: {
    padding: 16,
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
  headerTablet: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 8,
    paddingHorizontal: 12,
    minHeight: 220,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  communityInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  communityName: {
    fontSize: 18,
    fontWeight: '600',
  },
  communityNameTablet: {
    fontSize: 16,
  },
  communityTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityType: {
    fontSize: 12,
  },
  communityTypeTablet: {
    fontSize: 11,
  },
  membersButton: {
    padding: 8,
  },
  moreButton: {
    padding: 8,
    marginLeft: 8,
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
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 2,
    // maxWidth will be set dynamically based on device type
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  avatar: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  selectedBubble: {
    borderWidth: 2,
    borderColor: '#5B64F4'
  },
  currentUserBubble: {
    backgroundColor: '#5B64F4',
  },
  otherUserBubble: {
    // backgroundColor will be set dynamically using theme colors
  },
  messageUsername: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    // color will be set dynamically in the render function
  },
  messageTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
    marginTop: 2,
    opacity: 0.7,
    // color will be set dynamically in the render function
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    minHeight: 60,
  },
  inputContainerTablet: {
    paddingHorizontal: 16,
    minHeight: 56,
  },
  input: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 38,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    display: 'flex',
  },
  attachButton: {
    padding: 6,
    marginRight: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  selectionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  selectionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkWrap: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  suggestionsContainer: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 6,
    borderWidth: 1,
    maxHeight: 5 * (10 + 10 + 14 + 2 + 4)
  },
  commandItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  commandText: {
    fontSize: 14,
    fontWeight: '600',
  },
  commandDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  attachmentsContainer: {
    marginTop: 8,
  },
  attachmentItem: {
    marginBottom: 4,
  },
  imageAttachmentContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  fileAttachmentContainer: {
    borderRadius: 8,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  attachmentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  imageLoadingContainer: {
    width: 200,
    height: 150,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  imageErrorContainer: {
    width: 200,
    height: 150,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fileSizeText: {
    fontSize: 12,
    marginTop: 2,
  },
}); 
AttachmentDisplay.displayName = "AttachmentDisplay";

MessageItem.displayName = "MessageItem";
