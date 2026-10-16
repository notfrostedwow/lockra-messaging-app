import { Alert } from '@/lib/alert';
import { useStableEvent } from '@/hooks/useStableEvent';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Dimensions, Platform, Linking, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { FileAttachment } from '@/types';
import { ArrowLeft, Image as ImageIcon, File, Download, Grid, List } from 'lucide-react-native';
import { formatFileSize } from '@/lib/utils';
import * as FileSystem from 'expo-file-system/legacy';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';

interface MediaFile extends FileAttachment {
  url?: string;
  isLoading?: boolean;
}

export default function MediaFilesScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams();
  const { colors, theme } = useTheme();
  const { user: currentUser } = useAuth();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [documents, setDocuments] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'media' | 'files'>('media');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  
  const windowWidth = Dimensions.get('window').width;
  const numColumns = viewMode === 'grid' ? 3 : 1;
  const itemWidth = viewMode === 'grid' ? (windowWidth - 48) / 3 : windowWidth - 32;
  
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



  const loadImageUrl = async (attachment: MediaFile) => {
    try {
      // Mark as loading
      setMediaFiles(prev =>
        prev.map(item =>
          item.id === attachment.id ? { ...item, isLoading: true } : item
        )
      );

      const url = await getSignedUrl(attachment.storage_path);

      if (url) {
        setMediaFiles(prev =>
          prev.map(item =>
            item.id === attachment.id ? { ...item, url, isLoading: false } : item
          )
        );
      }
    } catch {
      console.error("Error loading image URL: [details redacted]");
      setMediaFiles(prev =>
        prev.map(item =>
          item.id === attachment.id ? { ...item, isLoading: false } : item
        )
      );
    }
  };


  
  
  const fetchAttachments = useStableEvent(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser) {
        throw new Error('You must be logged in to view attachments');
      }
      
      // First, get the user ID for the username
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();
        
      if (userError || !userData) {
        throw new Error('User not found');
      }
      
      // Get message IDs from conversations between current user and the other user
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .or(`sender_id.eq.${currentUser.id},receiver_username.eq.${currentUser.username}`)
        .or(`receiver_username.eq.${username},sender_id.eq.${userData.id}`);
        
      if (messagesError) {
        throw new Error(`Failed to fetch messages: ${messagesError.message}`);
      }
      
      if (!messages || messages.length === 0) {
        setMediaFiles([]);
        setDocuments([]);
        setLoading(false);
        return;
      }
      
      const messageIds = messages.map(msg => msg.id);
      
      // Fetch all attachments for these messages
      const { data: attachments, error: attachmentsError } = await supabase
        .from('file_attachments')
        .select('*')
        .in('message_id', messageIds);
        
      if (attachmentsError) {
        throw new Error(`Failed to fetch attachments: ${attachmentsError.message}`);
      }
      
      if (!attachments || attachments.length === 0) {
        setMediaFiles([]);
        setDocuments([]);
        setLoading(false);
        return;
      }
      
      // Separate media and documents
      const media = attachments.filter(att => att.file_type.startsWith('image/'));
      const docs = attachments.filter(att => !att.file_type.startsWith('image/'));
      
      setMediaFiles(media);
      setDocuments(docs);
      
      // Preload image URLs
      media.forEach(attachment => {
        loadImageUrl(attachment);
      });
      
    } catch (err: any) {
      console.error("Error fetching attachments: [details redacted]");
      setError(err.message || 'Failed to load attachments');
      Alert.alert('Error', err.message || 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  });
  
  const handleDownload = async (item: MediaFile) => {
    try {
      // Get a signed URL for the attachment
      const url = await getSignedUrl(item.storage_path);
      
      if (!url) {
        Alert.alert('Error', 'Could not generate download link');
        return;
      }
      
      // On iOS, we can use the Share API to save files
      if (Platform.OS === 'ios') {
        // For images, download and then share
        const localFile = `${FileSystem.cacheDirectory}${item.file_name}`;
        
        // Download the file
        const { uri } = await FileSystem.downloadAsync(url, localFile);
        
        // Share the file
        await Share.share({
          url: uri,
          title: item.file_name,
        });
      } else {
        // On Android, we can use the Linking API to open the URL
        Alert.alert(
          'Download File',
          'The file will open in your browser where you can download it.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open', onPress: () => Linking.openURL(url) }
          ]
        );
      }
    } catch {
      console.error("Error downloading attachment: [details redacted]");
      Alert.alert('Download Failed', 'Could not download the file');
    }
  };
  
  const renderMediaItem = ({ item, index }: { item: MediaFile, index: number }) => {
    if (viewMode === 'grid') {
      return (
        <TouchableOpacity 
          style={[
            styles.gridItem, 
            { 
              width: itemWidth,
              height: itemWidth,
              backgroundColor: colors.card 
            }
          ]}
          onPress={() => setSelectedFile(item)}
        >
          {item.url ? (
            <Image 
              source={{ uri: item.url }} 
              style={styles.gridImage} 
              resizeMode="cover" 
            />
          ) : (
            <View style={[styles.gridImagePlaceholder, { backgroundColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity 
          style={[
            styles.listItem, 
            { 
              width: itemWidth,
              backgroundColor: colors.card,
              borderColor: colors.border 
            }
          ]}
          onPress={() => setSelectedFile(item)}
        >
          <View style={[styles.listItemImageContainer, { backgroundColor: colors.background }]}>
            {item.url ? (
              <Image 
                source={{ uri: item.url }} 
                style={styles.listItemImage} 
                resizeMode="cover" 
              />
            ) : (
              <View style={[styles.listItemImagePlaceholder, { backgroundColor: colors.border }]}>
                <ImageIcon size={24} color={colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.listItemDetails}>
            <Text style={[styles.listItemName, { color: colors.text }]} numberOfLines={1}>
              {item.file_name}
            </Text>
            <Text style={[styles.listItemInfo, { color: colors.textSecondary }]}>
              {formatFileSize(item.file_size)}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.downloadButton, { backgroundColor: colors.primary + '20' }]}
            onPress={() => handleDownload(item)}
          >
            <Download size={20} color={colors.primary} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }
  };
  
  const renderDocumentItem = ({ item }: { item: MediaFile }) => {
    return (
      <TouchableOpacity 
        style={[
          styles.listItem, 
          { 
            width: itemWidth,
            backgroundColor: colors.card,
            borderColor: colors.border 
          }
        ]}
        onPress={() => handleDownload(item)}
      >
        <View style={[styles.fileIcon, { backgroundColor: colors.primary + '20' }]}>
          <File size={24} color={colors.primary} />
        </View>
        <View style={styles.listItemDetails}>
          <Text style={[styles.listItemName, { color: colors.text }]} numberOfLines={1}>
            {item.file_name}
          </Text>
          <Text style={[styles.listItemInfo, { color: colors.textSecondary }]}>
            {formatFileSize(item.file_size)}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.downloadButton, { backgroundColor: colors.primary + '20' }]}
          onPress={() => handleDownload(item)}
        >
          <Download size={20} color={colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };
  
  useEffect(() => {
    fetchAttachments();
  }, [currentUser, fetchAttachments, username]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => fetchAttachments()}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Media & Files
        </Text>
        <TouchableOpacity 
          style={styles.viewModeButton}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          {viewMode === 'grid' ? (
            <List size={24} color={colors.text} />
          ) : (
            <Grid size={24} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'media' && [styles.activeTab, { borderBottomColor: colors.primary }]
          ]}
          onPress={() => setActiveTab('media')}
        >
          <Text 
            style={[
              styles.tabText, 
              { color: activeTab === 'media' ? colors.primary : colors.textSecondary }
            ]}
          >
            Media
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'files' && [styles.activeTab, { borderBottomColor: colors.primary }]
          ]}
          onPress={() => setActiveTab('files')}
        >
          <Text 
            style={[
              styles.tabText, 
              { color: activeTab === 'files' ? colors.primary : colors.textSecondary }
            ]}
          >
            Files
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      {activeTab === 'media' ? (
        mediaFiles.length > 0 ? (
          <FlatList
            data={mediaFiles}
            renderItem={renderMediaItem}
            keyExtractor={item => item.id}
            numColumns={numColumns}
            key={viewMode} // Force re-render when view mode changes
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <ImageIcon size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No media found in this conversation
            </Text>
          </View>
        )
      ) : (
        documents.length > 0 ? (
          <FlatList
            data={documents}
            renderItem={renderDocumentItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <File size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No files found in this conversation
            </Text>
          </View>
        )
      )}
      
      {/* Image Viewer Modal */}
      {selectedFile && selectedFile.url && (
        <TouchableOpacity
          style={styles.imageViewerContainer}
          activeOpacity={1}
          onPress={() => setSelectedFile(null)}
        >
          <BlurView intensity={90} style={StyleSheet.absoluteFill} />
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setSelectedFile(null)}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: selectedFile.url }}
            style={styles.fullImage}
            resizeMode="contain"
          />
          <TouchableOpacity 
            style={[styles.downloadButtonLarge, { backgroundColor: colors.primary }]}
            onPress={() => {
              handleDownload(selectedFile);
              setSelectedFile(null);
            }}
          >
            <Download size={24} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    paddingTop: 50, // Add extra padding for status bar
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  viewModeButton: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  gridItem: {
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  listItemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  listItemImage: {
    width: '100%',
    height: '100%',
  },
  listItemImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  listItemInfo: {
    fontSize: 14,
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
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
    marginTop: 16,
    textAlign: 'center',
  },
  imageViewerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  fullImage: {
    width: '90%',
    height: '70%',
    borderRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  downloadButtonLarge: {
    position: 'absolute',
    bottom: 50,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    padding: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
