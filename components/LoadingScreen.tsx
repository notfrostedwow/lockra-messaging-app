import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { useEffect, useState } from 'react';

const TIMEOUT_MS = 15000; // Match the profile fetch timeout

export function LoadingScreen() {
  const [showTimeout, setShowTimeout] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    console.log("LoadingScreen mounted [details redacted]");

    // Show timeout message after initial timeout
    const timeoutId = setTimeout(() => {
      console.log("Loading timeout reached [details redacted]");
      setShowTimeout(true);
    }, TIMEOUT_MS);

    // Show error message after all retries would have failed
    const errorId = setTimeout(() => {
      console.log("Loading error timeout reached [details redacted]");
      setShowError(true);
    }, TIMEOUT_MS * 2);

    return () => {
      console.log("LoadingScreen unmounted [details redacted]");
      clearTimeout(timeoutId);
      clearTimeout(errorId);
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      {showTimeout && !showError && (
        <Text style={styles.timeoutText}>
          Taking longer than usual...{'\n'}Please wait while we complete setup.
        </Text>
      )}
      {showError && (
        <Text style={styles.errorText}>
          Unable to load profile.{'\n'}Please check your internet connection and try again.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111318',
  },
  timeoutText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  errorText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#dc2626',
    fontSize: 14,
  },
});