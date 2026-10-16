import { useStableEvent } from '@/hooks/useStableEvent';
import { Alert } from '@/lib/alert';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Shield, Users, MessageSquare, Ban, UserCheck, Settings, BarChart3, AlertTriangle, Database, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    bannedUsers: number;
    totalMessages: number;
    recentReports: number;
}

export default function AdminPanel() {
    const { colors } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<AdminStats>({
        totalUsers: 0,
        activeUsers: 0,
        bannedUsers: 0,
        totalMessages: 0,
        recentReports: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Check if user is admin
    

    const loadStats = useStableEvent(async () => {
        try {
            // Get total users
            const { count: totalUsers, error: usersError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            if (usersError) {
                console.error("Error fetching users count: [details redacted]");
            }

            // Get active users (last 24 hours)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const { count: activeUsers, error: activeError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .gte('last_seen', yesterday.toISOString());

            if (activeError) {
                console.error("Error fetching active users: [details redacted]");
            }

            // Get banned users
            const { count: bannedUsers, error: bannedError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('banned', true);

            if (bannedError) {
                console.error("Error fetching banned users: [details redacted]");
            }

            // Get total messages (with proper error handling)
            let totalMessages = 0;
            try {
                const { count: messageCount, error: messagesError } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true });

                if (messagesError) {
                    console.warn("Messages table not accessible: [details redacted]");
                } else {
                    totalMessages = messageCount || 0;
                }
            } catch {
                console.warn("Messages table query failed: [details redacted]");
                totalMessages = 0;
            }

            setStats({
                totalUsers: totalUsers || 0,
                activeUsers: activeUsers || 0,
                bannedUsers: bannedUsers || 0,
                totalMessages: totalMessages,
                recentReports: 0, // Placeholder for reports
            });
        } catch {
            console.error("Error loading admin stats: [details redacted]");
            // Set default stats on error
            setStats({
                totalUsers: 0,
                activeUsers: 0,
                bannedUsers: 0,
                totalMessages: 0,
                recentReports: 0,
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    });

    

    const onRefresh = () => {
        setRefreshing(true);
        loadStats();
    };

    const showComingSoon = (feature: string) => {
        Alert.alert(
            'Coming Soon',
            `${feature} functionality will be available in a future update.`,
            [{ text: 'OK' }]
        );
    };

    const adminActions = [
        {
            title: 'User Management',
            description: 'Manage users, bans, and permissions',
            icon: <Users size={24} color={colors.primary} />,
            onPress: () => router.push('/admin/users'),
            stats: `${stats.totalUsers} total users`,
        },
        {
            title: 'Message Moderation',
            description: 'Review reported messages and content',
            icon: <MessageSquare size={24} color={colors.primary} />,
            onPress: () => showComingSoon('Message Moderation'),
            stats: `${stats.totalMessages} total messages`,
        },
        {
            title: 'Ban Management',
            description: 'Manage banned users and appeals',
            icon: <Ban size={24} color={colors.error} />,
            onPress: () => router.push('/admin/bans'),
            stats: `${stats.bannedUsers} banned users`,
        },
        {
            title: 'User Verification',
            description: 'Verify user accounts and profiles',
            icon: <UserCheck size={24} color={colors.success} />,
            onPress: () => showComingSoon('User Verification'),
            stats: 'Pending verifications',
        },
        {
            title: 'System Settings',
            description: 'Configure app settings and features',
            icon: <Settings size={24} color={colors.primary} />,
            onPress: () => router.push('/(tabs)/settings'),
            stats: 'Global settings',
        },
        {
            title: 'Analytics',
            description: 'View app usage and statistics',
            icon: <BarChart3 size={24} color={colors.primary} />,
            onPress: () => router.push('/admin/analytics'),
            stats: `${stats.activeUsers} active today`,
        },
        {
            title: 'Reports & Issues',
            description: 'Handle user reports and issues',
            icon: <AlertTriangle size={24} color={colors.warning} />,
            onPress: () => router.push('/admin/reports'),
            stats: `${stats.recentReports} pending reports`,
        },
        {
            title: 'Database Tools',
            description: 'Database maintenance and tools',
            icon: <Database size={24} color={colors.primary} />,
            onPress: () => router.push('/admin/database'),
            stats: 'Maintenance tools',
        },
    ];

    useEffect(() => {
        if (user?.role !== 'admin') {
            Alert.alert(
                'Access Denied',
                'You do not have permission to access the admin panel.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        }
    }, [router, user]);

useEffect(() => {
        if (user?.role === 'admin') {
            loadStats();
        }
    }, [user, loadStats]);

  if (user?.role !== 'admin') {
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
                <View style={styles.headerContent}>
                    <Shield size={28} color={colors.primary} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Panel</Text>
                </View>
                <View style={styles.headerRight} />
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Stats Overview */}
                <View style={styles.statsContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.totalUsers}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Users</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.statNumber, { color: colors.success }]}>{stats.activeUsers}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Today</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.statNumber, { color: colors.error }]}>{stats.bannedUsers}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Banned</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.totalMessages}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Messages</Text>
                        </View>
                    </View>
                </View>

                {/* Admin Actions */}
                <View style={styles.actionsContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Admin Tools</Text>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        adminActions.map((action, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={action.onPress}
                            >
                                <View style={styles.actionIcon}>
                                    {action.icon}
                                </View>
                                <View style={styles.actionContent}>
                                    <Text style={[styles.actionTitle, { color: colors.text }]}>{action.title}</Text>
                                    <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                                        {action.description}
                                    </Text>
                                    <Text style={[styles.actionStats, { color: colors.textTertiary }]}>{action.stats}</Text>
                                </View>
                                <ChevronRight size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActionsContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
                    <View style={styles.quickActionsGrid}>
                        <TouchableOpacity
                            style={[styles.quickActionButton, { backgroundColor: colors.primary }]}
                            onPress={() => router.push('/admin/users')}
                        >
                            <Users size={20} color="#FFFFFF" />
                            <Text style={styles.quickActionText}>Users</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.quickActionButton, { backgroundColor: colors.error }]}
                            onPress={() => router.push('/admin/bans')}
                        >
                            <Ban size={20} color="#FFFFFF" />
                            <Text style={styles.quickActionText}>Bans</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.quickActionButton, { backgroundColor: colors.warning }]}
                            onPress={() => router.push('/admin/reports')}
                        >
                            <AlertTriangle size={20} color="#FFFFFF" />
                            <Text style={styles.quickActionText}>Reports</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.quickActionButton, { backgroundColor: colors.success }]}
                            onPress={() => router.push('/admin/analytics')}
                        >
                            <BarChart3 size={20} color="#FFFFFF" />
                            <Text style={styles.quickActionText}>Stats</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginLeft: 8,
    },
    headerRight: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    statsContainer: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        textAlign: 'center',
    },
    actionsContainer: {
        padding: 16,
        paddingTop: 0,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    actionIcon: {
        marginRight: 16,
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    actionDescription: {
        fontSize: 14,
        marginBottom: 2,
    },
    actionStats: {
        fontSize: 12,
    },
    quickActionsContainer: {
        padding: 16,
        paddingTop: 0,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    quickActionButton: {
        flex: 1,
        minWidth: '22%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
});