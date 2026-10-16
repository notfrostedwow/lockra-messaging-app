import { Alert as NativeAlert, Platform } from 'react-native';
import { alertQueue } from './alertQueue';

// React Native Web's Alert.alert is a no-op. Preserve the native contract on web
// so confirmation callbacks and visible failures actually work.
export const Alert: Pick<typeof NativeAlert, 'alert' | 'prompt'> = {
  alert(title, message, buttons, options) {
    if (Platform.OS !== 'web') return NativeAlert.alert(title, message, buttons, options);
    alertQueue.push(title, message, buttons, options);
  },
  prompt(...args) {
    if (Platform.OS === 'ios') return NativeAlert.prompt(...args);
    alertQueue.push('Unavailable on this platform', 'The legacy native text prompt is iOS-only. MFA requires a separately configured and verified authentication-provider flow.');
  },
};
