'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Copy, Hash, Link2, Users } from 'lucide-react';
import { MessageList } from '@/components/MessageList';
import { NotificationBell } from '@/components/NotificationBell';
import { GlobalSearch } from '@/components/GlobalSearch';
import { AppShell } from '@/components/AppShell';
import { ME_QUERY, MY_DIRECT_MESSAGES_QUERY, MY_ROOMS_QUERY, ROOMS_QUERY } from '@/lib/graphql/queries';
import { getToken } from '@/lib/apollo-client';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';

export default function ChatRoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = Number(params.roomId);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: meData } = useQuery(ME_QUERY, { skip: !ready });
  const { data: roomsData } = useQuery(ROOMS_QUERY, { skip: !ready });
  const { data: myRoomsData } = useQuery(MY_ROOMS_QUERY, { skip: !ready });
  const { data: dmsData } = useQuery(MY_DIRECT_MESSAGES_QUERY, { skip: !ready });

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

  const channel = (roomsData?.rooms ?? []).find((r: { id: number }) => r.id === roomId);
  const myChannel = (myRoomsData?.myRooms ?? []).find((r: { id: number }) => r.id === roomId);
  const dm = (dmsData?.myDirectMessages ?? []).find((r: { id: number }) => r.id === roomId);
  const isDm = Boolean(dm?.isDm || channel?.isDm || myChannel?.isDm);
  const peer = dm?.dmPeer;
  const roomName = isDm
    ? peer?.displayName || peer?.username || dm?.name || 'Direct Message'
    : channel?.name || myChannel?.name || `room-${roomId}`;
  const publicPath =
    !isDm && (channel?.publicRoomPath || myChannel?.publicRoomPath)
      ? channel?.publicRoomPath || myChannel?.publicRoomPath
      : null;

  async function copyPublicLink() {
    if (!publicPath) return;
    const url = `${window.location.origin}${publicPath}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <AppShell
      header={
        <header className="flex h-12 items-center justify-between gap-3 border-b border-black/20 px-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-2">
            {isDm && peer ? (
              <UserAvatar
                name={peer.displayName || peer.username}
                avatarUrl={peer.avatarUrl}
                size="sm"
              />
            ) : (
              <Hash className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <h1 className="truncate font-semibold">{roomName}</h1>
            {!isDm && channel?.description ? (
              <>
                <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
                <p className="hidden truncate text-sm text-muted-foreground sm:block">
                  {channel.description}
                </p>
              </>
            ) : null}
          </div>
          <GlobalSearch className="hidden md:block" />
          <div className="flex items-center gap-1">
            {publicPath ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-1.5 text-muted-foreground"
                onClick={() => void copyPublicLink()}
                aria-label="Copy public room link"
              >
                {copied ? (
                  <Copy className="h-4 w-4 text-discord-online" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Invite link'}</span>
              </Button>
            ) : null}
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
        isDm={isDm}
      />
    </AppShell>
  );
}
