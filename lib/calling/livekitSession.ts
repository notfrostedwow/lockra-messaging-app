import type { Room } from 'livekit-client';
import type { CallCredentials, CallKind, MediaSession } from './types';
/** One implementation used by the actual web/native SDK factories and explicit SDK mocks. */
export function liveKitSession(room: Room, platform: { permissions: (kind: CallKind) => Promise<void>; start: () => Promise<void>; stop: () => Promise<void> }): MediaSession {
  let closed = false;
  const disconnect = async () => {
    closed = true;
    try {
      for (const publication of room.localParticipant.trackPublications.values()) publication.track?.stop();
      await room.disconnect(true);
    } finally { await platform.stop(); }
  };
  return {
    room,
    connect: async (credentials: CallCredentials, kind: CallKind) => {
      try {
        await platform.permissions(kind); if (closed) throw new Error('Call cancelled before media permissions completed.');
        await platform.start(); if (closed) throw new Error('Call cancelled.');
        await room.connect(credentials.url, credentials.token, { autoSubscribe: true, maxRetries: 0, websocketTimeout: 10000, peerConnectionTimeout: 15000 });
        if (closed) throw new Error('Call cancelled while connecting.');
        await room.localParticipant.setMicrophoneEnabled(true);
        if (closed) throw new Error('Call cancelled while enabling microphone.');
        if (kind === 'video') await room.localParticipant.setCameraEnabled(true);
        if (closed) throw new Error('Call cancelled while publishing.');
      } catch { await disconnect(); throw new Error('Media connection or microphone/camera permission failed.'); }
    },
    disconnect,
    microphone: async enabled => {
      if (closed) throw new Error('Call closed.'); await room.localParticipant.setMicrophoneEnabled(enabled);
      if (closed) { await disconnect(); throw new Error('Call cancelled while changing microphone.'); }
    },
    camera: async enabled => {
      if (closed) throw new Error('Call closed.'); await room.localParticipant.setCameraEnabled(enabled);
      if (closed) { await disconnect(); throw new Error('Call cancelled while changing camera.'); }
    },
    onDisconnected: callback => { room.on('disconnected', callback); return () => { room.off('disconnected', callback); }; },
  };
}
