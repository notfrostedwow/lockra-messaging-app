import React from 'react';
import { View } from 'react-native';
import { RoomContext, useTracks, isTrackReference, VideoTrack } from '@livekit/react-native';
import { Track, type Room } from 'livekit-client';
import type { MediaSession } from '@/lib/calling/types';
function Tracks() {
  const tracks = useTracks([Track.Source.Camera]);
  return <View>{tracks.filter(isTrackReference).map(track => <VideoTrack key={track.participant.identity + track.source} trackRef={track} objectFit="contain" style={{ height: 240, width: '100%' }} />)}</View>;
}
export default function CallMedia({ session }: { session: MediaSession }) {
  return <RoomContext.Provider value={session.room as Room}><Tracks /></RoomContext.Provider>;
}
