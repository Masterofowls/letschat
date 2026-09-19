'use client';

import { ReactNode } from 'react';
import { ServerRail } from '@/components/ServerRail';
import { RoomSidebar } from '@/components/RoomSidebar';
import { cn } from '@/lib/utils';

type AppShellProps = {
  children: ReactNode;
  header?: ReactNode;
  showChannels?: boolean;
  className?: string;
};

export function AppShell({
  children,
  header,
  showChannels = true,
  className,
}: AppShellProps) {
  return (
    <div className="discord-shell">
      <ServerRail />
      {showChannels ? <RoomSidebar /> : null}
      <div className={cn('flex min-w-0 flex-1 flex-col bg-discord-main', className)}>
        {header}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
