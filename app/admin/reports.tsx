import { Alert } from '@/lib/alert';
import { useStableEvent } from '@/hooks/useStableEvent';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertTriangle, User as UserIcon, Clock, CheckCircle, XCircle, Flag, Calendar } from 'lucide-react-native';
import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reported_message_id?: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  // Joined data
  reporter_username?: string;
  reported_username?: string;
  message_content?: string;
}

export default function ReportsManagement() {
  const { colors } = useTheme();
  const { user: currentUser, getToken } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('pending');

  const createMockReports = (): Report[] => {
    return [
      {
        id: '1',
        reporter_id: 'user1',
        reported_user_id: 'user2',
        reason: 'harassment',
        description: 'User was sending inappropriate messages',
        status: 'pending',
        created_at: new Date().toISOString(),
        reporter_username: 'reporter_user',
        reported_username: 'reported_user',
      },
      {
        id: '2',
        reporter_id: 'user3',
        reported_user_id: 'user4',
        reason: 'spam',
        description: 'Sending spam messages repeatedly',
        status: 'resolved',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: new Date().toISOString(),
        resolution_notes: 'User was warned and stopped the behavior',
        reporter_username: 'another_reporter',
        reported_username: 'spam_user',
      },
    ];
  };


  // Check admin access
  

  const loadReports = useStableEvent(async () => {
    try {
      // Use regular supabase client for read operations
      // First, try to create the reports table if it doesn't exist
      try {
        await supabase.rpc('create_reports_table_if_not_exists');
      } catch {
        console.warn("Could not create reports table: [details redacted]");
      }

      let query = supabase
        .from('reports')
        .select(`
          *,
          reporter:users!reports_reporter_id_fkey(username),
          reported_user:users!reports_reported_user_id_fkey(username)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading reports: [details redacted]");
        // If reports table doesn't exist, create mock data
        if (error.code === '42P01') {
          setReports(createMockReports());
          return;
        }
        Alert.alert('Error', 'Failed to load reports');
        return;
      }

      // Transform the data to match our interface
      const transformedReports = (data || []).map(report => ({
        ...report,
        reporter_username: report.reporter?.username || 'Unknown',
        reported_username: report.reported_user?.username || 'Unknown',
      }));

      setReports(transformedReports);
    } catch {
      console.error("Error loading reports: [details redacted]");
      // Fallback to mock data
      setReports(createMockReports());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  });

  

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const handleResolveReport = async (status: 'resolved' | 'dismissed') => {
    if (!selectedReport) return;

    try {
      const token = await getToken();
      if (!token) return;

      const authenticatedSupabase = createAuthenticatedSupabaseClient(token);
      
      const { error } = await authenticatedSupabase
        .from('reports')
        .update({
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: currentUser?.id,
          resolution_notes: resolutionNotes,
        })
        .eq('id', selectedReport.id);

      if (error) {
        Alert.alert('Error', 'Failed to update report');
        return;
      }

      Alert.alert('Success', `Report has been ${status}`);
      setShowReportModal(false);
      setSelectedReport(null);
      setResolutionNotes('');
      loadReports();
    } catch {
      Alert.alert('Error', 'Failed to update report');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'resolved':
        return colors.success;
      case 'dismissed':
        return colors.textTertiary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} color={colors.warning} />;
      case 'resolved':
        return <CheckCircle size={16} color={colors.success} />;
      case 'dismissed':
        return <XCircle size={16} color={colors.textTertiary} />;
      default:
        return <AlertTriangle size={16} color={colors.textSecondary} />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getReasonColor = (reason: string) => {
    switch (reason.toLowerCase()) {
      case 'harassment':
        return colors.error;
      case 'spam':
        return colors.warning;
      case 'inappropriate':
        return colors.error;
      case 'fake':
        return colors.textSecondary;
      default:
        return colors.primary;
    }
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
      loadReports();
    }
  }, [currentUser, filterStatus, loadReports]);

  if (currentUser?.role !== 'admin') {
    return null;
  }

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const dismissedCount = reports.filter(r => r.status === 'dismissed').length;

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Reports & Issues</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <AlertTriangle size={20} color={colors.warning} />
            <Text style={[styles.statNumber, { color: colors.warning }]}>{pendingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <CheckCircle size={20} color={colors.success} />
            <Text style={[styles.statNumber, { color: colors.success }]}>{resolvedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Resolved</Text>
          </View>
          <View style={styles.statItem}>
            <XCircle size={20} color={colors.textTertiary} />
            <Text style={[styles.statNumber, { color: colors.textTertiary }]}>{dismissedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Dismissed</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'pending', 'resolved', 'dismissed'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                {
                  backgroundColor: filterStatus === filter ? colors.primary : 'transparent',
                  borderColor: colors.border,
                }
              ]}
              onPress={() => setFilterStatus(filter as any)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filterStatus === filter ? '#FFFFFF' : colors.text }
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Reports List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CheckCircle size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No reports found
            </Text>
          </View>
        ) : (
          reports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                setSelectedReport(report);
                setShowReportModal(true);
              }}
            >
              <View style={styles.reportHeader}>
                <View style={styles.reportInfo}>
                  <View style={[styles.reasonBadge, { backgroundColor: getReasonColor(report.reason) + '20' }]}>
                    <Flag size={12} color={getReasonColor(report.reason)} />
                    <Text style={[styles.reasonText, { color: getReasonColor(report.reason) }]}>
                      {report.reason}
                    </Text>
                  </View>
                  <View style={styles.statusContainer}>
                    {getStatusIcon(report.status)}
                    <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                      {report.status}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.reportDescription, { color: colors.text }]}>
                {report.description}
              </Text>

              <View style={styles.reportMeta}>
                <View style={styles.metaRow}>
                  <UserIcon size={14} color={colors.textTertiary} />
                  <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                    Reporter: {report.reporter_username}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <AlertTriangle size={14} color={colors.textTertiary} />
                  <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                    Reported: {report.reported_username}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Calendar size={14} color={colors.textTertiary} />
                  <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                    {formatDate(report.created_at)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Report Details Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {selectedReport && (
              <>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Report Details
                </Text>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Reason:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedReport.reason}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Description:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedReport.description}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Reporter:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedReport.reporter_username}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Reported User:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedReport.reported_username}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Date:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{formatDateTime(selectedReport.created_at)}</Text>
                </View>

                {selectedReport.status === 'pending' && (
                  <>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                      Resolution Notes:
                    </Text>
                    <TextInput
                      style={[
                        styles.notesInput,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          color: colors.text,
                        }
                      ]}
                      placeholder="Enter resolution notes..."
                      placeholderTextColor={colors.placeholder}
                      value={resolutionNotes}
                      onChangeText={setResolutionNotes}
                      multiline
                      numberOfLines={3}
                    />

                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.success }]}
                        onPress={() => handleResolveReport('resolved')}
                      >
                        <CheckCircle size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Resolve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.textTertiary }]}
                        onPress={() => handleResolveReport('dismissed')}
                      >
                        <XCircle size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {selectedReport.resolution_notes && (
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Resolution Notes:</Text>
                    <Text style={[styles.modalValue, { color: colors.text }]}>{selectedReport.resolution_notes}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: colors.border }]}
                  onPress={() => {
                    setShowReportModal(false);
                    setSelectedReport(null);
                    setResolutionNotes('');
                  }}
                >
                  <Text style={[styles.closeButtonText, { color: colors.text }]}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  statsContainer: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  reportCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  reportHeader: {
    marginBottom: 12,
  },
  reportInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reasonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  reportMeta: {
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 16,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});