import { liveKitSession } from './livekitSession';
export async function createMediaSession() {
  const native = await import('@livekit/react-native');
  native.setLogLevel('silent'); native.registerGlobals();
  const { Room, LogLevel, setLogLevel } = await import('livekit-client');
  setLogLevel(LogLevel.silent);
  const { Camera } = await import('expo-camera');
  return liveKitSession(new Room({ adaptiveStream: true, dynacast: true }), {
    permissions: async kind => {
      if (!(await Camera.requestMicrophonePermissionsAsync()).granted) throw new Error('Microphone permission denied.');
      if (kind === 'video' && !(await Camera.requestCameraPermissionsAsync()).granted) throw new Error('Camera permission denied.');
    }, start: () => native.AudioSession.startAudioSession(), stop: () => native.AudioSession.stopAudioSession(),
  });
}
