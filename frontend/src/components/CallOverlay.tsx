'use client';

import {
  CallingState,
  ParticipantView,
  StreamCall,
  StreamTheme,
  StreamVideo,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { useCall as useLetsCall } from '@/components/CallProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function StreamCallBody() {
  const { useParticipants, useCallCallingState } = useCallStateHooks();
  const participants = useParticipants();
  const callingState = useCallCallingState();
  const { activeCall, hangUp, muted, cameraOff, toggleMute, toggleCamera } = useLetsCall();

  if (!activeCall) return null;

  const joined = callingState === CallingState.JOINED;

  let statusText = 'Connecting media…';
  if (activeCall.status === 'ringing' && participants.length <= 1) statusText = 'Ringing…';
  else if (joined) statusText = 'Connected';

  const gridCols = participants.length <= 1 ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <StreamTheme as="div" className="flex h-full flex-col bg-[#111214] text-white">
      <header className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-semibold">
            {activeCall.mediaType === 'video' ? 'Video call' : 'Audio call'}
          </p>
          <p className="text-xs text-muted-foreground">{statusText}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {participants.length}/{activeCall.maxParticipants}
        </p>
      </header>

      <div className={cn('grid flex-1 gap-2 overflow-y-auto p-3', gridCols)}>
        {participants.map((p) => (
          <div
            key={p.sessionId}
            className="relative aspect-video min-h-[140px] overflow-hidden rounded-xl bg-[#1e1f22]"
          >
            <ParticipantView participant={p} className="h-full w-full" />
          </div>
        ))}
        {participants.length === 0 ? (
          <div className="flex aspect-video min-h-[140px] items-center justify-center rounded-xl bg-[#1e1f22] text-sm text-muted-foreground">
            Waiting for opponent…
          </div>
        ) : null}
      </div>

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
    </StreamTheme>
  );
}

export function CallOverlay() {
  const { activeCall, streamClient, streamCall, error, hangUp } = useLetsCall();

  if (!activeCall) return null;

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-[#111214] safe-pt safe-pb">
      {streamClient && streamCall ? (
        <StreamVideo client={streamClient}>
          <StreamCall call={streamCall}>
            <StreamCallBody />
          </StreamCall>
        </StreamVideo>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <p className="text-sm text-muted-foreground">
            {activeCall.status === 'ringing' ? 'Ringing…' : 'Connecting to GetStream…'}
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="button" variant="destructive" onClick={() => void hangUp()}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
