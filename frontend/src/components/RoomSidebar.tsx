'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { ChevronDownIcon, PlusIcon, SearchIcon } from 'lucide-animated';
import { Hash } from 'lucide-react';
import { MY_ROOMS_QUERY, ROOMS_QUERY, ME_QUERY } from '@/lib/graphql/queries';
import {
  CREATE_ROOM_MUTATION,
  JOIN_ROOM_MUTATION,
  REPORT_PLATFORM_MUTATION,
} from '@/lib/graphql/mutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { UserAvatar } from '@/components/UserAvatar';
import { SecuritySettings } from '@/components/SecuritySettings';
import { SettingsMenuButton, UserSettings } from '@/components/UserSettings';
import { detectPlatform, platformLabel } from '@/lib/platform';
import { cn } from '@/lib/utils';

type Room = {
  id: number;
  name: string;
  description?: string | null;
};

export function RoomSidebar() {
  const pathname = usePathname();
  const { data: meData, refetch: refetchMe } = useQuery(ME_QUERY);
  const { data: myRoomsData, refetch: refetchMy } = useQuery<{ myRooms: Room[] }>(
    MY_ROOMS_QUERY,
  );
  const { data: roomsData, refetch: refetchAll } = useQuery<{ rooms: Room[] }>(ROOMS_QUERY);
  const [createRoom] = useMutation(CREATE_ROOM_MUTATION);
  const [joinRoom] = useMutation(JOIN_ROOM_MUTATION);
  const [reportPlatform] = useMutation(REPORT_PLATFORM_MUTATION);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const reportedPlatform = useRef(false);

  useEffect(() => {
    if (!meData?.me || reportedPlatform.current) return;
    reportedPlatform.current = true;
    const platform = detectPlatform();
    void reportPlatform({ variables: { input: { platform } } }).then(() => refetchMe());
  }, [meData?.me, reportPlatform, refetchMe]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await createRoom({
      variables: { input: { name: name.trim(), description: description.trim() || undefined } },
    });
    setName('');
    setDescription('');
    setCreating(false);
    await Promise.all([refetchMy(), refetchAll()]);
  }

  const myRoomIds = new Set((myRoomsData?.myRooms ?? []).map((r) => r.id));
  const browse = (roomsData?.rooms ?? []).filter((room) => !myRoomIds.has(room.id));
  const display = meData?.me?.displayName || meData?.me?.username || 'Guest';

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-discord-sidebar">
      <button
        type="button"
        className="flex h-12 items-center justify-between border-b border-black/20 px-4 text-left shadow-sm transition hover:bg-black/10"
      >
        <span className="truncate text-base font-semibold">LetsChat</span>
        <ChevronDownIcon size={16} className="text-muted-foreground" />
      </button>

      <ScrollArea className="flex-1 px-2 py-3">
        <div className="mb-1 flex items-center justify-between px-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Text Channels
          </p>
          <button
            type="button"
            aria-label="Create channel"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setCreating((v) => !v)}
          >
            <PlusIcon size={14} />
          </button>
        </div>

        <ul className="space-y-0.5">
          {(myRoomsData?.myRooms ?? []).map((room) => {
            const active = pathname === `/chat/${room.id}`;
            return (
              <li key={room.id}>
                <Link
                  href={`/chat/${room.id}`}
                  className={cn('channel-item', active && 'channel-item-active')}
                >
                  <Hash className="h-[18px] w-[18px] shrink-0 opacity-70" />
                  <span className="truncate">{room.name}</span>
                </Link>
              </li>
            );
          })}
          {(myRoomsData?.myRooms ?? []).length === 0 ? (
            <li className="px-2 py-2 text-xs text-muted-foreground">
              No channels yet — create one below.
            </li>
          ) : null}
        </ul>

        {browse.length > 0 ? (
          <>
            <div className="mb-1 mt-4 flex items-center gap-1 px-2">
              <SearchIcon size={12} className="text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Discover
              </p>
            </div>
            <ul className="space-y-1">
              {browse.map((room) => (
                <li
                  key={room.id}
                  className="flex items-center justify-between gap-2 rounded-[4px] px-2 py-1.5 hover:bg-discord-modifier"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">#{room.name}</p>
                    {room.description ? (
                      <p className="truncate text-xs text-muted-foreground">{room.description}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="blurple"
                    onClick={async () => {
                      await joinRoom({ variables: { roomId: room.id } });
                      await Promise.all([refetchMy(), refetchAll()]);
                    }}
                  >
                    Join
                  </Button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {creating ? (
          <form className="mt-4 space-y-2 rounded-md bg-discord-deepest/60 p-3" onSubmit={onCreate}>
            <div className="space-y-1">
              <Label htmlFor="room-name" className="text-xs uppercase text-muted-foreground">
                Channel name
              </Label>
              <Input
                id="room-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="new-room"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="room-description" className="text-xs uppercase text-muted-foreground">
                Topic
              </Label>
              <Input
                id="room-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this channel about?"
              />
            </div>
            <Button type="submit" className="w-full" variant="blurple">
              Create Channel
            </Button>
          </form>
        ) : null}
      </ScrollArea>

      <Separator className="bg-black/30" />
      <div className="flex items-center gap-2 bg-[#232428] px-2 py-1.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-white/5"
          onClick={() => setSettingsOpen(true)}
        >
          <UserAvatar
            name={display}
            avatarUrl={meData?.me?.avatarUrl}
            size="sm"
            online
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{display}</p>
            <p className="truncate text-xs text-muted-foreground">
              {platformLabel(meData?.me?.platform || detectPlatform())}
            </p>
          </div>
        </button>
        <SettingsMenuButton onOpen={() => setSettingsOpen(true)} />
        <SecuritySettings />
      </div>

      <UserSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </aside>
  );
}
