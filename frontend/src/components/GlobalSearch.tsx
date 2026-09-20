'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Hash, Search, UserPlus, UserCheck, UserMinus, DoorOpen } from 'lucide-react';
import {
  SEARCH_USERS_QUERY,
  SEARCH_ROOMS_QUERY,
  MY_ROOMS_QUERY,
} from '@/lib/graphql/queries';
import {
  SEND_FRIEND_REQUEST,
  ACCEPT_FRIEND_REQUEST,
  REMOVE_FRIEND,
  JOIN_ROOM_MUTATION,
} from '@/lib/graphql/mutations';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type UserHit = {
  id: number;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  publicProfilePath: string;
  friendshipStatus: string;
};

type RoomHit = {
  id: number;
  name: string;
  description?: string | null;
  inviteCode: string;
  publicRoomPath: string;
};

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchUsers, { data: usersData, loading: usersLoading }] =
    useLazyQuery(SEARCH_USERS_QUERY);
  const [searchRooms, { data: roomsData, loading: roomsLoading }] =
    useLazyQuery(SEARCH_ROOMS_QUERY);
  const { data: myRoomsData, refetch: refetchMyRooms } = useQuery(MY_ROOMS_QUERY);
  const [sendFriendRequest] = useMutation(SEND_FRIEND_REQUEST);
  const [acceptFriendRequest] = useMutation(ACCEPT_FRIEND_REQUEST);
  const [removeFriend] = useMutation(REMOVE_FRIEND);
  const [joinRoom] = useMutation(JOIN_ROOM_MUTATION);

  const myRoomIds = useMemo(
    () => new Set((myRoomsData?.myRooms ?? []).map((r: { id: number }) => r.id)),
    [myRoomsData],
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) return;
    const handle = window.setTimeout(() => {
      void searchUsers({ variables: { query: trimmed } });
      void searchRooms({ variables: { query: trimmed } });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, searchUsers, searchRooms]);

  const users: UserHit[] = usersData?.searchUsers ?? [];
  const rooms: RoomHit[] = roomsData?.searchRooms ?? [];
  const showPanel = open && query.trim().length > 0;

  async function onFriendAction(user: UserHit) {
    if (user.friendshipStatus === 'none') {
      await sendFriendRequest({ variables: { input: { userId: user.id } } });
    } else if (user.friendshipStatus === 'pending_incoming') {
      await acceptFriendRequest({ variables: { input: { userId: user.id } } });
    } else if (user.friendshipStatus === 'friends' || user.friendshipStatus === 'pending_outgoing') {
      await removeFriend({ variables: { input: { userId: user.id } } });
    }
    await searchUsers({ variables: { query: query.trim() } });
  }

  function friendLabel(status: string): string {
    switch (status) {
      case 'friends':
        return 'Friends';
      case 'pending_outgoing':
        return 'Requested';
      case 'pending_incoming':
        return 'Accept';
      default:
        return 'Add friend';
    }
  }

  return (
    <div className={cn('relative min-w-0 flex-1 max-w-md', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          placeholder="Search users & rooms"
          className="h-9 bg-[#1e1f22] pl-8"
          aria-label="Global search"
        />
      </div>

      {showPanel ? (
        <div className="absolute left-0 right-0 top-11 z-40 max-h-96 overflow-y-auto rounded-lg bg-[#111214] p-2 shadow-elev">
          {(usersLoading || roomsLoading) && query.trim() ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Searching…</p>
          ) : null}

          {users.length > 0 ? (
            <div className="mb-2">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Users
              </p>
              <ul className="space-y-1">
                {users.map((user) => {
                  const display = user.displayName || user.username;
                  return (
                    <li
                      key={user.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5"
                    >
                      <Link
                        href={user.publicProfilePath}
                        className="flex min-w-0 flex-1 items-center gap-2"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <UserAvatar name={display} avatarUrl={user.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{display}</p>
                          <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        variant={user.friendshipStatus === 'friends' ? 'secondary' : 'blurple'}
                        className="shrink-0 gap-1"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => void onFriendAction(user)}
                      >
                        {user.friendshipStatus === 'friends' ? (
                          <UserCheck className="h-3.5 w-3.5" />
                        ) : user.friendshipStatus === 'pending_outgoing' ? (
                          <UserMinus className="h-3.5 w-3.5" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        {friendLabel(user.friendshipStatus)}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {rooms.length > 0 ? (
            <div>
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Rooms
              </p>
              <ul className="space-y-1">
                {rooms.map((room) => {
                  const joined = myRoomIds.has(room.id);
                  return (
                    <li
                      key={room.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{room.name}</p>
                          {room.description ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {room.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {joined ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => router.push(`/chat/${room.id}`)}
                        >
                          Open
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="blurple"
                          className="gap-1"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={async () => {
                            await joinRoom({ variables: { roomId: room.id } });
                            await refetchMyRooms();
                            router.push(`/chat/${room.id}`);
                          }}
                        >
                          <DoorOpen className="h-3.5 w-3.5" />
                          Join
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {!usersLoading &&
          !roomsLoading &&
          users.length === 0 &&
          rooms.length === 0 &&
          query.trim() ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No matches.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
