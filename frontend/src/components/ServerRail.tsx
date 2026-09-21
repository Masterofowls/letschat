'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { HomeIcon, PlusIcon } from 'lucide-animated';
import { MY_ROOMS_QUERY } from '@/lib/graphql/queries';
import { cn } from '@/lib/utils';
import { hashColor, initials } from '@/components/UserAvatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Room = { id: number; name: string };

export function ServerRail({ className }: { className?: string }) {
  const pathname = usePathname();
  const { data } = useQuery<{ myRooms: Room[] }>(MY_ROOMS_QUERY);
  const homeActive = pathname === '/';

  return (
    <TooltipProvider delayDuration={120}>
      <nav
        className={cn(
          'flex w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-discord-deepest py-3 scrollbar-thin',
          'safe-pt',
          className,
        )}
        aria-label="Servers"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className={cn(
                'group relative flex h-12 w-12 items-center justify-center rounded-[1.5rem] bg-discord-main text-foreground transition-all duration-200 hover:rounded-2xl hover:bg-primary hover:text-white',
                homeActive && 'rounded-2xl bg-primary text-white',
              )}
              aria-label="Home"
            >
              <span
                className={cn(
                  'server-pill',
                  homeActive ? 'server-pill-active' : 'group-hover:server-pill-hover',
                )}
              />
              <HomeIcon size={22} />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Direct Messages</TooltipContent>
        </Tooltip>

        <div className="my-1 h-0.5 w-8 rounded-full bg-discord-modifier" />

        {(data?.myRooms ?? []).map((room) => {
          const active = pathname === `/chat/${room.id}`;
          return (
            <Tooltip key={room.id}>
              <TooltipTrigger asChild>
                <Link
                  href={`/chat/${room.id}`}
                  className={cn(
                    'group relative flex h-12 w-12 items-center justify-center rounded-[1.5rem] text-sm font-bold text-white transition-all duration-200 hover:rounded-2xl',
                    hashColor(room.name),
                    active && 'rounded-2xl',
                  )}
                  aria-label={room.name}
                >
                  <span
                    className={cn(
                      'server-pill',
                      active ? 'server-pill-active' : 'group-hover:server-pill-hover',
                    )}
                  />
                  {initials(room.name)}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{room.name}</TooltipContent>
            </Tooltip>
          );
        })}

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className="group relative mt-1 flex h-12 w-12 items-center justify-center rounded-[1.5rem] bg-discord-main text-discord-online transition-all duration-200 hover:rounded-2xl hover:bg-discord-online hover:text-white"
              aria-label="Add a room"
            >
              <PlusIcon size={22} />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Add a Room</TooltipContent>
        </Tooltip>
      </nav>
    </TooltipProvider>
  );
}
