'use client';

import { Phone, Video } from 'lucide-react';
import { useCallOptional } from '@/components/CallProvider';
import { Button } from '@/components/ui/button';

type Props = {
  roomId: number;
  isDm?: boolean;
};

export function CallButtons({ roomId, isDm }: Props) {
  const call = useCallOptional();
  if (!call) return null;

  return (
    <div className="flex items-center gap-0.5">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-11 w-11 touch-manipulation"
        aria-label={isDm ? 'Start audio call' : 'Start group audio call'}
        disabled={Boolean(call.activeCall)}
        onClick={() => void call.startCall(roomId, 'audio')}
      >
        <Phone className="h-5 w-5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-11 w-11 touch-manipulation"
        aria-label={isDm ? 'Start video call' : 'Start group video call'}
        disabled={Boolean(call.activeCall)}
        onClick={() => void call.startCall(roomId, 'video')}
      >
        <Video className="h-5 w-5" />
      </Button>
    </div>
  );
}
