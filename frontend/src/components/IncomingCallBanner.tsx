'use client';

import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '@/components/CallProvider';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';

export function IncomingCallBanner() {
  const { incomingCall, acceptCall, declineCall } = useCall();
  if (!incomingCall) return null;

  const caller =
    incomingCall.participants?.find((p) => p.userId === incomingCall.createdById)?.user ||
    null;
  const name = caller?.displayName || caller?.username || 'Incoming call';

  return (
    <div
      className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-[#111214] p-3 shadow-elev sm:inset-x-auto sm:right-4 sm:top-4"
      role="alertdialog"
      aria-label="Incoming call"
    >
      <UserAvatar name={name} avatarUrl={caller?.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{name}</p>
        <p className="text-xs text-muted-foreground">
          Incoming {incomingCall.mediaType === 'video' ? 'video' : 'audio'} call
        </p>
      </div>
      <Button
        type="button"
        size="icon"
        className="h-11 w-11 rounded-full bg-discord-online text-white hover:brightness-110"
        aria-label="Accept call"
        onClick={() => void acceptCall()}
      >
        {incomingCall.mediaType === 'video' ? (
          <Video className="h-5 w-5" />
        ) : (
          <Phone className="h-5 w-5" />
        )}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="destructive"
        className="h-11 w-11 rounded-full"
        aria-label="Decline call"
        onClick={() => void declineCall()}
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}
