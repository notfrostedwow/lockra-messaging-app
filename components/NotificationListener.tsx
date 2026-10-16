import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Component that listens for real-time notifications
 * This component doesn't render anything, it just sets up listeners
 */
export default function NotificationListener() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Set up realtime subscription for notifications
    const channel = supabase
      .channel('notification_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        // Handle new notifications
        console.log("New notification received: [details redacted]");
        
        // You can dispatch an action to update the UI or show a toast
        // For example, if you're using a notification context:
        // notificationContext.addNotification(payload.new);
        
        // Or trigger a system notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Lockra', {
            body: 'New message notification',
            icon: '/icon.png'
          });
        }
      })
      .subscribe();

    // Also listen to the broadcast channel for instant notifications
    const broadcastChannel = supabase
      .channel('broadcast_notifications')
      .on('broadcast', { event: 'notification_channel' }, (payload) => {
        // Only process notifications meant for this user
        if (payload.payload && payload.payload.user_id === user.id) {
          console.log("Broadcast notification received: [details redacted]");
          
          // Show the notification immediately
          if (Notification.permission === 'granted') {
            new Notification('Lockra', {
              body: payload.payload.message,
              icon: '/icon.png'
            });
          }
        }
      })
      .subscribe();

    return () => {
      // Clean up subscriptions
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [user]);

  // This component doesn't render anything
  return null;
} 