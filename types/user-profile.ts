

export type User = {
  id: string;
  email: string;
  username: string | null;
  is_verified: boolean;
  banned: boolean;
  banned_reason: string | null;
  timeout_until: string | null;
  can_send: boolean;
  role: 'user' | 'admin';
  avatar_url: string | null;
  display_name: string | null;
  bio: string | null;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
  banned_at: string | null;
};

// This empty object is exported as default to satisfy Expo Router's requirements
// while maintaining type exports
export default {}; 