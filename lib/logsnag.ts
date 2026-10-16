import LogSnag, { telemetryEnabled } from './telemetry';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

// Get the LogSnag API key from Expo constants or environment variables
const LOGSNAG_API_KEY = ''; // Never put privileged provider keys in a client.

// Constants for storage
const DEVICE_ID_KEY = 'hushed_device_id';

const LOGGED_IN_USERS_KEY = 'hushed_logged_in_users';

// Initialize LogSnag with API key from environment variables
const logsnag = new LogSnag({
  token: LOGSNAG_API_KEY,
  project: 'hushed',
});

// Helper function to get a unique device ID
const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      deviceId = uuidv4();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  } catch {
    console.error("Error getting/setting device ID: [details redacted]");
    // Return a temporary ID if storage fails
    return `temp-${Date.now()}`;
  }
};

// Track users who have logged in on this device
const trackLoggedInUser = async (userId: string): Promise<boolean> => {
  try {
    // Get the stored list of users who have logged in on this device
    const storedUsersJson = await AsyncStorage.getItem(LOGGED_IN_USERS_KEY);
    const loggedInUsers: string[] = storedUsersJson ? JSON.parse(storedUsersJson) : [];
    
    // Check if this user has already logged in on this device
    const isFirstLogin = !loggedInUsers.includes(userId);
    
    // If this is the first login for this user on this device, add them to the list
    if (isFirstLogin) {
      loggedInUsers.push(userId);
      await AsyncStorage.setItem(LOGGED_IN_USERS_KEY, JSON.stringify(loggedInUsers));
    }
    
    return isFirstLogin;
  } catch {
    console.error("Error tracking logged in user: [details redacted]");
    return true; // Default to tracking if there's an error
  }
};

// Helper function to get device information
const getDeviceInfo = async () => {
  try {
    const deviceType = Device.deviceType === Device.DeviceType.PHONE 
      ? 'phone' 
      : Device.deviceType === Device.DeviceType.TABLET 
        ? 'tablet' 
        : 'unknown';
    
    const deviceId = await getDeviceId();
    
    return {
      deviceId,
      platform: Platform.OS,
      deviceType,
      deviceBrand: Device.brand || 'unknown',
      osVersion: Platform.Version.toString(),
      appVersion: Constants.expoConfig?.version || 'development'
    };
  } catch {
    console.error("Error getting device info: [details redacted]");
    return {
      deviceId: 'unknown',
      platform: Platform.OS,
      deviceType: 'unknown',
      deviceBrand: 'unknown',
      osVersion: 'unknown',
      appVersion: 'unknown'
    };
  }
};

// Track user logged in event
export const trackUserLoggedIn = async (userId: string) => {
  if (!telemetryEnabled) return;
  try {
    const deviceInfo = await getDeviceInfo();
    
    // Check if this is the first login on this device for this user
    const isFirstLogin = await trackLoggedInUser(userId);
    
    // Only send the event if this is the first login for this user on this device
    if (isFirstLogin) {
      await logsnag.track({
        channel: 'auth',
        event: 'user_logged_in',
        user_id: userId,
        tags: {
          platform: deviceInfo.platform,
          deviceType: deviceInfo.deviceType,
          deviceBrand: deviceInfo.deviceBrand,
          osVersion: deviceInfo.osVersion,
          appVersion: deviceInfo.appVersion,
          deviceId: deviceInfo.deviceId,
          uniqueLogin: 'true'
        },
        notify: false
      });
    } else {
      // Optional: track recurring logins with a different event name if needed
      await logsnag.track({
        channel: 'auth',
        event: 'user_logged_in_again',
        user_id: userId,
        tags: {
          platform: deviceInfo.platform,
          deviceType: deviceInfo.deviceType,
          deviceBrand: deviceInfo.deviceBrand,
          deviceId: deviceInfo.deviceId,
          uniqueLogin: 'false'
        },
        notify: false
      });
    }
  } catch {
    console.error("LogSnag tracking error (user_logged_in): [details redacted]");
  }
};

// Track account created event
export const trackAccountCreated = async (userId: string, timestamp: string) => {
  if (!telemetryEnabled) return;
  try {
    const deviceInfo = await getDeviceInfo();
    
    // Track the user as logged in
    await trackLoggedInUser(userId);
    
    await logsnag.track({
      channel: 'auth',
      event: 'account_created',
      user_id: userId,
      tags: {
        platform: deviceInfo.platform,
        deviceType: deviceInfo.deviceType,
        deviceBrand: deviceInfo.deviceBrand,
        osVersion: deviceInfo.osVersion,
        appVersion: deviceInfo.appVersion,
        deviceId: deviceInfo.deviceId,
        createdAt: timestamp
      },
      notify: true // Notify for new account creations
    });
  } catch {
    console.error("LogSnag tracking error (account_created): [details redacted]");
  }
}; 