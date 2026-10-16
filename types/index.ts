import { User as SupabaseUser } from '@supabase/supabase-js';

export interface User extends Omit<SupabaseUser, 'role'> {
  username: string;
  role: 'user' | 'admin';
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_verified: boolean;
  banned: boolean;
  banned_reason?: string | null;
  timeout_until?: string | null;
  can_send: boolean;
  last_seen?: string | null;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_username: string;
  timestamp: string;
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

export type ChatPreview = {
  id: string;
  username: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
};

export interface ChatSettings {
  id: string;
  user_id: string;
  chat_with: string;
  muted: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettings {
  id: string;
  user_id: string;
  show_email: boolean;
  show_online_status: boolean;
  created_at: string;
  updated_at: string;
}

export type Theme = 'light' | 'dark';

// Community-related types
export type CommunityType = 'public' | 'private';

export type MemberRole = 'owner' | 'admin' | 'member';

export interface Community {
  id: string;
  name: string;
  type: CommunityType;
  invite_code?: string;
  owner_id: string;
  is_locked?: boolean;
  locked_at?: string | null;
  locked_by?: string | null;
  attachments_enabled?: boolean;
  topic?: string | null;
  rules?: string | null;
  pinned_message_id?: string | null;
  pinned_by?: string | null;
  pinned_at?: string | null;
  created_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  // Additional user info (from joins)
  username?: string;
}

export interface CommunityMessage {
  id: string;
  community_id: string;
  user_id: string;
  content: string;
  reply_to_id?: string | null;
  created_at: string;
  // Additional user info (from joins)
  username?: string;
  attachments?: CommunityFileAttachment[];
}

export interface CommunityFileAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

export interface CommunityPreview {
  id: string;
  name: string;
  type: CommunityType;
  memberCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
}