'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Hash, Users } from 'lucide-react';
import { MessageInput, MessageList } from '@/components/MessageList';
import { NotificationBell } from '@/components/NotificationBell';
import { AppShell } from '@/components/AppShell';
import { ME_QUERY, ROOMS_QUERY } from '@/lib/graphql/queries';
import { getToken } from '@/lib/apollo-client';
import { Button } from '@/components/ui/button';

export default function ChatRoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = Number(params.roomId);
  const [ready, setReady] = useState(false);

  const { data: meData } = useQuery(ME_QUERY, { skip: !ready });
  const { data: roomsData } = useQuery(ROOMS_QUERY, { skip: !ready });

  useEffect(() => {
    setReady(true);
    if (!getToken()) {
      router.replace('/');
    }
  }, [router]);

  if (!ready || Number.isNaN(roomId)) {
    return (
      <main className="flex h-screen items-center justify-center bg-discord-deepest text-muted-foreground">
        Loading chat…
      </main>
    );
  }

  const room = roomsData?.rooms?.find((r: { id: number }) => r.id === roomId);
  const roomName = room?.name ?? `room-${roomId}`;

  return (
    <AppShell
      header={
        <header className="flex h-12 items-center justify-between border-b border-black/20 px-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-2">
            <Hash className="h-5 w-5 shrink-0 text-muted-foreground" />
            <h1 className="truncate font-semibold">{roomName}</h1>
            {room?.description ? (
              <>
                <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
                <p className="hidden truncate text-sm text-muted-foreground sm:block">
                  {room.description}
                </p>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" size="icon" variant="ghost" aria-label="Member list">
              <Users className="h-5 w-5 text-muted-foreground" />
            </Button>
            <NotificationBell />
          </div>
        </header>
      }
    >
      <MessageList
        roomId={roomId}
        currentUserId={meData?.me?.id}
        roomName={roomName}
      />
      <MessageInput roomId={roomId} roomName={roomName} />
    </AppShell>
  );
}
