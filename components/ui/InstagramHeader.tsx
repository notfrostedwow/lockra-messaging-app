import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Heart, Send as SendIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface InstagramHeaderProps {
  title: string;
  showLogo?: boolean;
  onLogoPress?: () => void;
  showActions?: boolean;
  onHeartPress?: () => void;
  onMessagePress?: () => void;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
}

export const InstagramHeader = ({
  title,
  showLogo = true,
  onLogoPress,
  showActions = true,
  onHeartPress,
  onMessagePress,
  leftComponent,
  rightComponent,
}: InstagramHeaderProps) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          borderBottomWidth: 0.5,
        },
      ]}
    >
      {leftComponent || (
        <View style={styles.leftContainer}>
          {showLogo && (
            <TouchableOpacity onPress={onLogoPress} style={styles.logoContainer}>
              <Text style={[styles.logoText, { color: colors.text }]}>
                {title}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {rightComponent || (
        showActions && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onHeartPress}
            >
              <Heart size={24} color={colors.text} strokeWidth={1.5} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onMessagePress}
            >
              <SendIcon size={24} color={colors.text} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        )
      )}
    </View>
  );
};

export const InstagramStoryHeader = ({
  username,
  profileImage,
  onClose,
  onProfilePress,
}: {
  username: string;
  profileImage?: string;
  onClose: () => void;
  onProfilePress?: () => void;
}) => {
  const { colors } = useTheme();

  return (
    <LinearGradient
      colors={['rgba(0,0,0,0.7)', 'transparent']}
      style={styles.storyHeaderContainer}
    >
      <View style={styles.storyHeader}>
        <TouchableOpacity
          style={styles.storyProfileContainer}
          onPress={onProfilePress}
        >
          <View style={styles.storyProfileImageContainer}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.storyProfileImage}
              />
            ) : (
              <View
                style={[
                  styles.storyProfileImagePlaceholder,
                  { backgroundColor: colors.placeholder },
                ]}
              />
            )}
          </View>
          <Text style={styles.storyUsername}>{username}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.storyCloseButton} onPress={onClose}>
          <Text style={styles.storyCloseText}>×</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '500',
    fontFamily: 'cursive',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  storyHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 40,
    paddingBottom: 20,
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  storyProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyProfileImageContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 8,
  },
  storyProfileImage: {
    width: '100%',
    height: '100%',
  },
  storyProfileImagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  storyUsername: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  storyCloseButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyCloseText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
  },
}); 