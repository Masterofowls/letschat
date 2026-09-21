'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Hash, Search, UserPlus, UserCheck, UserMinus, DoorOpen, X } from 'lucide-react';
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

type GlobalSearchProps = {
  className?: string;
  /** Icon-only trigger that opens a full-screen search sheet (mobile). */
  compact?: boolean;
};

export function GlobalSearch({ className, compact = false }: GlobalSearchProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
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

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const users: UserHit[] = usersData?.searchUsers ?? [];
  const rooms: RoomHit[] = roomsData?.searchRooms ?? [];
  const showPanel = (open || sheetOpen) && query.trim().length > 0;

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

  function Results({ mobile }: { mobile?: boolean }) {
    return (
      <div
        className={cn(
          mobile
            ? 'flex-1 overflow-y-auto p-3'
            : 'absolute left-0 right-0 top-11 z-40 max-h-96 overflow-y-auto rounded-lg bg-[#111214] p-2 shadow-elev',
        )}
      >
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
                    className="flex min-h-11 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5"
                  >
                    <Link
                      href={user.publicProfilePath}
                      className="flex min-w-0 flex-1 items-center gap-2"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setSheetOpen(false)}
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
                      className="min-h-9 shrink-0 gap-1 touch-manipulation"
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
                      <span className="hidden sm:inline">{friendLabel(user.friendshipStatus)}</span>
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
                    className="flex min-h-11 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5"
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
                        className="min-h-9 touch-manipulation"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSheetOpen(false);
                          router.push(`/chat/${room.id}`);
                        }}
                      >
                        Open
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="blurple"
                        className="min-h-9 gap-1 touch-manipulation"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={async () => {
                          await joinRoom({ variables: { roomId: room.id } });
                          await refetchMyRooms();
                          setSheetOpen(false);
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
    );
  }

  if (compact) {
    return (
      <div className={cn('relative', className)}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 touch-manipulation"
          aria-label="Search users and rooms"
          onClick={() => setSheetOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>

        {sheetOpen ? (
          <div
            className="fixed inset-0 z-[60] flex flex-col bg-[#1e1f22] safe-pt"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
          >
            <div className="flex items-center gap-2 border-b border-black/20 px-3 py-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search users & rooms"
                  className="h-11 bg-[#111214] pl-8 text-base"
                  aria-label="Global search"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0"
                aria-label="Close search"
                onClick={() => {
                  setSheetOpen(false);
                  setQuery('');
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {showPanel ? (
              <Results mobile />
            ) : (
              <p className="px-5 py-8 text-sm text-muted-foreground">
                Type to find people and rooms.
              </p>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('relative min-w-0 max-w-md flex-1', className)}>
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

      {showPanel ? <Results /> : null}
    </div>
  );
}
