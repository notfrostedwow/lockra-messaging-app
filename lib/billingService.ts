import { supabase } from './supabase';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid';

export interface Subscription {
  id: string;
  user_id: string;
  provider: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  price_id: string | null;
  plan_key: string | null;
  interval: 'month' | 'year' | 'lifetime';
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  trial_end: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export const billingService = {
  async getActiveSubscription(userId?: string): Promise<Subscription | null> {
    try {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      // If expired, treat as null
      if (data.current_period_end && new Date(data.current_period_end) <= new Date()) return null;
      return data as unknown as Subscription;
    } catch {
      console.warn("billingService.getActiveSubscription error: [details redacted]");
      return null;
    }
  }
};


