import { Alert } from '@/lib/alert';
import { useStableEvent } from '@/hooks/useStableEvent';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Modal, useWindowDimensions, Pressable, Share, Animated, Easing, Image, Linking, TouchableWithoutFeedback } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase';

import { sendMessageWithAuth } from '@/lib/clerkAuth';
import { DMEncryptionPanel } from '@/components/DMEncryptionPanel';
import { CallButtons } from '@/components/CallControls';
import { Message as BaseMessage, FileAttachment, Theme } from '@/types';

import { Avatar } from '@/components/ui/Avatar';


import { sendReportEmail } from '@/lib/email';
import { Send, ArrowLeft, Paperclip, X, Image as ImageIcon, Trash, Mail, BellOff, AlertTriangle, Ban, Search } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';

import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { useClerk, useSession, useAuth as useClerkAuth } from '@/lib/auth';
// Removed old connector import - authentication now handled in AuthContext


import { StatusBar } from 'expo-status-bar';

// Memoized attachment display component (copied from community)
const DMAttachmentDisplay = React.memo(({ attachment, isCurrentUser, colors, getToken, onOpen, onDownload, busy }: { 
  attachment: any;
  onOpen?: () => void;
  onDownload?: () => void;
  busy?: boolean;
  isCurrentUser: boolean; 
  colors: any;
  getToken: any;
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  

  useEffect(() => {
    const loadImage = async () => {
      if (attachment.file_type.startsWith('image/')) {
        try {
          console.log("DM: Loading image for attachment: [details redacted]");
          // Get signed URL from chat-attachments bucket
          const token = await getToken().catch(() => null);
          console.log("DM: Auth token available: [details redacted]");
          const client = token ? createAuthenticatedSupabaseClient(token) : supabase;
          
          const { data, error } = await client.storage
            .from('chat-attachments')
            .createSignedUrl(attachment.storage_path, 3600);
          
          if (error) {
            console.error("DM: Signed URL error: [details redacted]");
            // Try with unauthenticated client
            const { data: fallbackData, error: fallbackError } = await supabase.storage
              .from('chat-attachments')
              .createSignedUrl(attachment.storage_path, 3600);
            
            if (!fallbackError && fallbackData?.signedUrl) {
              setImageUrl(fallbackData.signedUrl);
              console.log("DM: Fallback signed URL worked [details redacted]");
            } else {
              // Last resort: public URL
              const { data: publicData } = supabase.storage.from('chat-attachments').getPublicUrl(attachment.storage_path);
              if (publicData?.publicUrl) {
                setImageUrl(publicData.publicUrl);
                console.log("DM: Using public URL fallback [details redacted]");
              }
            }
          } else if (data?.signedUrl) {
            setImageUrl(data.signedUrl);
            console.log("DM: Image URL set successfully [details redacted]");
          }
          console.log("DM: Got signed URL result for [details redacted]");
        } catch {
          console.error("DM: Error loading image: [details redacted]");
        }
      }
      setLoading(false);
    };
    loadImage();
  }, [attachment.storage_path, attachment.file_type, getToken]);

  if (attachment.file_type.startsWith('image/')) {
    return (
      <TouchableOpacity onPress={onOpen} style={styles.imageAttachmentContainer}>
        {loading ? (
          <View style={styles.imageLoadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : imageUrl ? (
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.dmAttachmentImage}
            resizeMode="cover"
            onLoad={() => console.log("DM: Image rendered successfully [details redacted]")}
            onError={(e) => console.log("DM: Image render error: [details redacted]")}
          />
        ) : (
          <View style={styles.imageErrorContainer}>
            <Text style={[styles.attachmentText, { color: isCurrentUser ? '#FFFFFF' : colors.text }]}>
              📷 {attachment.file_name}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity accessibilityState={{ busy }} onPress={onDownload} style={styles.fileAttachmentContainer}>
      <Text style={[styles.attachmentText, { color: isCurrentUser ? '#FFFFFF' : colors.text }]}>
        📎 {attachment.file_name}
      </Text>
      <Text style={[styles.fileSizeText, { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
        {formatFileSize(attachment.file_size)}
      </Text>
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

// Extended Message type with read property
interface Message extends BaseMessage {
  read: boolean;
}

// Extended User type with online and last_seen properties
interface User {
  id: string;
  username: string;
  email?: string;
  online?: boolean;
  last_seen?: string | null;
  created_at?: string;
  bio?: string;
}

type SelectedFile = {
  uri: string;
  name: string;
  mimeType?: string;
  size: number;
  type?: string;
};



// Constants
const MESSAGES_PER_PAGE = 20;
 // 1s

const MessageItem = React.memo(({
  item,
  isOwnMessage,
  colors,
  imageCache,
  setImageCache,
  loadImageUrl,
  getSignedUrl,
  onDelete,
  onLoadAttachments,
  isSelectionMode,
  selectedMessages,
  onMessageSelect,
  imageUrls,
  setImageUrls,
  theme,
  getToken
}: {
  item: Message;
  isOwnMessage: boolean;
  colors: any;
  imageCache: Record<string, string>;
  setImageCache: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  loadImageUrl: (attachment: FileAttachment) => Promise<void>;
  getSignedUrl: (storagePath: string) => Promise<string | null>;
  onDelete: (messageId: string) => Promise<void>;
  onLoadAttachments: () => void;
  isSelectionMode: boolean;
  selectedMessages: Set<string>;
  onMessageSelect: (messageId: string) => void;
  imageUrls: Record<string, string>;
  setImageUrls: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  theme: Theme;
  getToken: any;
}) => {
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const requestedImages = useRef(new Set<string>());
  const [downloadingAttachment, setDownloadingAttachment] = useState<string | null>(null);
  const messageDate = new Date(item.timestamp);

  // Get bubble and text colors based on theme and message sender
  const getBubbleStyle = () => {
    if (isOwnMessage) {
      return {
        backgroundColor: colors.messageBubbleSent
      };
    } else {
      return {
        backgroundColor: colors.messageBubbleReceived
      };
    }
  };

  const getTextStyle = () => {
    if (isOwnMessage) {
      return {
        color: colors.messageBubbleTextSent
      };
    } else {
      return {
        color: colors.messageBubbleTextReceived
      };
    }
  };

  const getTimeStyle = () => {
    if (isOwnMessage) {
      return {
        color: 'rgba(255,255,255,0.7)'
      };
    } else {
      return {
        color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'
      };
    }
  };

  const handleImagePress = async (attachment: FileAttachment) => {
    try {
      if (attachment.file_type.startsWith('image/')) {
        await loadImageUrl(attachment);
      } else {
        const url = await getSignedUrl(attachment.storage_path);
        if (url) {
          Linking.openURL(url);
        }
      }
    } catch {
      console.error("Error handling image press: [details redacted]");
    }
  };

  const handleDownloadAttachment = async (attachment: FileAttachment) => {
    try {
      setDownloadingAttachment(attachment.id);

      // Get a signed URL for the attachment
      const url = await getSignedUrl(attachment.storage_path);

      if (!url) {
        Alert.alert('Error', 'Could not generate download link');
        return;
      }

      // On iOS, we can use the Share API to save images
      if (Platform.OS === 'ios') {
        // For images, download and then share
        if (attachment.file_type.startsWith('image/')) {
          const localFile = `${FileSystem.cacheDirectory}${attachment.file_name}`;

          // Download the file
          const { uri } = await FileSystem.downloadAsync(url, localFile);

          // Share the file
          await Share.share({
            url: uri,
            title: attachment.file_name,
          });
        } else {
          // For other files, just open the URL
          Linking.openURL(url);
        }
      } else {
        // On Android, we can use the Linking API to open the URL
        Linking.openURL(url);
      }
    } catch {
      console.error("Error downloading attachment: [details redacted]");
      Alert.alert('Download Failed', 'Could not download the file');
    } finally {
      setDownloadingAttachment(null);
    }
  };

  // Load signed URLs for images when component mounts - now using parent's imageUrls
  

  useEffect(() => {
    console.log("DM MessageItem attachments: [details redacted]");
    if (item.attachments) {
      item.attachments.forEach(attachment => {
        console.log("DM Processing attachment: [details redacted]");
        if (attachment.file_type.startsWith('image/') && !imageUrls[attachment.storage_path] && !loadingImages[attachment.storage_path] && !requestedImages.current.has(attachment.storage_path)) {
          requestedImages.current.add(attachment.storage_path);
          setLoadingImages(prev => ({ ...prev, [attachment.storage_path]: true }));
          getSignedUrl(attachment.storage_path).then(url => {
            console.log("DM image signed URL result: [details redacted]");
            if (url) {
              setImageUrls(prev => ({ ...prev, [attachment.storage_path]: url }));
            }
            setLoadingImages(prev => ({ ...prev, [attachment.storage_path]: false }));
          });
        }
      });
    }
  }, [getSignedUrl, imageUrls, item.attachments, loadingImages, setImageUrls]);

  return (
    <TouchableOpacity
      style={[
        styles.messageContainer,
        isOwnMessage ? styles.currentUserMessage : styles.otherUserMessage,
      ]}
      onLongPress={() => onMessageSelect(item.id)}
      onPress={() => isSelectionMode && onMessageSelect(item.id)}
      activeOpacity={isSelectionMode ? 0.8 : 1}
    >
      <View style={[
        styles.messageBubbleLarge,
        getBubbleStyle(),
        isSelectionMode && selectedMessages.has(item.id) && styles.selectedBubble,
      ]}>
        <Text style={[styles.messageText, getTextStyle()]}>
          {item.content}
        </Text>

        {/* Attachments - using improved system */}
        {item.attachments && item.attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            {item.attachments.map((attachment: any) => (
              <DMAttachmentDisplay 
                key={attachment.id} 
                attachment={attachment} 
                isCurrentUser={isOwnMessage}
                colors={colors}
                getToken={getToken}
                onOpen={() => handleImagePress(attachment)}
                onDownload={() => handleDownloadAttachment(attachment)}
                busy={downloadingAttachment === attachment.id}
              />
            ))}
          </View>
        )}

        <Text style={[styles.messageTime, getTimeStyle()]}> 
          {messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {isSelectionMode && (
          <View style={[styles.checkWrap, { borderColor: selectedMessages.has(item.id) ? colors.primary : colors.textSecondary + '55', backgroundColor: selectedMessages.has(item.id) ? colors.primary : 'transparent' }]}>
            {selectedMessages.has(item.id) && <View style={styles.checkDot} />}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});



const AnimatedError = ({ children, style }: { children: React.ReactNode; style?: any }) => {
  return (
    <View style={[style]}>
      {children}
    </View>
  );
};

const AnimatedFilePreview = ({ children, index }: { children: React.ReactNode; index: number }) => {
  return (
    <View style={styles.selectedFilePreview}>
      {children}
    </View>
  );
};

// Helper function to generate unique IDs that are compatible with Supabase UUID
const generateUniqueId = () => {
  return uuidv4(); // Use the UUID v4 function imported from uuid package
};

// Add the loadImageSignedUrl function back
const loadImageSignedUrl = async (storagePath: string, imageCache: Record<string, string>, setImageCache: React.Dispatch<React.SetStateAction<Record<string, string>>>, setImageUrls: React.Dispatch<React.SetStateAction<Record<string, string>>>, setLoadingImages: React.Dispatch<React.SetStateAction<Record<string, boolean>>>) => {
  try {
    setLoadingImages(prev => ({ ...prev, [storagePath]: true }));

    // First check cache
    if (imageCache[storagePath]) {
      setImageUrls(prev => ({ ...prev, [storagePath]: imageCache[storagePath] }));
      setLoadingImages(prev => ({ ...prev, [storagePath]: false }));
      return;
    }

    // Get a new signed URL
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(storagePath, 3600);

    if (error) {
      console.log("Operation diagnostic [details redacted]");

      // Try to get a public URL instead
      const { data: publicUrlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(storagePath);

      if (publicUrlData?.publicUrl) {
        setImageCache(prev => ({ ...prev, [storagePath]: publicUrlData.publicUrl }));
        setImageUrls(prev => ({ ...prev, [storagePath]: publicUrlData.publicUrl }));
      } else {
        console.error("Could not get URL for image: [details redacted]");
      }

      setLoadingImages(prev => ({ ...prev, [storagePath]: false }));
      return;
    }

    if (data?.signedUrl) {
      setImageCache(prev => ({ ...prev, [storagePath]: data.signedUrl }));
      setImageUrls(prev => ({ ...prev, [storagePath]: data.signedUrl }));
    }
  } catch {
    console.error("Error loading signed URL: [details redacted]");
  } finally {
    setLoadingImages(prev => ({ ...prev, [storagePath]: false }));
  }
};

export default function ChatScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors, theme } = useTheme();
  const { user: currentUser } = useAuth();
  // Add the clerk hooks at the component level
  const { user: clerkUser } = useClerk();
  useSession();
  const { getToken } = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useState('');
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [, setLoadingImages] = useState<Record<string, boolean>>({});
  useState<string | null>(null);
  const [, setSelectedImageName] = useState<string | null>(null);
  const [, setViewingImage] = useState<string | null>(null);
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [, setIsKeyboardVisible] = useState(false);
  const [storageSaved] = useState<number>(0);
  const [showStorageSaved] = useState<boolean>(false);
  useState(false);
  useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reportUserId, setReportUserId] = useState<string | null>(null);
  const [blockUserId, setBlockUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  useWindowDimensions();
  useSafeAreaInsets();

  // Authentication is now handled automatically in AuthContext

  // Functions for handling report and block
  const handleUnblock = async (userId: string, username: string) => {
    try {
      if (!currentUser?.id || !userId) {
        throw new Error('Unable to unblock user: Missing user information');
      }

      // Delete block record
      const { error: unblockError } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', userId);

      if (unblockError) {
        throw unblockError;
      }

      Alert.alert('Success', `${username} has been unblocked`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to unblock user');
    }
  };

  const handleBlock = async (userId: string, username: string) => {
    try {
      if (!currentUser?.id || !userId) {
        throw new Error('Unable to block user: Missing user information');
      }

      // Check if already blocked
      const { data: existingBlock } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', userId)
        .maybeSingle();

      if (existingBlock) {
        Alert.alert('User already blocked', 'Unblock this user?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Unblock', onPress: () => handleUnblock(userId, username) }]);
        return;
      }

      // Show custom block modal
      setBlockUserId(userId);
      setShowBlockModal(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to block user');
    }
  };

  const confirmBlock = async () => {
    try {
      if (!currentUser?.id || !blockUserId) {
        throw new Error('Unable to block user: Missing user information');
      }

      // Create block record
      const { error: blockError } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: currentUser.id,
          blocked_id: blockUserId,
          reason: 'Blocked by user'
        });

      if (blockError) {
        throw blockError;
      }

      setShowBlockModal(false);
      Alert.alert('Success', `${user?.username} has been blocked`);
      router.back(); // Return to previous screen since we can't chat anymore
    } catch (err: any) {
      setShowBlockModal(false);
      Alert.alert('Error', err.message || 'Failed to block user');
    }
  };

  const handleReport = async (userId: string, username: string) => {
    try {
      if (!currentUser?.id || !userId) {
        throw new Error('Unable to report user: Missing user information');
      }

      // Show custom report modal
      setReportUserId(userId);
      setShowReportModal(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to report user');
    }
  };

  const submitReport = async (userId: string, reason: string) => {
    try {
      if (!currentUser?.id) {
        throw new Error('You must be logged in to report a user');
      }

      // Get reported user details
      const { data: reportedUser } = await supabase
        .from('users')
        .select('username')
        .eq('id', userId)
        .single();

      if (!reportedUser) {
        throw new Error('Could not find the reported user');
      }

      // Create report record
      const { error: reportError } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: currentUser.id,
          reported_id: userId,
          reason: reason,
          status: 'pending'
        });

      if (reportError) {
        throw reportError;
      }

      // Send email notification
      sendReportEmail(
        currentUser.id,
        currentUser.username || 'Unknown User',
        userId,
        reportedUser.username || 'Unknown User',
        reason
      ).catch(error => {
        console.error("Failed to send report email: [details redacted]");
        // Continue with the flow even if email fails
      });

      Alert.alert(
        'Report Submitted',
        'Thank you for your report. Our moderation team will review it shortly.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit report');
    }
  };

  const handleShare = async (username: string) => {
    try {
      await Share.share({
        message: `Check out ${username}'s profile!`
      });
    } catch {
      console.error("Operation diagnostic [details redacted]");
    }
  };

  const handleActionPress = (action: 'mute' | 'share' | 'report' | 'block') => {
    if (!user) return;

    switch (action) {
      case 'mute':
        router.push(`/chat/settings/${username}`);
        break;
      case 'share':
        handleShare(user.username);
        break;
      case 'report':
        handleReport(user.id, user.username);
        break;
      case 'block':
        handleBlock(user.id, user.username);
        break;
    }
  };

  // Load attachments and preload images for messages
  const loadAttachmentsWithImages = async (messagesToProcess: Message[]) => {
    try {
      setLoadingAttachments(true);

      // Fetch attachments for the specified messages
      const messageIds = messagesToProcess.map(msg => msg.id);

      // Only attempt to fetch if we have messages
      if (messageIds.length === 0) {
        setLoadingAttachments(false);
        return;
      }

      const { data: attachments, error } = await supabase
        .from('file_attachments')
        .select('*')
        .in('message_id', messageIds);

      if (error) {
        console.error("Error fetching attachments: [details redacted]");
        throw error;
      }

      // Group attachments by message_id
      const attachmentsByMessage: Record<string, FileAttachment[]> = {};
      attachments?.forEach(attachment => {
        if (!attachmentsByMessage[attachment.message_id]) {
          attachmentsByMessage[attachment.message_id] = [];
        }
        attachmentsByMessage[attachment.message_id].push(attachment);
      });

      // Update messages with attachments
      console.log("DM: Loaded attachments for [details redacted]");
      console.log("DM: Updating [details redacted]");
      setMessages(prevMessages =>
        prevMessages.map(msg => ({
          ...msg,
          attachments: attachmentsByMessage[msg.id] || msg.attachments || []
        }))
      );

      // Preload image URLs for all image attachments
      if (attachments) {
        const imageAttachments = attachments.filter(att => att.file_type.startsWith('image/'));

        // Process images in batches to avoid overwhelming the system
        const batchSize = 5;
        for (let i = 0; i < imageAttachments.length; i += batchSize) {
          const batch = imageAttachments.slice(i, i + batchSize);
          await Promise.all(
            batch.map(attachment =>
              loadImageSignedUrl(
                attachment.storage_path,
                imageCache,
                setImageCache,
                setImageUrls,
                setLoadingImages
              )
            )
          );
        }
      }
    } catch {
      console.error("Error loading attachments: [details redacted]");
    } finally {
      setLoadingAttachments(false);
    }
  };


  // Set up keyboard event listeners
  

  // Close header menu when user interacts with other parts of the app
  

  // Define fetchUserAndMessages function
  const fetchUserAndMessages = useStableEvent(async (pageNumber = 0, append = false) => {
    try {
      if (!currentUser) {
        throw new Error('You must be logged in to view messages');
      }

      if (pageNumber === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      // Get existing message IDs to avoid duplicates
      const existingMessageIds = new Set(messages.map(msg => msg.id));

      // Fetch user profile
      if (pageNumber === 0 || !user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .single();

        if (userError) {
          throw new Error(`Failed to fetch user: ${userError.message}`);
        }

        if (!userData) {
          console.warn("User not found, but will still try to fetch messages [details redacted]");
          // We'll continue without throwing an error
        }

        setUser(userData || {
          id: 'unknown',
          username: username as string
        });

        // Calculate offset for pagination
        const offset = pageNumber * MESSAGES_PER_PAGE;

        // Fetch messages with pagination - using a simpler query that works for new users
        let { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${currentUser.id},receiver_username.eq.${username}),and(receiver_username.eq.${currentUser.username},sender_id.eq.${userData.id})`)
          .order('timestamp', { ascending: false })
          .range(offset, offset + MESSAGES_PER_PAGE - 1);

        if (messagesError) {
          throw new Error(`Failed to fetch messages: ${messagesError.message}`);
        }

        // Filter out messages user deleted for self
        if (messagesData && messagesData.length > 0) {
          const ids = messagesData.map(m => m.id);
          const { data: deletedRows } = await supabase
            .from('user_message_deletes')
            .select('message_id')
            .eq('user_id', currentUser.id)
            .in('message_id', ids);
          const deletedIds = new Set((deletedRows || []).map(r => r.message_id));
          messagesData = messagesData.filter(m => !deletedIds.has(m.id));
        }

        // Check if there are more messages to load
        setHasMoreMessages(messagesData?.length === MESSAGES_PER_PAGE);

        // Update messages state
        if (append && messagesData) {
          // Filter out any duplicates
          const newMessages = messagesData.filter(msg => !existingMessageIds.has(msg.id));
          if (newMessages.length > 0) {
            setMessages(prevMessages => [...prevMessages, ...newMessages]);
          }
        } else {
          setMessages(messagesData || []);
          // Immediately load attachments for the initial messages
          if (messagesData && messagesData.length > 0) {
            // We need to wait for the state update to complete before loading attachments
            setTimeout(() => loadAttachmentsWithImages(messagesData), 100);
          }
        }
      } else {
        // We already have the user, just fetch more messages
        const offset = pageNumber * MESSAGES_PER_PAGE;

        let { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${currentUser.id},receiver_username.eq.${username}),and(receiver_username.eq.${currentUser.username},sender_id.eq.${user.id})`)
          .order('timestamp', { ascending: false })
          .range(offset, offset + MESSAGES_PER_PAGE - 1);

        if (messagesError) {
          throw new Error(`Failed to fetch messages: ${messagesError.message}`);
        }

        // Filter out messages user deleted for self
        if (messagesData && messagesData.length > 0) {
          const ids = messagesData.map(m => m.id);
          const { data: deletedRows } = await supabase
            .from('user_message_deletes')
            .select('message_id')
            .eq('user_id', currentUser.id)
            .in('message_id', ids);
          const deletedIds = new Set((deletedRows || []).map(r => r.message_id));
          messagesData = messagesData.filter(m => !deletedIds.has(m.id));
        }

        // Check if there are more messages to load
        setHasMoreMessages(messagesData?.length === MESSAGES_PER_PAGE);

        // Update messages state
        if (append && messagesData) {
          // Filter out any duplicates
          const newMessages = messagesData.filter(msg => !existingMessageIds.has(msg.id));
          if (newMessages.length > 0) {
            setMessages(prevMessages => [...prevMessages, ...newMessages]);
            // Immediately load attachments for the new messages
            setTimeout(() => loadAttachmentsWithImages(newMessages), 100);
          }
        } else {
          setMessages(messagesData || []);
          // Immediately load attachments for the initial messages
          if (messagesData && messagesData.length > 0) {
            setTimeout(() => loadAttachmentsWithImages(messagesData), 100);
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching messages: [details redacted]");
      setError(err.message || 'Failed to load chat');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  });

  // Add a function to load more messages when scrolling up
  const loadMoreMessages = () => {
    if (hasMoreMessages && !loadingMore && user) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchUserAndMessages(nextPage, true);
    }
  };

  // Initialize the chat screen
  

  // Custom header component
  const renderHeader = () => {
    if (isSelectionMode) {
      // Mirror community header: just show count and a close icon; actions are at bottom bar
      return (
        <View style={[styles.selectionHeader, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={exitSelectionMode}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.selectionCount, { color: colors.text }]}>
            {selectedMessages.size}
          </Text>
          <View style={{ flex: 1 }} />
        </View>
      );
    }

    return (
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: colors.background,
          }
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerBackButton}
            accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()}
            hitSlop={{ top: 13, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerUserInfo}>
            <Avatar
              size={30}
              username={username as string}
            />
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {username}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {user?.id && <CallButtons peerId={user.id} />}
          <TouchableOpacity
            style={styles.headerAction}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <Search size={20} color={colors.text} />
          </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerAction}
                onPress={() => setIsSelectionMode(true)}
                hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
              >
                <Trash size={20} color={colors.text} />
              </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render header menu separately to ensure it's on top of all content
  const renderHeaderMenu = () => {
    if (!showHeaderMenu) return null;

    return (
      <>
        <Pressable
          style={[StyleSheet.absoluteFill, { zIndex: 9998 }]}
          onPress={() => setShowHeaderMenu(false)}
        />
        <View
          style={[
            styles.headerMenu,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
        >
          <TouchableOpacity
            style={styles.headerMenuItem}
            onPress={() => {
              setShowHeaderMenu(false);
              router.push(`/chat/media/${username}`);
            }}
          >
            <View style={[styles.headerMenuIcon, { backgroundColor: colors.primary + '20' }]}>
              <ImageIcon size={16} color={colors.primary} />
            </View>
            <Text style={[styles.headerMenuText, { color: colors.text }]} numberOfLines={1}>Media & Files</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerMenuItem}
            onPress={() => {
              setShowHeaderMenu(false);
              router.push(`/chat/contact/${username}`);
            }}
          >
            <View style={[styles.headerMenuIcon, { backgroundColor: colors.primary + '20' }]}>
              <Mail size={16} color={colors.primary} />
            </View>
            <Text style={[styles.headerMenuText, { color: colors.text }]} numberOfLines={1}>View Contact</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerMenuItem}
            onPress={() => {
              setShowHeaderMenu(false);
              router.push(`/chat/settings/${username}`);
            }}
          >
            <View style={[styles.headerMenuIcon, { backgroundColor: colors.primary + '20' }]}>
              <BellOff size={16} color={colors.primary} />
            </View>
            <Text style={[styles.headerMenuText, { color: colors.text }]} numberOfLines={1}>Mute Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerMenuItem}
            onPress={() => {
              setShowHeaderMenu(false);
              handleActionPress('block');
            }}
          >
            <View style={[styles.headerMenuIcon, { backgroundColor: colors.error + '20' }]}>
              <Ban size={16} color={colors.error} />
            </View>
            <Text style={[styles.headerMenuText, { color: colors.error }]} numberOfLines={1}>Block User</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerMenuItem}
            onPress={() => {
              setShowHeaderMenu(false);
              handleActionPress('report');
            }}
          >
            <View style={[styles.headerMenuIcon, { backgroundColor: colors.error + '20' }]}>
              <AlertTriangle size={16} color={colors.error} />
            </View>
            <Text style={[styles.headerMenuText, { color: colors.error }]} numberOfLines={1}>Report User</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  // Handle attachment button press
  const handleAttachmentPress = () => {
    Alert.alert(
      'Send Attachment',
      'Choose attachment type',
      [
        {
          text: 'Photo',
          onPress: () => pickImage(),
        },
        {
          text: 'Document',
          onPress: () => pickDocument(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  // Simplified image picker for DMs
  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow photo library access to pick images.');
        return;
      }
      
      // Handle different ImagePicker versions - use deprecated option for compatibility
      const mediaTypes: any = ImagePicker.MediaTypeOptions?.Images || 'Images';
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: true,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Compress image
        const compressedImage = await optimizeFile(asset.uri, 'image/jpeg');

        // Add to selected files
        setSelectedFiles(prev => [
          ...prev,
          {
            uri: compressedImage.uri,
            name: asset.fileName || `image-${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
            size: 0, // We'll calculate this during upload
            type: 'image',
          },
        ]);
      }
    } catch {
      console.error("Error picking image: [details redacted]");
      Alert.alert('Error', 'Failed to select image');
    }
  };

  // Pick document
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Check file size limit (10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
        if (asset.size && asset.size > MAX_FILE_SIZE) {
          Alert.alert(
            'File Too Large',
            'The selected file exceeds the 10MB limit. Please choose a smaller file.'
          );
          return;
        }

        // Process file if needed
        let processedUri = asset.uri;
        let processedSize = asset.size || 0;
        let processedName = asset.name;

        // If it's a PDF and over 1MB, show compression option
        if (asset.mimeType === 'application/pdf' && asset.size && asset.size > 1024 * 1024) {
          const shouldCompress = await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Large PDF Detected',
              'Would you like to compress this PDF to save storage?',
              [
                { text: 'No', onPress: () => resolve(false) },
                { text: 'Yes', onPress: () => resolve(true) },
              ]
            );
          });

          if (shouldCompress) {
            // In a real implementation, you would use a PDF compression library
            // For now, we'll just inform the user that compression would happen
            Alert.alert(
              'PDF Compression',
              'In a production app, the PDF would be compressed here. For this demo, we\'ll proceed with the original file.'
            );
            // In a real implementation:
            // processedUri = await compressPdf(asset.uri);
            // const compressedInfo = await FileSystem.getInfoAsync(processedUri);
            // processedSize = compressedInfo.exists && compressedInfo.size ? compressedInfo.size : asset.size || 0;
          }
        }

        // Add to selected files
        setSelectedFiles(prev => [
          ...prev,
          {
            uri: processedUri,
            name: processedName,
            mimeType: asset.mimeType || 'application/octet-stream',
            size: processedSize,
            type: 'document',
          },
        ]);
      }
    } catch {
      console.error("Error picking document: [details redacted]");
      Alert.alert('Error', 'Failed to select document');
    }
  };

  // Function to optimize file size based on type (for future implementation)
  const optimizeFile = async (uri: string, mimeType: string | undefined): Promise<{ uri: string, size: number, originalSize: number }> => {
    // Get original file info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = fileInfo.exists && fileInfo.size ? fileInfo.size : 0;

    // If file is small enough, don't optimize
    if (originalSize < 500 * 1024) { // Less than 500KB
      return { uri, size: originalSize, originalSize };
    }

    // Handle different file types
    if (mimeType?.startsWith('image/')) {
      // For images, use ImageManipulator
      const compressedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );

      const compressedInfo = await FileSystem.getInfoAsync(compressedImage.uri);
      const compressedSize = compressedInfo.exists && compressedInfo.size ? compressedInfo.size : originalSize;

      return { uri: compressedImage.uri, size: compressedSize, originalSize };
    }

    // For other file types, return original for now
    // In a production app, you would implement specific optimizations for different file types
    return { uri, size: originalSize, originalSize };
  };

  // Remove selected file
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle sending message with attachments
  const handleSendPress = async () => {
    if (!inputText.trim() && selectedFiles.length === 0) return;

    try {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }
      if (selectedFiles.length) throw new Error('Encrypted attachments are not implemented. Remove attachments to send encrypted DM text; legacy attachment source remains available for review.');

      // Generate message ID
      const messageId = generateUniqueId();

      // Keep any text content that was entered
      let messageContent = inputText.trim();

      // Create message object
      const newMessage: Message = {
        id: messageId,
        sender_id: currentUser.id,
        receiver_username: username as string,
        content: messageContent,
        timestamp: new Date().toISOString(),
        read: false,
      };

      setSendError(null); // Keep the draft and history until persistence succeeds.

      // Send message using secure Clerk authentication
      const token = await getToken();

      if (!token || !clerkUser?.id) {
        throw new Error('No authentication token available');
      }

      const { error: messageError } = await sendMessageWithAuth(
        token,
        clerkUser.id,
        newMessage
      );

      if (messageError) {
        console.error("Error sending message: [details redacted]");
        throw new Error(`Failed to send message: ${messageError.message}`);
      }

      setInputText('');
      setMessages(prev => prev.some(item => item.id === newMessage.id) ? prev : [newMessage, ...prev]);

      // Handle file attachments if any
      if (selectedFiles.length > 0) {
        console.log("Uploading [details redacted]");
        
        try {
          const attachToken = await getToken().catch(() => null);
          const storageClient = attachToken ? createAuthenticatedSupabaseClient(attachToken) : supabase;
          const uploadedAttachments: any[] = [];
          
          for (const file of selectedFiles) {
            try {
              // Read file as base64
              const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
              const uint8 = Buffer.from(base64, 'base64');
              const fileSize = Math.floor((base64.length * 3) / 4);
              const storagePath = `${messageId}/${Date.now()}_${file.name}`;
              
              // Upload to storage
              const { data: uploadData, error: upErr } = await storageClient.storage
                .from('chat-attachments')
                .upload(storagePath, uint8, { 
                  contentType: file.mimeType || 'application/octet-stream',
                  upsert: false 
                });
              
              if (upErr) {
                console.error("Storage upload error: [details redacted]");
                continue;
              }

              // Insert attachment record
              const { data: attachmentData, error: insErr } = await storageClient
                .from('file_attachments')
                .insert({
                  message_id: messageId,
                  file_name: file.name,
                  file_type: file.mimeType || 'application/octet-stream',
                  file_size: fileSize,
                  storage_path: uploadData?.path || storagePath,
                })
                .select()
                .single();
              
              if (insErr) {
                console.error("Attachment DB insert error: [details redacted]");
                continue;
              }
              
              if (attachmentData) {
                uploadedAttachments.push(attachmentData);
                console.log("DM attachment uploaded: [details redacted]");
              }
            } catch {
              console.error("Error uploading file [details redacted]");
            }
          }
          
          // Update local message with attachments
          if (uploadedAttachments.length > 0) {
            console.log("DM attachments uploaded: [details redacted]");
            setMessages(prev => prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, attachments: uploadedAttachments }
                : msg
            ));
            console.log("Updated message with [details redacted]");
          }
        } catch {
          console.error("Overall attachment upload error: [details redacted]");
        }
      }

      // Clear selected files
      setSelectedFiles([]);

    } catch (err: any) {
      console.error("Error sending message: [details redacted]");
      setSendError(err.message || 'Failed to send message');
      Alert.alert('Error', err.message || 'Failed to send message');
    }
  };

  // Format bytes to readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render selected files preview
  const renderSelectedFiles = () => {
    if (selectedFiles.length === 0) return null;

    return (
      <View style={styles.selectedFilesContainer}>
        <FlatList
          data={selectedFiles}
          horizontal
          keyExtractor={(_, index) => `selected-file-${index}`}
          renderItem={({ item, index }) => (
            <AnimatedFilePreview index={index}>
              <View style={styles.selectedFilePreview}>
                {item.type === 'image' ? (
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.selectedFileImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.filePreviewPlaceholder, { backgroundColor: colors.card }]}>
                    <Paperclip size={24} color={colors.primary} />
                    <Text style={[styles.filePreviewName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeFileButton}
                  onPress={() => removeSelectedFile(index)}
                >
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </AnimatedFilePreview>
          )}
        />
      </View>
    );
  };

  // Load image URL for viewing
  const loadImageUrl = async (attachment: FileAttachment) => {
    try {
      const url = await getSignedUrl(attachment.storage_path);
      if (url) {
        setViewingImage(url);
        setSelectedImageName(attachment.file_name);
      }
    } catch {
      console.error("Error loading image URL: [details redacted]");
    }
  };

  // Get signed URL for attachments
  const getSignedUrl = useStableEvent(async (storagePath: string): Promise<string | null> => {
    try {
      // First check cache
      if (imageCache[storagePath]) {
        return imageCache[storagePath];
      }

      // Get a new signed URL
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(storagePath, 3600);

      if (error) {
        console.log("Operation diagnostic [details redacted]");

        // Try to get a public URL instead
        const { data: publicUrlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(storagePath);

        if (publicUrlData?.publicUrl) {
          setImageCache(prev => ({ ...prev, [storagePath]: publicUrlData.publicUrl }));
          return publicUrlData.publicUrl;
        } else {
          console.error("Could not get URL for image: [details redacted]");
          return null;
        }
      }

      if (data?.signedUrl) {
        setImageCache(prev => ({ ...prev, [storagePath]: data.signedUrl }));
        return data.signedUrl;
      }

      return null;
    } catch {
      console.error("Error getting signed URL: [details redacted]");
      return null;
    }
  });

  // Handle loading attachments for a message
  const handleLoadAttachments = useStableEvent(async () => {
    try {
      setLoadingAttachments(true);

      // Fetch attachments for all messages
      const messageIds = messages.map(msg => msg.id);

      // Only attempt to fetch if we have messages
      if (messageIds.length === 0) {
        setLoadingAttachments(false);
        return;
      }


      const { data: attachments, error } = await supabase
        .from('file_attachments')
        .select('*')
        .in('message_id', messageIds);

      if (error) {
        console.error("Error fetching attachments: [details redacted]");
        throw error;
      }

      // Group attachments by message_id
      const attachmentsByMessage: Record<string, FileAttachment[]> = {};
      attachments?.forEach(attachment => {
        if (!attachmentsByMessage[attachment.message_id]) {
          attachmentsByMessage[attachment.message_id] = [];
        }
        attachmentsByMessage[attachment.message_id].push(attachment);
      });

      // Update messages with attachments
      setMessages(prevMessages =>
        prevMessages.map(msg => ({
          ...msg,
          attachments: attachmentsByMessage[msg.id] || []
        }))
      );
    } catch {
      console.error("Error loading attachments: [details redacted]");
      Alert.alert('Error', 'Failed to load attachments. Please try again.');
    } finally {
      setLoadingAttachments(false);
    }
  });

  // Delete a message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        throw error;
      }

      // Remove message from local state
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch {
      console.error("Error deleting message: [details redacted]");
      Alert.alert('Error', 'Failed to delete message');
    }
  };

  // Handle message selection
  const handleMessageSelect = (messageId: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }

    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
        if (newSet.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Load attachments when messages are loaded
  

  // Function to mark messages as read
  const markMessagesAsRead = useStableEvent(async () => {
    if (!currentUser || !user || messages.length === 0) return;

    try {
      // Find unread messages sent to current user
      const unreadMessages = messages.filter(
        msg => !msg.read && msg.sender_id === user.id && msg.receiver_username === currentUser.username
      );

      if (unreadMessages.length === 0) return;

      console.log("Operation diagnostic [details redacted]");

      // Get IDs of unread messages
      const unreadIds = unreadMessages.map(msg => msg.id);

      // Update messages in database
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .in('id', unreadIds);

      if (error) {
        console.error("Error marking messages as read: [details redacted]");
        return;
      }

      // Update messages in local state
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          unreadIds.includes(msg.id) ? { ...msg, read: true } : msg
        )
      );

      console.log("Messages marked as read successfully [details redacted]");
    } catch {
      console.error("Error in markMessagesAsRead: [details redacted]");
    }
  });

  // Mark messages as read when viewed
  

  // Mark messages as read when the screen comes into focus
  

  // Set up real-time subscription for new messages
  

  const deleteSelectedMessages = async () => {
    try {
      if (selectedMessages.size === 0) return;
      Alert.alert(
        'Delete Messages',
        'Choose how you want to delete the selected messages',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete for me',
            onPress: async () => {
              try {
                const ids = Array.from(selectedMessages);
                const rows = ids.map(id => ({ user_id: currentUser?.id, message_id: id }));
                const { error } = await supabase.from('user_message_deletes').upsert(rows);
                if (error) throw error;
                setMessages(prev => prev.filter(m => !selectedMessages.has(m.id)));
                exitSelectionMode();
              } catch {
                console.error("Operation diagnostic [details redacted]");
                Alert.alert('Error', 'Failed to delete for me');
              }
            }
          },
          {
            text: 'Delete for both',
            style: 'destructive',
            onPress: async () => {
              try {
                const messageIds = Array.from(selectedMessages);
                // Only allow deleting messages sent by current user
                const ownMessageIds = messageIds.filter(id => {
                  const msg = messages.find(m => m.id === id);
                  return msg && msg.sender_id === currentUser?.id;
                });
                const otherMessageIds = messageIds.filter(id => !ownMessageIds.includes(id));

                if (ownMessageIds.length === 0) {
                  Alert.alert('Not allowed', 'You can only delete your own messages for everyone.');
                  return;
                }

                const { error } = await supabase
                  .from('messages')
                  .delete()
                  .in('id', ownMessageIds);
                if (error) throw error;
                setMessages(prev => prev.filter(m => !ownMessageIds.includes(m.id)));
                if (otherMessageIds.length > 0) {
                  Alert.alert('Partial delete', 'Some selected messages were not yours and were not deleted for everyone. Use Delete for me instead.');
                }
                exitSelectionMode();
              } catch {
                console.error("Operation diagnostic [details redacted]");
                Alert.alert('Error', 'Failed to delete for both');
              }
            }
          }
        ]
      );
    } catch {
      console.error("Error deleting messages: [details redacted]");
      Alert.alert('Error', 'Failed to delete messages');
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  };

  // Render loading state
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      () => {
        setIsKeyboardVisible(true);
        setShowHeaderMenu(false); // Close header menu when keyboard appears
        // Scroll to bottom when keyboard appears
        if (flatListRef.current && messages.length > 0) {
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
          }, 100);
        }
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [messages.length]);

useEffect(() => {
    // Auto-hide menu after a delay
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;
    if (showHeaderMenu) {
      hideTimeout = setTimeout(() => {
        setShowHeaderMenu(false);
      }, 3000); // Auto-hide after 3 seconds
    }

    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [showHeaderMenu]);

useEffect(() => {
    if (!currentUser) {
      router.replace('/signin');
      return;
    }

    fetchUserAndMessages(0, false);
  }, [currentUser, username, router, fetchUserAndMessages]);

const loadVisibleAttachments = useStableEvent(() => {
    if (messages.length > 0 && !loadingAttachments) {
      handleLoadAttachments();
    }
  });
  useEffect(() => loadVisibleAttachments(), [messages.length, loadVisibleAttachments]);

useEffect(() => {
    // Mark messages as read when they are viewed
    // Call immediately when messages are loaded and not in loading state
    if (!loading && messages.length > 0) {
      markMessagesAsRead();
    }

    // Also set up a timer to check again after a short delay
    // This helps ensure the read status is updated even if there are timing issues
    const timer = setTimeout(() => {
      if (messages.length > 0) {
        markMessagesAsRead();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [loading, messages, currentUser, user, markMessagesAsRead]);

useFocusEffect(
    React.useCallback(() => {
      if (!loading && messages.length > 0 && currentUser && user) {
        // Mark messages as read when user navigates to this screen
        markMessagesAsRead();
      }
    }, [loading, messages.length, currentUser, user, markMessagesAsRead])
  );

useEffect(() => {
    if (!currentUser || !user) return;

    // Clean up any existing subscription first

    // Create a unique channel ID for this chat to prevent multiple subscriptions
    const channelId = `messages-${currentUser.id}-${user.id}-${Date.now()}`;

    // Create a subscription for new messages
    const messageSubscription = supabase
      .channel(channelId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_username=eq.${currentUser.username}`,
      }, payload => {
        // Add new message to state if it's from the current chat
        if (payload.new.sender_id === user?.id || payload.new.receiver_username === username) {
          // First add the message to the state with read=false
          setMessages(prev => prev.some(item => item.id === payload.new.id) ? prev : [{ ...payload.new, read: false } as Message, ...prev]);

          // Then mark as read immediately since we're viewing the chat
          setTimeout(() => {
            console.log("Marking new message as read: [details redacted]");
            supabase
              .from('messages')
              .update({ read: true })
              .eq('id', payload.new.id)
              .then(({ error }) => {
                if (error) {
                  console.error("Error marking new message as read: [details redacted]");
                  return;
                }

                // Update local state to reflect read status
                setMessages(prevMessages =>
                  prevMessages.map(msg =>
                    msg.id === payload.new.id ? { ...msg, read: true } : msg
                  )
                );
                console.log("New message marked as read [details redacted]");
              });
          }, 500);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${currentUser.id}`,
      }, payload => {
        // Update message in state when read status changes
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === payload.new.id ? { ...msg, read: payload.new.read } : msg
          )
        );
      })
      .subscribe();

    return () => {
      if (messageSubscription) {
        supabase.removeChannel(messageSubscription);
      }
    };
  }, [currentUser, user, username]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading chat...
          </Text>
        </View>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AnimatedError style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={{ color: '#FFFFFF' }}>Go Back</Text>
          </TouchableOpacity>
        </AnimatedError>
      </View>
    );
  }

  // Render main chat UI
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

      <Stack.Screen options={{
        headerShown: false,
      }} />

      <SafeAreaView style={{ flexShrink: 0 }} edges={['top']}>
        {renderHeader()}
        {currentUser?.id && user?.id && <DMEncryptionPanel actorId={currentUser.id} peerId={user.id} />}
      </SafeAreaView>

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        {/* Selection bar like community chat: Cancel | Pin | Delete */}
        {isSelectionMode && (
          <View style={[styles.selectionBar, { backgroundColor: colors.card, borderColor: colors.textSecondary + '33' }]}>
            <TouchableOpacity style={styles.selectionBtn} onPress={exitSelectionMode}>
              <Text style={[styles.selectionBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.selectionBtn} onPress={() => {
              // For DMs, pin per user in local table
              const ids = Array.from(selectedMessages);
              if (ids.length === 0) return;
              const rows = ids.map(id => ({ user_id: currentUser?.id, message_id: id }));
              supabase.from('user_pinned_messages').upsert(rows).then(({ error }) => {
                if (error) {
                  Alert.alert('Error', 'Failed to pin');
                } else {
                  Alert.alert('Pinned', 'Pinned for you');
                }
              });
            }}>
              <Text style={[styles.selectionBtnText, { color: colors.text }]}>Pin</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectionBtn} onPress={deleteSelectedMessages}>
              <Text style={[styles.selectionBtnText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableWithoutFeedback onPress={() => setShowHeaderMenu(false)} style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={[styles.chatContainer, { flex: 1 }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 65 : 70}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  No messages yet. Start a conversation!
                </Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item, index) => `message-${item.id}-${index}`}
                renderItem={({ item }) => (
                  <MessageItem
                    item={item}
                    isOwnMessage={item.sender_id === currentUser?.id}
                    colors={colors}
                    imageCache={imageCache}
                    setImageCache={setImageCache}
                    loadImageUrl={loadImageUrl}
                    getSignedUrl={getSignedUrl}
                    onDelete={handleDeleteMessage}
                    onLoadAttachments={handleLoadAttachments}
                    isSelectionMode={isSelectionMode}
                    selectedMessages={selectedMessages}
                    onMessageSelect={handleMessageSelect}
                    imageUrls={imageUrls}
                    setImageUrls={setImageUrls}
                    theme={theme}
                    getToken={getToken}
                  />
                )}
                contentContainerStyle={[
                  styles.messagesList,
                  {
                    paddingVertical: 20,
                    paddingHorizontal: 8
                  }
                ]}
                inverted
                onEndReached={loadMoreMessages}
                onEndReachedThreshold={0.5}
                onScroll={() => showHeaderMenu && setShowHeaderMenu(false)}
                onTouchStart={() => showHeaderMenu && setShowHeaderMenu(false)}
                ListFooterComponent={loadingMore ? (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null}
              />
            )}

            {sendError && <Text accessibilityRole="alert" style={{ color: colors.error, padding: 8 }}>{sendError}</Text>}
        {renderSelectedFiles()}

            <View
              style={[
                styles.inputContainer,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.attachButton,
                  { backgroundColor: colors.card }
                ]}
                onPress={handleAttachmentPress}
              >
                <Paperclip size={22} color={colors.text} />
              </TouchableOpacity>

              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                  }
                ]}
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  if (showHeaderMenu) {
                    setShowHeaderMenu(false);
                  }
                }}
                onFocus={() => showHeaderMenu && setShowHeaderMenu(false)}
                accessibilityLabel="Message"
                placeholder="Message..."
                placeholderTextColor={colors.placeholder}
                multiline
              />

              <TouchableOpacity
                style={{
                  backgroundColor: inputText.trim() || selectedFiles.length > 0 ? colors.primary : '#cccccc',
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  display: 'flex',
                  marginLeft: 8
                }}
                accessibilityRole="button" accessibilityLabel="Send message"
                  onPress={handleSendPress}
                disabled={!inputText.trim() && selectedFiles.length === 0}
              >
                <Send size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>

      {/* Header Menu - Render at the very top level */}
      {renderHeaderMenu()}

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        username={user?.username || username as string}
        onReport={(reason) => {
          setShowReportModal(false);
          if (reportUserId) {
            submitReport(reportUserId, reason);
          }
        }}
      />

      {/* Block Modal */}
      <BlockModal
        visible={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        username={user?.username || username as string}
        onBlock={confirmBlock}
      />

      {/* Storage saved notification */}
      {showStorageSaved && (
        <View style={[styles.storageSavedContainer, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.storageSavedText, { color: colors.text }]}>
            Storage saved: {formatBytes(storageSaved)}
          </Text>
        </View>
      )}
    </View>
  );
}

// Add this component after the AnimatedFilePreview component
const ReportModal = ({
  visible,
  onClose,
  username,
  onReport
}: {
  visible: boolean;
  onClose: () => void;
  username: string;
  onReport: (reason: string) => void;
}) => {
  const { colors } = useTheme();
  const [scaleAnim] = useState(() => new Animated.Value(0));
  const [opacityAnim] = useState(() => new Animated.Value(0));

  

  const handleOverlayPress = (e: any) => {
    // Only close if clicking the actual overlay, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const reportOptions = [
    { id: 'inappropriate', label: 'INAPPROPRIATE CONTENT' },
    { id: 'spam', label: 'SPAM OR SCAM' },
    { id: 'harassment', label: 'HARASSMENT OR BULLYING' },
    { id: 'hate', label: 'HATE SPEECH' },
    { id: 'impersonation', label: 'IMPERSONATION' },
    { id: 'illegal', label: 'ILLEGAL ACTIVITIES' }
  ];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: Platform.OS !== 'web',
          tension: 50,
          friction: 7
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1)
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.bezier(0.42, 0, 1, 1)
        })
      ]).start();
    }
  }, [opacityAnim, scaleAnim, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
      <Pressable
        style={styles.modalOverlay}
        onPress={handleOverlayPress}
      >
        <Animated.View
          style={[
            styles.reportModalContent,
            {
              backgroundColor: colors.card,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim
            }
          ]}
        >
          <View style={styles.reportModalHeader}>
            <Text style={[styles.reportModalTitle, { color: colors.text }]}>
              Report User
            </Text>
          </View>

          <Text style={[styles.reportModalSubtitle, { color: colors.text }]}>
            What&apos;s wrong with {username}?
          </Text>

          <View style={styles.reportOptionsContainer}>
            {reportOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.reportOption}
                onPress={() => onReport(option.label)}
              >
                <Text style={[styles.reportOptionText, { color: colors.primary }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.reportOption}
              onPress={onClose}
            >
              <Text style={[styles.reportOptionText, { color: colors.primary }]}>
                CANCEL
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// Add this component after the ReportModal component
const BlockModal = ({
  visible,
  onClose,
  username,
  onBlock
}: {
  visible: boolean;
  onClose: () => void;
  username: string;
  onBlock: () => void;
}) => {
  const { colors } = useTheme();
  const [scaleAnim] = useState(() => new Animated.Value(0));
  const [opacityAnim] = useState(() => new Animated.Value(0));

  

  const handleOverlayPress = (e: any) => {
    // Only close if clicking the actual overlay, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1)
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.bezier(0.42, 0, 1, 1)
        })
      ]).start();
    }
  }, [opacityAnim, scaleAnim, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
      <Pressable
        style={styles.modalOverlay}
        onPress={handleOverlayPress}
      >
        <Animated.View
          style={[
            styles.reportModalContent,
            {
              backgroundColor: colors.card,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim
            }
          ]}
        >
          <View style={styles.reportModalHeader}>
            <Text style={[styles.reportModalTitle, { color: colors.text }]}>
              Block User
            </Text>
          </View>

          <Text style={[styles.reportModalSubtitle, { color: colors.text }]}>
            {username} will no longer be able to:
          </Text>

          <View style={styles.blockReasonsList}>
            <View style={styles.blockReasonItem}>
              <Ban size={16} color={colors.error} style={styles.blockReasonIcon} />
              <Text style={[styles.blockReasonText, { color: colors.text }]}>
                Send you messages
              </Text>
            </View>
            <View style={styles.blockReasonItem}>
              <Ban size={16} color={colors.error} style={styles.blockReasonIcon} />
              <Text style={[styles.blockReasonText, { color: colors.text }]}>
                View your profile
              </Text>
            </View>
            <View style={styles.blockReasonItem}>
              <Ban size={16} color={colors.error} style={styles.blockReasonIcon} />
              <Text style={[styles.blockReasonText, { color: colors.text }]}>
                Find you in search
              </Text>
            </View>
          </View>

          <View style={styles.reportOptionsContainer}>
            <TouchableOpacity
              style={styles.reportOption}
              onPress={onBlock}
            >
              <Text style={[styles.reportOptionText, { color: colors.error }]}>
                BLOCK USER
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reportOption}
              onPress={onClose}
            >
              <Text style={[styles.reportOptionText, { color: colors.primary }]}>
                CANCEL
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// Define styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectedBubble: {
    borderWidth: 2,
    borderColor: '#5B64F4'
  },
  chatContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'android' ? 4 : 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: Platform.OS === 'ios' ? 0 : 4,
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex',
    marginLeft: 8,
  },
  chatMessageContainer: {
    marginVertical: 4,
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  readIndicator: {
    marginLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentContainer: {
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageAttachment: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  attachmentImage: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontWeight: '500',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    opacity: 0.7,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    height: 45,
    position: 'relative',
    zIndex: 100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerBackButton: {
    padding: 4,
    marginRight: 8,
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '600',
    marginLeft: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  headerActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
    marginRight: -2,
  },
  headerAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMenu: {
    position: 'absolute',
    top: 56,
    right: 16,
    width: 220,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    zIndex: 9999, // Increase zIndex to highest level
    elevation: 15, // Increase elevation for Android
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  headerMenuIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerMenuText: {
    fontSize: 15,
    flex: 1,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  selectedFilesContainer: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  selectedFilePreview: {
    width: 80,
    height: 80,
    marginHorizontal: 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedFileImage: {
    width: '100%',
    height: '100%',
  },
  filePreviewPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  filePreviewName: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  removeFileButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectionCount: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  selectionAction: {
    marginLeft: 'auto',
    flexDirection: 'row',
  },
  selectionActionButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  checkboxContainer: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -12 }],
    zIndex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileUsername: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  profileInfo: {
    marginBottom: 24,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInfoText: {
    flex: 1,
    fontSize: 16,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  actionsMenu: {
    position: 'absolute',
    right: 16,
    top: 60, // Adjusted to be below the header
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 200,
  },
  moreButton: {
    padding: 8,
    borderRadius: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  actionText: {
    marginLeft: 12,
    fontSize: 16,
  },
  onlineStatus: {
    fontSize: 14,
    marginTop: 4,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  reportItem: {
    paddingVertical: 10,
  },
  blockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  blockWarningText: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  blockReasonsList: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  blockReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  blockReasonIcon: {
    marginRight: 10,
  },
  blockReasonText: {
    fontSize: 16,
  },
  blockConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    margin: 12,
    borderRadius: 8,
    gap: 8,
  },
  blockConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 60, // Reduced padding since FlatList is inverted
    paddingTop: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
    minHeight: '100%',
  },
  loadingMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    left: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  imageViewerContent: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: '100%',
    height: '90%',
    marginTop: Platform.OS === 'ios' ? 80 : 60,
  },
  imageViewerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedFileItem: {
    marginHorizontal: 4,
  },
  imageLoading: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadButtonSmall: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageSavedContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  storageSavedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    flex: 1,
    marginLeft: 8,
  },
  reportButtonIcon: {
    width: 16,
    height: 16,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  // Report modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reportModalContent: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  reportModalHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  reportModalTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  reportModalSubtitle: {
    fontSize: 18,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  reportOptionsContainer: {
    width: '100%',
  },
  reportOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  reportOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // New message styles to match community chat
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 2,
    maxWidth: '80%',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  messageBubbleLarge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  currentUserBubble: {
    // Removed hardcoded color - now using colors.messageBubbleSent from theme
  },
  otherUserBubble: {
    // Removed hardcoded color - now using colors.messageBubbleReceived from theme
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    // Removed hardcoded color - now using dynamic text color from theme
  },
  messageTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
    marginTop: 2,
    opacity: 0.7,
    // Removed hardcoded color - now using dynamic time color from theme
  },
  attachmentsContainer: {
    marginTop: 8,
  },
  attachmentItem: {
    marginBottom: 8,
  },
  imageAttachmentContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageAttachmentLarge: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imageAttachmentPlaceholderLarge: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
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
  fileAttachmentName: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  fileAttachmentSize: {
    marginLeft: 8,
    fontSize: 12,
  },
  fileDownloadButton: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // New styles for improved attachment system
  dmAttachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
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
  attachmentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileSizeText: {
    fontSize: 12,
    marginTop: 2,
  },
  fileAttachmentContainer: {
    borderRadius: 8,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
} as const);
DMAttachmentDisplay.displayName = "DMAttachmentDisplay";

MessageItem.displayName = "MessageItem";
