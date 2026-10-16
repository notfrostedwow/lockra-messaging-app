import { Alert } from '@/lib/alert';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Platform, Linking } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Stack, useRouter } from 'expo-router';
import { Smartphone, Bell, Camera, Mic, MapPin, Database, Wifi, Battery, Volume2, Vibrate, ArrowLeft, Shield, HardDrive, Trash2, RefreshCw, BarChart3 } from 'lucide-react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';


interface DeviceInfo {
  deviceName: string;
  deviceType: string;
  osName: string;
  osVersion: string;
  appVersion: string;
  buildNumber: string;
  totalMemory: string;
  freeMemory: string;
  totalStorage: string;
  freeStorage: string;
}

interface PermissionStatus {
  camera: boolean | null;
  microphone: boolean | null;
  location: boolean | null;
  notifications: boolean | null;
  storage: boolean | null;
}

const DeviceOption = ({
    icon: Icon,
    title,
    description,
    value,
    onToggle,
    isLast = false
  }: {
    icon: any,
    title: string,
    description: string,
    value: boolean,
    onToggle: () => void,
    isLast?: boolean
  }) => { const { colors } = useTheme(); return (
    <View style={[
      styles.optionContainer,
      isLast && styles.lastOption,
      { borderBottomColor: colors.border }
    ]}>
      <View style={styles.optionLeft}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '15' }]}>
          <Icon size={20} color={colors.primary} />
        </View>
        <View style={styles.optionText}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
            {description}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  ); };

const InfoRow = ({ label, value }: { label: string; value: string }) => { const { colors } = useTheme(); return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  ); };

const PermissionRow = ({
    icon: Icon,
    title,
    status
  }: {
    icon: any;
    title: string;
    status: boolean | null
  }) => { const { colors } = useTheme(); return (
    <View style={styles.permissionRow}>
      <View style={styles.permissionLeft}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '15' }]}>
          <Icon size={18} color={colors.primary} />
        </View>
        <Text style={[styles.permissionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={[
        styles.statusBadge,
        { backgroundColor: status ? colors.success + '20' : colors.error + '20' }
      ]}>
        <Text style={[
          styles.statusText,
          { color: status ? colors.success : colors.error }
        ]}>
          {status === null ? 'Unknown' : status ? 'Granted' : 'Denied'}
        </Text>
      </View>
    </View>
  ); };

function loadDeviceInfo(): DeviceInfo {
    try {
      const deviceName = Device.deviceName || 'Unknown Device';
      const deviceType = Device.deviceType ? Device.DeviceType[Device.deviceType] : 'Unknown';
      const osName = Device.osName || Platform.OS;
      const osVersion = Device.osVersion || Platform.Version.toString();

      let appVersion = '1.0.0';
      let buildNumber = '1';

      try {
        appVersion = Application.nativeApplicationVersion || '1.0.0';
        buildNumber = Application.nativeBuildVersion || '1';
      } catch {
        console.warn("Could not get app version info: [details redacted]");
      }

      // Display only available platform constants; no invented capacity measurements.
      const totalMemory = Device.totalMemory ? (Device.totalMemory / (1024 ** 3)).toFixed(1) + ' GB' : 'Unavailable';
      const freeMemory = 'Unavailable';
      const totalStorage = 'Unavailable';
      const freeStorage = 'Unavailable';

      return {
        deviceName,
        deviceType,
        osName,
        osVersion,
        appVersion,
        buildNumber,
        totalMemory,
        freeMemory,
        totalStorage,
        freeStorage,
      };
    } catch {
      console.error("Error loading device info: [details redacted]");
    }
  return { deviceName: 'Unknown', deviceType: 'Unknown', osName: Platform.OS, osVersion: String(Platform.Version), appVersion: 'Unknown', buildNumber: 'Unknown', totalMemory: 'Unavailable', freeMemory: 'Unavailable', totalStorage: 'Unavailable', freeStorage: 'Unavailable' };
}

function loadPermissions(): PermissionStatus {
  return { camera: null, microphone: null, location: null, notifications: null, storage: null };
}
function calculateCacheSize() { return 'Unavailable'; }

export default function DeviceSettings() {
  const { colors } = useTheme();
  useAuth();
  const router = useRouter();

  const [deviceInfo] = useState<DeviceInfo>(loadDeviceInfo);

  const permissions = loadPermissions();

  const [settings, setSettings] = useState({
    autoBackup: true,
    wifiOnly: true,
    batteryOptimization: false,
    hapticFeedback: true,
    soundEffects: true,
    autoUpdate: true,
    crashReporting: true,
    analytics: false,
  });

  const cacheSize = calculateCacheSize();
  const loading = false;



  const handleToggle = (setting: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  };

  const handleClearCache = () => { Alert.alert('Unavailable', 'Device cache deletion is not implemented. No files were deleted.'); };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all app settings to their default values. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSettings({
              autoBackup: true,
              wifiOnly: true,
              batteryOptimization: false,
              hapticFeedback: true,
              soundEffects: true,
              autoUpdate: true,
              crashReporting: true,
              analytics: false,
            });
            Alert.alert('Success', 'Settings have been reset to defaults');
          },
        },
      ]
    );
  };

  const openSystemSettings = () => {
    if (Platform.OS === 'web') { Alert.alert('Unavailable', 'Native system settings are not available on web. This screen does not inspect or grant permissions.'); return; }
    Alert.alert(
      'Open System Settings',
      'This will open your device\'s system settings where you can manage app permissions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: () => {
            Linking.openSettings();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerTitle: "Device Settings",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
            <Smartphone size={28} color={colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Device Settings
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Local preferences only. Permission inspection, cache cleanup, backups and native behavior remain unavailable or unverified.
          </Text>
        </View>

        {/* Device Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Device Information
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <InfoRow label="Device Name" value={deviceInfo.deviceName} />
            <InfoRow label="Device Type" value={deviceInfo.deviceType} />
            <InfoRow label="Operating System" value={`${deviceInfo.osName} ${deviceInfo.osVersion}`} />
            <InfoRow label="App Version" value={`${deviceInfo.appVersion} (${deviceInfo.buildNumber})`} />
            <InfoRow label="Memory" value={`${deviceInfo.freeMemory} / ${deviceInfo.totalMemory}`} />
            <InfoRow label="Storage" value={`${deviceInfo.freeStorage} / ${deviceInfo.totalStorage}`} />
          </View>
        </View>

        {/* App Permissions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              App Permissions
            </Text>
            <TouchableOpacity onPress={openSystemSettings}>
              <Text style={[styles.manageText, { color: colors.primary }]}>Manage</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <PermissionRow icon={Camera} title="Camera" status={permissions.camera} />
            <PermissionRow icon={Mic} title="Microphone" status={permissions.microphone} />
            <PermissionRow icon={MapPin} title="Location" status={permissions.location} />
            <PermissionRow icon={Bell} title="Notifications" status={permissions.notifications} />
            <PermissionRow icon={HardDrive} title="Storage" status={permissions.storage} />
          </View>
        </View>

        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            App Preferences
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <DeviceOption
              icon={Database}
              title="Auto Backup"
              description="Automatically backup your data"
              value={settings.autoBackup}
              onToggle={() => handleToggle('autoBackup')}
            />
            <DeviceOption
              icon={Wifi}
              title="WiFi Only"
              description="Use WiFi only for data sync"
              value={settings.wifiOnly}
              onToggle={() => handleToggle('wifiOnly')}
            />
            <DeviceOption
              icon={Battery}
              title="Battery Optimization"
              description="Optimize for battery life"
              value={settings.batteryOptimization}
              onToggle={() => handleToggle('batteryOptimization')}
            />
            <DeviceOption
              icon={Vibrate}
              title="Haptic Feedback"
              description="Vibrate on touch interactions"
              value={settings.hapticFeedback}
              onToggle={() => handleToggle('hapticFeedback')}
            />
            <DeviceOption
              icon={Volume2}
              title="Sound Effects"
              description="Play sounds for app interactions"
              value={settings.soundEffects}
              onToggle={() => handleToggle('soundEffects')}
              isLast={true}
            />
          </View>
        </View>

        {/* System Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            System Preferences
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <DeviceOption
              icon={RefreshCw}
              title="Auto Update"
              description="Automatically update the app"
              value={settings.autoUpdate}
              onToggle={() => handleToggle('autoUpdate')}
            />
            <DeviceOption
              icon={Shield}
              title="Crash Reporting"
              description="Send crash reports to improve the app"
              value={settings.crashReporting}
              onToggle={() => handleToggle('crashReporting')}
            />
            <DeviceOption
              icon={BarChart3}
              title="Analytics"
              description="Share usage data to improve the app"
              value={settings.analytics}
              onToggle={() => handleToggle('analytics')}
              isLast={true}
            />
          </View>
        </View>

        {/* Storage Management */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Storage Management
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.storageRow}>
              <View style={styles.storageInfo}>
                <Text style={[styles.storageTitle, { color: colors.text }]}>Cache Size</Text>
                <Text style={[styles.storageSize, { color: colors.textSecondary }]}>{cacheSize}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.clearButton,
                  {
                    backgroundColor: colors.error + '15',
                    opacity: loading ? 0.5 : 1,
                  }
                ]}
                onPress={handleClearCache}
                disabled={loading}
              >
                <Trash2 size={16} color={colors.error} />
                <Text style={[styles.clearButtonText, { color: colors.error }]}>
                  {loading ? 'Clearing...' : 'Clear'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Reset Settings */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.resetButton,
              {
                backgroundColor: colors.error + '15',
                borderColor: colors.error + '30',
              },
            ]}
            onPress={handleResetSettings}
          >
            <RefreshCw size={20} color={colors.error} />
            <Text style={[styles.resetButtonText, { color: colors.error }]}>
              Reset All Settings
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  manageText: {
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  lastOption: {
    borderBottomWidth: 0,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '400',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  storageInfo: {
    flex: 1,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  storageSize: {
    fontSize: 14,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    padding: 8,
  },
});
