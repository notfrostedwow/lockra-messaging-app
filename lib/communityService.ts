import { supabase, createAuthenticatedSupabaseClient } from './supabase';
import { createCommunityService } from './communityRepository';
export { createCommunityService } from './communityRepository';
export const communityService = createCommunityService(supabase, createAuthenticatedSupabaseClient);
