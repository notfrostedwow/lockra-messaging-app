import { useStableEvent } from '@/hooks/useStableEvent';
import { Alert } from '@/lib/alert';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Users, MessageSquare, Activity, UserPlus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  totalMessages: number;
  messagesWeek: number;
  bannedUsers: number;
  userGrowth: number;
  messageGrowth: number;
  dailyActiveUsers: { date: string; count: number }[];
  userRegistrations: { date: string; count: number }[];
}

const SimpleChart = ({ data, color }: { data: { date: string; count: number }[]; color: string }) => {
  const { colors } = useTheme();
    const maxValue = Math.max(...data.map(d => d.count), 1);

    const chartHeight = 120;

    return (
      <View style={styles.chartContainer}>
        <View style={[styles.chart, { height: chartHeight }]}>
          {data.map((item, index) => {
            const barHeight = (item.count / maxValue) * (chartHeight - 40);
            return (
              <View key={index} style={styles.chartBar}>
                <Text style={[styles.chartValue, { color: colors.textTertiary }]}>
                  {item.count}
                </Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: color,
                    }
                  ]}
                />
                <Text style={[styles.chartLabel, { color: colors.textTertiary }]}>
                  {item.date}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

export default function Analytics() {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    newUsersWeek: 0,
    totalMessages: 0,
    messagesWeek: 0,
    bannedUsers: 0,
    userGrowth: 0,
    messageGrowth: 0,
    dailyActiveUsers: [],
    userRegistrations: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange] = useState<'7d' | '30d' | '90d'>('7d');

  // Check admin access
  

  const loadAnalytics = useStableEvent(async () => {
    try {
      // Use regular supabase client for read operations
      // Get date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Active users (last 24 hours)
      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', yesterday.toISOString());

      // New users today
      const { count: newUsersToday } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // New users this week
      const { count: newUsersWeek } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      // Banned users
      const { count: bannedUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('banned', true);

      // Total messages (if table exists)
      let totalMessages = 0;
      let messagesWeek = 0;
      try {
        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true });
        totalMessages = msgCount || 0;

        const { count: msgWeekCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString());
        messagesWeek = msgWeekCount || 0;
      } catch {
        console.warn("Messages table not accessible [details redacted]");
      }

      // Calculate growth rates
      const prevWeekStart = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { count: prevWeekUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', prevWeekStart.toISOString())
        .lt('created_at', weekAgo.toISOString());

      const userGrowth = prevWeekUsers ? (((newUsersWeek ?? 0) - prevWeekUsers) / prevWeekUsers) * 100 : 0;

      // Get daily active users for chart
      const dailyActiveUsers = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen', date.toISOString())
          .lt('last_seen', nextDate.toISOString());

        dailyActiveUsers.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: count || 0,
        });
      }

      // Get user registrations for chart
      const userRegistrations = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString());

        userRegistrations.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: count || 0,
        });
      }

      setAnalytics({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        newUsersToday: newUsersToday || 0,
        newUsersWeek: newUsersWeek || 0,
        totalMessages,
        messagesWeek,
        bannedUsers: bannedUsers || 0,
        userGrowth,
        messageGrowth: 0, // Placeholder
        dailyActiveUsers,
        userRegistrations,
      });
    } catch {
      console.error("Error loading analytics: [details redacted]");
      Alert.alert('Unavailable', 'Analytics could not be loaded. No fallback metrics are manufactured.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  });

  

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      Alert.alert('Access Denied', 'Admin access required', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  }, [currentUser, router]);

useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadAnalytics();
    }
  }, [currentUser, timeRange, loadAnalytics]);

  if (currentUser?.role !== 'admin') {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Key Metrics */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Metrics</Text>
              
              <View style={styles.metricsGrid}>
                <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Users size={24} color={colors.primary} />
                  <Text style={[styles.metricNumber, { color: colors.text }]}>
                    {formatNumber(analytics.totalUsers)}
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Users</Text>
                  <Text style={[styles.metricGrowth, { color: colors.success }]}>
                    {formatGrowth(analytics.userGrowth)}
                  </Text>
                </View>

                <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Activity size={24} color={colors.success} />
                  <Text style={[styles.metricNumber, { color: colors.text }]}>
                    {formatNumber(analytics.activeUsers)}
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Active Users</Text>
                  <Text style={[styles.metricSubtext, { color: colors.textTertiary }]}>Last 24h</Text>
                </View>

                <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <UserPlus size={24} color={colors.primary} />
                  <Text style={[styles.metricNumber, { color: colors.text }]}>
                    {formatNumber(analytics.newUsersToday)}
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>New Today</Text>
                  <Text style={[styles.metricSubtext, { color: colors.textTertiary }]}>
                    {analytics.newUsersWeek} this week
                  </Text>
                </View>

                <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <MessageSquare size={24} color={colors.accent} />
                  <Text style={[styles.metricNumber, { color: colors.text }]}>
                    {formatNumber(analytics.totalMessages)}
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Messages</Text>
                  <Text style={[styles.metricSubtext, { color: colors.textTertiary }]}>
                    {analytics.messagesWeek} this week
                  </Text>
                </View>
              </View>
            </View>

            {/* Charts */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>User Activity</Text>
              
              <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Daily Active Users</Text>
                <SimpleChart data={analytics.dailyActiveUsers} color={colors.primary} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>User Growth</Text>
              
              <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.chartTitle, { color: colors.text }]}>New User Registrations</Text>
                <SimpleChart data={analytics.userRegistrations} color={colors.success} />
              </View>
            </View>

            {/* Additional Stats */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Statistics</Text>
              
              <View style={styles.statsGrid}>
                <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statNumber, { color: colors.error }]}>{analytics.bannedUsers}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Banned Users</Text>
                </View>
                
                <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>
                    {((analytics.activeUsers / analytics.totalUsers) * 100).toFixed(1)}%
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Activity Rate</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  metricGrowth: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricSubtext: {
    fontSize: 10,
    textAlign: 'center',
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  chartValue: {
    fontSize: 10,
    marginBottom: 4,
  },
  bar: {
    width: 20,
    borderRadius: 2,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});