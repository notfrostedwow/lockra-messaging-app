import LogSnag, { Sentry, telemetryEnabled } from './telemetry';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get the LogSnag API key from Expo constants or environment variables
const LOGSNAG_API_KEY = ''; // Never put privileged provider keys in a client.

// Initialize LogSnag with API key from environment variables
const logsnag = new LogSnag({
  token: LOGSNAG_API_KEY,
  project: 'hushed',
});

// Helper function to get device ID
const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await AsyncStorage.getItem('hushed_device_id');
    
    if (!deviceId) {
      // Generate a UUID as deviceId
      deviceId = Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
      await AsyncStorage.setItem('hushed_device_id', deviceId);
    }
    
    return deviceId;
  } catch {
    console.error("Error getting/setting device ID: [details redacted]");
    // Return a temporary ID if storage fails
    return `temp-${Date.now()}`;
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

/**
 * Log an error to both Sentry and LogSnag
 * @param error The error object
 * @param context Additional context information
 * @param userId Optional user ID
 */
export const logError = async (
  error: Error | string,
  context: Record<string, any> = {},
  userId?: string
) => {
  if (!telemetryEnabled) return;
  try {
    // Convert string errors to Error objects
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    // Send to Sentry with minimal configuration
    Sentry.captureException(errorObj);
    
    // Also log to LogSnag for critical errors
    const deviceInfo = await getDeviceInfo();
    
    await logsnag.track({
      channel: 'errors',
      event: 'app_error',
      description: errorObj.message,
      user_id: userId || 'anonymous',
      tags: {
        errorType: errorObj.name,
        platform: deviceInfo.platform,
        deviceType: deviceInfo.deviceType,
        deviceBrand: deviceInfo.deviceBrand,
        appVersion: deviceInfo.appVersion,
        ...context
      },
      notify: true
    });
  } catch {
    // Last resort console log
    console.error("Error in error tracking: [details redacted]");
    console.error("Original error: [details redacted]");
  }
};

/**
 * Set the current user for error tracking
 * @param userId User ID
 * @param email Optional user email
 * @param username Optional username
 */
export const setErrorUser = (userId: string, email?: string, username?: string) => {
  try {
    Sentry.setUser({
      id: userId,
      email,
      username
    });
  } catch {
    console.error("Error setting Sentry user: [details redacted]");
  }
};

/**
 * Clear the current user from error tracking
 */
export const clearErrorUser = () => {
  try {
    Sentry.setUser(null);
  } catch {
    console.error("Error clearing Sentry user: [details redacted]");
  }
};

/**
 * Add a breadcrumb to track user actions
 * @param message Breadcrumb message
 * @param category Breadcrumb category
 * @param data Additional data
 */
export const addBreadcrumb = (
  message: string,
  category: string = 'default',
  data: Record<string, any> = {}
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info'
  });
};

// Export Sentry directly for additional functionality
export { Sentry }; 