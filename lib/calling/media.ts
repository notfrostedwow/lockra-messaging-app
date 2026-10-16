import { liveKitSession } from './livekitSession';
// Web SDK is lazy: demo never imports or initializes it.
export async function createMediaSession() {
  const { Room, LogLevel, setLogLevel } = await import('livekit-client');
  setLogLevel(LogLevel.silent);
  return liveKitSession(new Room({ adaptiveStream: true, dynacast: true, disconnectOnPageLeave: true }), {
    permissions: async kind => {
      if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('A secure browser context and media permissions are required.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' });
      stream.getTracks().forEach(track => track.stop());
    }, start: async () => {}, stop: async () => {},
  });
}
