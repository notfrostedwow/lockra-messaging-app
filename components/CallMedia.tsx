import React, { useEffect, useRef } from 'react';
import { RoomEvent, type Room, type Track } from 'livekit-client';
import type { MediaSession } from '@/lib/calling/types';
export default function CallMedia({ session }: { session: MediaSession }) {
  const container = useRef<HTMLDivElement>(null); const room = session.room as Room;
  useEffect(() => {
    const attached = new Map<Track, HTMLMediaElement>();
    const render = () => {
      if (!container.current) return;
      const wanted = new Set<Track>();
      for (const participant of [room.localParticipant, ...room.remoteParticipants.values()]) {
        for (const publication of participant.trackPublications.values()) {
          const track = publication.track;
          if (!track || (participant === room.localParticipant && track.kind === 'audio')) continue;
          wanted.add(track);
          if (!attached.has(track)) {
            const element = track.attach();
            if (element instanceof HTMLVideoElement) { element.playsInline = true; element.muted = participant === room.localParticipant; element.style.cssText = 'width:100%;max-height:260px;object-fit:contain;background:#111'; }
            element.autoplay = true; attached.set(track, element); container.current.appendChild(element);
          }
        }
      }
      for (const [track, element] of attached) if (!wanted.has(track)) { track.detach(element); element.remove(); attached.delete(track); }
    };
    const events = [RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished, RoomEvent.ParticipantDisconnected];
    for (const event of events) room.on(event, render); render();
    return () => { for (const event of events) room.off(event, render); for (const [track, element] of attached) { track.detach(element); element.remove(); } };
  }, [room]);
  return <div><div ref={container} aria-label="Live call media" /><button onClick={() => { void room.startAudio().catch(() => {}); }}>Enable browser audio playback</button></div>;
}
