'use client';

import { useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { useCall } from '@/components/CallProvider';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';

function RemoteTile({
  stream,
  label,
  avatarUrl,
}: {
  stream?: MediaStream;
  label: string;
  avatarUrl?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (video) video.srcObject = stream ?? null;
    if (audio) audio.srcObject = stream ?? null;
    return () => {
      if (video) video.srcObject = null;
      if (audio) audio.srcObject = null;
    };
  }, [stream]);

  const hasVideo = Boolean(
    stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live'),
  );

  return (
    <div className="relative flex aspect-video min-h-[140px] items-center justify-center overflow-hidden rounded-xl bg-[#1e1f22]">
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
      ) : (
        <>
          <audio ref={audioRef} autoPlay />
          <UserAvatar name={label} avatarUrl={avatarUrl} size="xl" />
        </>
      )}
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {label}
      </span>
    </div>
  );
}

export function CallOverlay() {
  const {
    activeCall,
    localStream,
    remoteStreams,
    muted,
    cameraOff,
    error,
    hangUp,
    toggleMute,
    toggleCamera,
  } = useCall();
  const localRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = localRef.current;
    if (!el || !localStream) return;
    el.srcObject = localStream;
    return () => {
      el.srcObject = null;
    };
  }, [localStream]);

  if (!activeCall) return null;

  const remotes = Object.entries(remoteStreams);
  const gridCols =
    remotes.length <= 1 ? 'grid-cols-1' : remotes.length === 2 ? 'grid-cols-2' : 'grid-cols-2';

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-[#111214]/safe-pt safe-pb">
      <header className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {activeCall.mediaType === 'video' ? 'Video call' : 'Audio call'}
          </p>
          <p className="text-xs text-muted-foreground">
            {activeCall.status === 'ringing' ? 'Ringing…' : 'Connected'} · max{' '}
            {activeCall.maxParticipants}
          </p>
        </div>
      </header>

      <div className={cn('grid flex-1 gap-2 overflow-y-auto p-3', gridCols)}>
        <div className="relative flex aspect-video min-h-[140px] items-center justify-center overflow-hidden rounded-xl bg-[#1e1f22]">
          {!cameraOff && localStream?.getVideoTracks().length ? (
            <video
              ref={localRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full -scale-x-100 object-cover"
            />
          ) : (
            <p className="text-sm text-muted-foreground">You</p>
          )}
          <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
            You{muted ? ' (muted)' : ''}
          </span>
        </div>

        {remotes.map(([userId, stream]) => {
          const participant = activeCall.participants?.find((p) => p.userId === Number(userId));
          const label =
            participant?.user?.displayName ||
            participant?.user?.username ||
            `User ${userId}`;
          return (
            <RemoteTile
              key={userId}
              stream={stream}
              label={label}
              avatarUrl={participant?.user?.avatarUrl}
            />
          );
        })}
      </div>

      {error ? <p className="px-4 pb-2 text-center text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center justify-center gap-3 px-4 py-4">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-12 w-12 rounded-full"
          aria-label={muted ? 'Unmute' : 'Mute'}
          onClick={() => void toggleMute()}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        {activeCall.mediaType === 'video' ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-12 w-12 rounded-full"
            aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
            onClick={() => void toggleCamera()}
          >
            {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="h-14 w-14 rounded-full"
          aria-label="Hang up"
          onClick={() => void hangUp()}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
