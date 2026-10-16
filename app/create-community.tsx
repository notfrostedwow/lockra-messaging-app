import { Alert } from '@/lib/alert';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { communityService } from '@/lib/communityService';
import { CommunityType } from '@/types';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Globe, Lock, Info } from 'lucide-react-native';

export default function CreateCommunity() {
  const { colors } = useTheme();
  const { user, getToken } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const handleCreateCommunity = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a community');
      return;
    }
    
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a community name');
      return;
    }
    
    try {
      setLoading(true);
      const communityType: CommunityType = isPrivate ? 'private' : 'public';
      
      const community = await communityService.createCommunity(
        name.trim(), 
        communityType, 
        user.id,
        () => getToken()
      );
      
      if (community) {
        Alert.alert(
          'Success', 
          `Your ${communityType} community has been created!${
            isPrivate ? `\n\nInvite code: ${community.invite_code}` : ''
          }`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                // Navigate back to home/chats page
                router.push('/(tabs)');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to create community');
      }
    } catch {
      console.error("Error creating community: [details redacted]");
      Alert.alert('Error', 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Create Community</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Community Name</Text>
          <TextInput
            style={[
              styles.input, 
              { 
                color: colors.text, 
                backgroundColor: colors.card,
                borderColor: colors.border 
              }
            ]}
            placeholder="Enter community name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
          
          <View style={styles.typeSelector}>
            <Text style={[styles.label, { color: colors.text }]}>Community Type</Text>
            
            <View style={styles.typesContainer}>
              <View style={[
                styles.typeOption, 
                !isPrivate && styles.selectedType,
                { 
                  backgroundColor: !isPrivate ? colors.primaryLight : colors.card,
                  borderColor: !isPrivate ? colors.primary : colors.border
                }
              ]}>
                <Globe 
                  size={24} 
                  color={!isPrivate ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.typeText, 
                  { color: !isPrivate ? colors.primary : colors.textSecondary }
                ]}>
                  Public
                </Text>
                <Text style={[
                  styles.typeDescription, 
                  { color: !isPrivate ? colors.primary : colors.textTertiary }
                ]}>
                  Anyone can find and join
                </Text>
              </View>
              
              <View style={[
                styles.typeOption, 
                isPrivate && styles.selectedType,
                { 
                  backgroundColor: isPrivate ? colors.primaryLight : colors.card,
                  borderColor: isPrivate ? colors.primary : colors.border
                }
              ]}>
                <Lock 
                  size={24} 
                  color={isPrivate ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.typeText, 
                  { color: isPrivate ? colors.primary : colors.textSecondary }
                ]}>
                  Private
                </Text>
                <Text style={[
                  styles.typeDescription, 
                  { color: isPrivate ? colors.primary : colors.textTertiary }
                ]}>
                  Join by invite code only
                </Text>
              </View>
            </View>
            
            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>
                {isPrivate ? 'Private Community' : 'Public Community'}
              </Text>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            
            <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
              <Info size={20} color={colors.primary} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {isPrivate 
                  ? 'Private communities require an invite code to join. An 8-character code will be automatically generated.'
                  : 'Public communities are visible to everyone and can be joined without an invite code.'
                }
              </Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity
          style={[
            styles.createButton, 
            { backgroundColor: colors.primary },
            (!name.trim() || loading) && { opacity: 0.6 }
          ]}
          onPress={handleCreateCommunity}
          disabled={!name.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Community</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  typeSelector: {
    marginBottom: 24,
  },
  typesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeOption: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  selectedType: {
    borderWidth: 2,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  createButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 