import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import type { CallProvider } from './service';
export function createLiveKitProvider(config: { url: string; apiKey: string; apiSecret: string }): CallProvider {
  const url = new URL(config.url);
  if (url.protocol !== 'wss:' || url.username || url.password || /example|YOUR_|placeholder/i.test(config.url + config.apiKey + config.apiSecret) || !config.apiKey || config.apiSecret.length < 32) throw new Error('Complete server-only LiveKit configuration required.');
  const controlUrl = new URL(url); controlUrl.protocol = 'https:';
  const rooms = new RoomServiceClient(controlUrl.origin, config.apiKey, config.apiSecret);
  return {
    mint: async (room, identity, kind) => {
      const token = new AccessToken(config.apiKey, config.apiSecret, { identity, ttl: 60 });
      token.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true,
        canPublishData: false, canUpdateOwnMetadata: false,
        canPublishSources: kind === 'video' ? [TrackSource.CAMERA, TrackSource.MICROPHONE] : [TrackSource.MICROPHONE] });
      return { url: url.href, room, token: await token.toJwt() };
    },
    close: async room => { await rooms.deleteRoom(room); },
  };
}
