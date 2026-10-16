import { useStableEvent } from '@/hooks/useStableEvent';
import { Alert } from '@/lib/alert';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Database, Trash2, RefreshCw, Download, Settings, AlertTriangle, HardDrive, Activity } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface DatabaseStats {
  totalTables: number;
  totalRows: number;
  databaseSize: string;
  lastBackup: string | null;
  activeConnections: number;
}

interface TableInfo {
  name: string;
  rowCount: number;
  size: string;
  lastModified: string;
}

export default function DatabaseTools() {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DatabaseStats>({
    totalTables: 0,
    totalRows: 0,
    databaseSize: '0 MB',
    lastBackup: null,
    activeConnections: 0,
  });
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceType, setMaintenanceType] = useState<'cleanup' | 'backup' | 'optimize'>('cleanup');
  const [confirmText, setConfirmText] = useState('');

  // Check admin access
  

  const loadDatabaseInfo = useStableEvent(async () => {
    try {
      // Use regular supabase client for read operations
      // Get table information
      const tableInfos: TableInfo[] = [];
      const mainTables = ['users', 'messages', 'user_sessions', 'communities', 'community_members'];
      
      let totalRows = 0;
      
      for (const tableName of mainTables) {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          if (!error && count !== null) {
            tableInfos.push({
              name: tableName,
              rowCount: count,
              size: 'Not measured',
              lastModified: new Date().toISOString(),
            });
            totalRows += count;
          }
        } catch {
          console.warn("Operation diagnostic [details redacted]");
        }
      }

      setTables(tableInfos);
      setStats({
        totalTables: tableInfos.length,
        totalRows,
        databaseSize: 'Not measured',
        lastBackup: null, // Would need to implement backup tracking
        activeConnections: 0, // No server connections in demo
      });
    } catch {
      console.error("Error loading database info: [details redacted]");
      setTables([]);
      setStats({ totalTables: 0, totalRows: 0, databaseSize: 'Unavailable', lastBackup: null, activeConnections: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  });

  

  const onRefresh = () => {
    setRefreshing(true);
    loadDatabaseInfo();
  };

  const handleMaintenance = async () => {
    if (confirmText !== 'CONFIRM') {
      Alert.alert('Error', 'Please type CONFIRM to proceed');
      return;
    }

    Alert.alert('Unavailable', 'Maintenance is not implemented. No backup, cleanup or optimization was executed.');
    setShowMaintenanceModal(false);
    setConfirmText('');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const maintenanceOptions = [
    {
      type: 'cleanup' as const,
      title: 'Database Cleanup',
      description: 'Remove old sessions and temporary data',
      icon: <Trash2 size={24} color={colors.warning} />,
      color: colors.warning,
    },
    {
      type: 'backup' as const,
      title: 'Create Backup',
      description: 'Create a full database backup',
      icon: <Download size={24} color={colors.primary} />,
      color: colors.primary,
    },
    {
      type: 'optimize' as const,
      title: 'Optimize Database',
      description: 'Optimize tables and indexes',
      icon: <RefreshCw size={24} color={colors.success} />,
      color: colors.success,
    },
  ];

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      Alert.alert('Access Denied', 'Admin access required', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  }, [currentUser, router]);

useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadDatabaseInfo();
    }
  }, [currentUser, loadDatabaseInfo]);

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Database Tools</Text>
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
            {/* Database Overview */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Database Overview</Text>
              
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Database size={24} color={colors.primary} />
                  <Text style={[styles.statNumber, { color: colors.text }]}>{stats.totalTables}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tables</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <HardDrive size={24} color={colors.accent} />
                  <Text style={[styles.statNumber, { color: colors.text }]}>{stats.totalRows}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Rows</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Activity size={24} color={colors.success} />
                  <Text style={[styles.statNumber, { color: colors.text }]}>{stats.databaseSize}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Size</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <RefreshCw size={24} color={colors.warning} />
                  <Text style={[styles.statNumber, { color: colors.text }]}>{stats.activeConnections}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Connections</Text>
                </View>
              </View>
            </View>

            {/* Table Information */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Table Information</Text>
              
              {tables.map((table) => (
                <View
                  key={table.name}
                  style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableName, { color: colors.text }]}>{table.name}</Text>
                    <Text style={[styles.tableSize, { color: colors.textSecondary }]}>{table.size}</Text>
                  </View>
                  
                  <View style={styles.tableStats}>
                    <Text style={[styles.tableRows, { color: colors.textSecondary }]}>
                      {table.rowCount} rows
                    </Text>
                    <Text style={[styles.tableModified, { color: colors.textTertiary }]}>
                      Modified: {formatDate(table.lastModified)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Maintenance Tools */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Maintenance Tools</Text>
              
              {maintenanceOptions.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[styles.maintenanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    setMaintenanceType(option.type);
                    setShowMaintenanceModal(true);
                  }}
                >
                  <View style={styles.maintenanceIcon}>
                    {option.icon}
                  </View>
                  <View style={styles.maintenanceContent}>
                    <Text style={[styles.maintenanceTitle, { color: colors.text }]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.maintenanceDescription, { color: colors.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>
                  <View style={styles.maintenanceArrow}>
                    <Settings size={20} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Backup Information */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Backup Information</Text>
              
              <View style={[styles.backupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.backupHeader}>
                  <Download size={24} color={colors.primary} />
                  <Text style={[styles.backupTitle, { color: colors.text }]}>Last Backup</Text>
                </View>
                
                <Text style={[styles.backupDate, { color: colors.textSecondary }]}>
                  {formatDate(stats.lastBackup)}{stats.lastBackup ? ` ? ${formatDateTime(stats.lastBackup)}` : ''}
                </Text>
                
                <TouchableOpacity
                  style={[styles.backupButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setMaintenanceType('backup');
                    setShowMaintenanceModal(true);
                  }}
                >
                  <Download size={16} color="#FFFFFF" />
                  <Text style={styles.backupButtonText}>Create Backup</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Maintenance Modal */}
      <Modal
        visible={showMaintenanceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMaintenanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <AlertTriangle size={24} color={colors.warning} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Confirm Maintenance
              </Text>
            </View>
            
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              You are about to perform: {maintenanceOptions.find(o => o.type === maintenanceType)?.title}
            </Text>
            
            <Text style={[styles.modalWarning, { color: colors.error }]}>
              This operation may affect database performance. Please ensure no critical operations are running.
            </Text>
            
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
              Type &quot;CONFIRM&quot; to proceed:
            </Text>
            
            <TextInput
              style={[
                styles.confirmInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                }
              ]}
              placeholder="Type CONFIRM"
              placeholderTextColor={colors.placeholder}
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowMaintenanceModal(false);
                  setConfirmText('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: confirmText === 'CONFIRM' ? colors.warning : colors.textTertiary,
                  }
                ]}
                onPress={handleMaintenance}
                disabled={confirmText !== 'CONFIRM'}
              >
                <Text style={styles.modalButtonText}>Proceed</Text>
              </TouchableOpacity>
            </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  tableCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '600',
  },
  tableSize: {
    fontSize: 14,
    fontWeight: '500',
  },
  tableStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tableRows: {
    fontSize: 14,
  },
  tableModified: {
    fontSize: 12,
  },
  maintenanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  maintenanceIcon: {
    marginRight: 16,
  },
  maintenanceContent: {
    flex: 1,
  },
  maintenanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  maintenanceDescription: {
    fontSize: 14,
  },
  maintenanceArrow: {
    marginLeft: 16,
  },
  backupCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  backupTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  backupDate: {
    fontSize: 14,
    marginBottom: 16,
  },
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  backupButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    padding: 20,
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  modalWarning: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
    fontWeight: '500',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  confirmInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});