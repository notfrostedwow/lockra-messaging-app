import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Stack, useRouter } from 'expo-router';
import { Search, ChevronRight, User as UserIcon } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';

type Contact = {
  id: string;
  username: string;
  last_seen: string | null;
  avatar_url: string | null;
};

export default function ContactsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.from('users').select('id, username, last_seen, avatar_url').neq('id', user?.id ?? '').then(({ data, error }) => {
      if (active) { setContacts(error ? [] : (data ?? [])); setLoading(false); }
    });
    return () => { active = false; };
  }, [user?.id]);

  const filteredContacts = searchQuery.trim() ? contacts.filter(contact =>
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())) : contacts;

  const handleContactPress = (contact: Contact) => {
    router.push(`/chat/${contact.username}`);
  };

  const renderContactItem = ({ item }: { item: Contact }) => {
     // Hardcoded for demo to match images

    return (
      <TouchableOpacity 
        style={[styles.contactItem, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}
        onPress={() => handleContactPress(item)}
      >
        <Avatar username={item.username} size={50} />
        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: '#FFFFFF' }]}>
            {item.username}
          </Text>
        </View>
        <ChevronRight size={20} color="rgba(255, 255, 255, 0.5)" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: '#111318' }]}>
      <StatusBar style="light" />
      <Text style={{ color: colors.textSecondary, padding: 8 }}>Synthetic contacts | Offline demo</Text>
      
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Search size={20} color="rgba(255, 255, 255, 0.5)" style={styles.searchIcon} />
          <TextInput accessibilityLabel="Search contacts" placeholder="Search contacts..." placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery} onChangeText={setSearchQuery} style={[styles.searchPlaceholder, { flex: 1, color: '#fff' }]} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: 'rgba(255, 255, 255, 0.7)' }]}>
            Loading contacts...
          </Text>
        </View>
      ) : filteredContacts.length > 0 ? (
        <FlatList
          data={filteredContacts}
          renderItem={renderContactItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <UserIcon size={60} color="rgba(255, 255, 255, 0.5)" />
          <Text style={[styles.emptyText, { color: '#FFFFFF' }]}>
            No contacts found
          </Text>
          <Text style={[styles.emptySubtext, { color: 'rgba(255, 255, 255, 0.7)' }]}>
            {searchQuery.trim() !== '' 
              ? `No results for "${searchQuery}"`
              : "You don't have any contacts yet"}
          </Text>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/new-chat')}
          >
            <Text style={styles.addButtonText}>Add New Contact</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrapper: {
    backgroundColor: '#1A1D25',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 16,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastSeen: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
