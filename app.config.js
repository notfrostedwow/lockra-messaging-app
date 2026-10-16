// Optional native calling build configuration. No environment file autoload.
module.exports = ({ config }) => {
  if (process.env.LOCKRA_ENABLE_NATIVE_CALLING !== 'true') return config;
  return { ...config, plugins: [...(config.plugins ?? []), '@livekit/react-native-expo-plugin',
    ['@config-plugins/react-native-webrtc', { cameraPermission: 'Allow camera use only for a video call you accept.', microphonePermission: 'Allow microphone use only for a call you accept.' }]] };
};
