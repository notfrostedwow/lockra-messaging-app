const path = require('node:path');
// Do not forward provider credentials or production app configuration to demo/checks.
module.exports = function offlineEnvironment() {
  const env = {};
  for (const key of ['Path', 'PATH', 'SystemRoot', 'SYSTEMROOT', 'SystemDrive', 'ComSpec', 'PATHEXT',
    'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return { ...env, EXPO_NO_DOTENV: '1', EXPO_NO_TELEMETRY: '1', EXPO_OFFLINE: '1',
    __UNSAFE_EXPO_HOME_DIRECTORY: path.resolve('.cache/expo'), EXPO_PUBLIC_LOCKRA_MODE: 'demo', CI: '1' };
};
