import { Alert } from '@/lib/alert';
import { useStableEvent } from '@/hooks/useStableEvent';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDemo } from '@/lib/runtime';
import * as FileSystem from 'expo-file-system/legacy';
import { Database, Trash2, HardDrive, Image, FileText, Download, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react-native';

interface StorageInfo {
  totalSize: string;
  cacheSize: string;
  imageCache: string;
  documentCache: string;
  tempFiles: string;
  asyncStorageSize: string;
}

export default function StorageManagement() {
  const { colors } = useTheme();
  useAuth();
  const router = useRouter();
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    totalSize: '0 MB',
    cacheSize: '0 MB',
    imageCache: '0 MB',
    documentCache: '0 MB',
    tempFiles: '0 MB',
    asyncStorageSize: '0 MB',
  });
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<string | null>(null);

  const calculateDirectorySize = async (dirPath: string): Promise<number> => {
    try {
      const items = await FileSystem.readDirectoryAsync(dirPath);
      let totalSize = 0;

      for (const item of items) {
        const itemPath = `${dirPath}${item}`;
        const info = await FileSystem.getInfoAsync(itemPath);

        if (info.exists) {
          if (info.isDirectory) {
            totalSize += await calculateDirectorySize(`${itemPath}/`);
          } else {
            totalSize += info.size || 0;
          }
        }
      }

      return totalSize;
    } catch {
      console.warn("Error calculating directory size: [details redacted]");
      return 0;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };



  

  const loadStorageInfo = useStableEvent(async () => {
    try {
      setLoading(true);
      
      // Get app directory info
      const documentDir = FileSystem.documentDirectory;
      const cacheDir = FileSystem.cacheDirectory;
      
      let totalSize = 0;
      let cacheSize = 0;
      let imageCache = 0;
      let documentCache = 0;
      

      // Calculate document directory size
      if (documentDir) {
        try {
          const docInfo = await FileSystem.getInfoAsync(documentDir);
          if (docInfo.exists) {
            documentCache = await calculateDirectorySize(documentDir);
          }
        } catch {
          console.warn("Could not calculate document directory size: [details redacted]");
        }
      }

      // Calculate cache directory size
      if (cacheDir) {
        try {
          const cacheInfo = await FileSystem.getInfoAsync(cacheDir);
          if (cacheInfo.exists) {
            cacheSize = await calculateDirectorySize(cacheDir);
            
            // Try to get image cache specifically
            const imageCacheDir = `${cacheDir}images/`;
            try {
              const imgInfo = await FileSystem.getInfoAsync(imageCacheDir);
              if (imgInfo.exists) {
                imageCache = await calculateDirectorySize(imageCacheDir);
              }
            } catch {
              console.warn("Could not calculate image cache size: [details redacted]");
            }
          }
        } catch {
          console.warn("Could not calculate cache directory size: [details redacted]");
        }
      }

      // Calculate AsyncStorage size (approximate)
      let asyncStorageSize = 0;
      try {
        const keys = (await AsyncStorage.getAllKeys()).filter(key => !isDemo || key.startsWith('lockra:synthetic-'));
        for (const key of keys) {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            asyncStorageSize += new Blob([value]).size;
          }
        }
      } catch {
        console.warn("Could not calculate AsyncStorage size: [details redacted]");
      }

      totalSize = cacheSize + documentCache + asyncStorageSize;

      setStorageInfo({
        totalSize: formatBytes(totalSize),
        cacheSize: formatBytes(cacheSize),
        imageCache: formatBytes(imageCache),
        documentCache: formatBytes(documentCache),
        tempFiles: formatBytes(Math.max(0, cacheSize - imageCache)),
        asyncStorageSize: formatBytes(asyncStorageSize),
      });
    } catch {
      console.error("Error loading storage info: [details redacted]");
      // A failed measurement must not invent device capacity.
      setStorageInfo({
        totalSize: 'Unavailable',
        cacheSize: 'Unavailable',
        imageCache: 'Unavailable',
        documentCache: 'Unavailable',
        tempFiles: 'Unavailable',
        asyncStorageSize: 'Unavailable',
      });
    } finally {
      setLoading(false);
    }
  });

  const clearCache = async (type: 'all' | 'images' | 'temp' | 'documents') => {
    if (isDemo) {
      Alert.alert('Unavailable', 'Native cache deletion is disabled in offline demo. No files or authentication data were deleted.');
      return;
    }
    const typeNames = {
      all: 'All Cache',
      images: 'Image Cache',
      temp: 'Temporary Files',
      documents: 'Document Cache',
    };

    Alert.alert(
      `Clear ${typeNames[type]}`,
      `Are you sure you want to clear ${typeNames[type].toLowerCase()}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setClearing(type);
            try {
              const cacheDir = FileSystem.cacheDirectory;
              const documentDir = FileSystem.documentDirectory;

              switch (type) {
                case 'all':
                  // Clear cache directory but preserve auth tokens
                  if (cacheDir) {
                    await clearDirectoryExceptAuth(cacheDir);
                  }
                  // Clear some AsyncStorage but preserve authentication
                  await clearAsyncStorageExceptAuth();
                  break;

                case 'images':
                  if (cacheDir) {
                    const imageCacheDir = `${cacheDir}images/`;
                    try {
                      const info = await FileSystem.getInfoAsync(imageCacheDir);
                      if (info.exists) {
                        await FileSystem.deleteAsync(imageCacheDir, { idempotent: true });
                      }
                    } catch {
                      console.warn("Could not clear image cache: [details redacted]");
                    }
                  }
                  break;

                case 'temp':
                  if (cacheDir) {
                    const items = await FileSystem.readDirectoryAsync(cacheDir);
                    for (const item of items) {
                      if (item.includes('temp') || item.includes('tmp')) {
                        await FileSystem.deleteAsync(`${cacheDir}${item}`, { idempotent: true });
                      }
                    }
                  }
                  break;

                case 'documents':
                  if (documentDir) {
                    const items = await FileSystem.readDirectoryAsync(documentDir);
                    for (const item of items) {
                      if (!item.includes('auth') && !item.includes('session')) {
                        await FileSystem.deleteAsync(`${documentDir}${item}`, { idempotent: true });
                      }
                    }
                  }
                  break;
              }

              Alert.alert('Success', `${typeNames[type]} cleared successfully`);
              await loadStorageInfo();
            } catch {
              console.error("Error clearing cache: [details redacted]");
              Alert.alert('Error', 'Failed to clear cache. Please try again.');
            } finally {
              setClearing(null);
            }
          },
        },
      ]
    );
  };

  const clearDirectoryExceptAuth = async (dirPath: string) => {
    try {
      const items = await FileSystem.readDirectoryAsync(dirPath);
      const authRelatedItems = ['auth', 'session', 'token', 'clerk', 'user'];

      for (const item of items) {
        const shouldPreserve = authRelatedItems.some(authItem => 
          item.toLowerCase().includes(authItem)
        );

        if (!shouldPreserve) {
          await FileSystem.deleteAsync(`${dirPath}${item}`, { idempotent: true });
        }
      }
    } catch {
      console.warn("Error clearing directory: [details redacted]");
    }
  };

  const clearAsyncStorageExceptAuth = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const authRelatedKeys = [
        'hushed_session_backup',
        'hushed_user_session',
        'hushed_last_auth',
        '@clerk',
        'auth',
        'session',
        'token',
        'user',
      ];

      const keysToDelete = keys.filter(key => 
        !authRelatedKeys.some(authKey => key.toLowerCase().includes(authKey.toLowerCase()))
      );

      if (keysToDelete.length > 0) {
        await AsyncStorage.multiRemove(keysToDelete);
      }
    } catch {
      console.warn("Error clearing AsyncStorage: [details redacted]");
    }
  };

  const storageItems = [
    {
      icon: Database,
      title: 'Total App Storage',
      size: storageInfo.totalSize,
      description: 'Total space used by the app',
      color: colors.primary,
      action: null,
    },
    {
      icon: HardDrive,
      title: 'Cache Files',
      size: storageInfo.cacheSize,
      description: 'Temporary files and cached data',
      color: colors.warning,
      action: () => clearCache('all'),
    },
    {
      icon: Image,
      title: 'Image Cache',
      size: storageInfo.imageCache,
      description: 'Cached profile pictures and images',
      color: colors.success,
      action: () => clearCache('images'),
    },
    {
      icon: FileText,
      title: 'Document Cache',
      size: storageInfo.documentCache,
      description: 'Cached documents and files',
      color: colors.accent,
      action: () => clearCache('documents'),
    },
    {
      icon: Download,
      title: 'Temporary Files',
      size: storageInfo.tempFiles,
      description: 'Temporary downloads and processing files',
      color: colors.textSecondary,
      action: () => clearCache('temp'),
    },
    {
      icon: Database,
      title: 'App Data',
      size: storageInfo.asyncStorageSize,
      description: 'Settings and preferences (non-auth)',
      color: colors.primary,
      action: null,
    },
  ];

  useEffect(() => {
    loadStorageInfo();
  }, [loadStorageInfo]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerTitle: "Storage",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }} 
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
            <Database size={28} color={colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Storage Management
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Manage your app storage and clear cached data
          </Text>
        </View>

        {/* Refresh Button */}
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: colors.card }]}
          onPress={loadStorageInfo}
          disabled={loading}
        >
          <RefreshCw size={20} color={colors.primary} />
          <Text style={[styles.refreshText, { color: colors.primary }]}>
            Refresh Storage Info
          </Text>
        </TouchableOpacity>

        {/* Storage Items */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Storage Breakdown
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Calculating storage usage...
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {storageItems.map((item, index) => (
                <TouchableOpacity
                  key={item.title}
                  style={[
                    styles.storageItem,
                    index < storageItems.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={item.action ?? undefined}
                  disabled={!item.action || clearing !== null}
                >
                  <View style={styles.storageLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: item.color + '15' }]}>
                      <item.icon size={20} color={item.color} />
                    </View>
                    <View style={styles.storageContent}>
                      <Text style={[styles.storageTitle, { color: colors.text }]}>
                        {item.title}
                      </Text>
                      <Text style={[styles.storageDescription, { color: colors.textSecondary }]}>
                        {item.description}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.storageRight}>
                    <Text style={[styles.storageSize, { color: colors.text }]}>
                      {item.size}
                    </Text>
                    {item.action && (
                      <View style={styles.actionContainer}>
                        {clearing === item.title.toLowerCase().replace(' ', '') ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Trash2 size={16} color={colors.error} />
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Warning */}
        <View style={[styles.warningCard, { backgroundColor: colors.warning + '15' }]}>
          <AlertTriangle size={20} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.text }]}>
            Clearing cache will not affect your login status or account data. 
            Your authentication tokens are safely preserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  refreshText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  storageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  storageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  storageContent: {
    flex: 1,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  storageDescription: {
    fontSize: 14,
  },
  storageRight: {
    alignItems: 'flex-end',
  },
  storageSize: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
  headerButton: {
    padding: 8,
  },
});
