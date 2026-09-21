'use client';

import { ReactNode } from 'react';
import { ServerRail } from '@/components/ServerRail';
import { RoomSidebar } from '@/components/RoomSidebar';
import { MobileNavProvider, useMobileNav } from '@/components/MobileNavContext';
import { cn } from '@/lib/utils';

type AppShellProps = {
  children: ReactNode;
  header?: ReactNode;
  showChannels?: boolean;
  className?: string;
};

function AppShellInner({
  children,
  header,
  showChannels = true,
  className,
}: AppShellProps) {
  const { navOpen, closeNav } = useMobileNav();

  return (
    <div className="discord-shell">
      {/* Desktop rails */}
      <div className="hidden md:contents">
        <ServerRail />
        {showChannels ? <RoomSidebar /> : null}
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 md:hidden',
          navOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!navOpen}
      >
        <button
          type="button"
          className={cn(
            'absolute inset-0 bg-black/60 transition-opacity duration-200',
            navOpen ? 'opacity-100' : 'opacity-0',
          )}
          aria-label="Close navigation overlay"
          tabIndex={navOpen ? 0 : -1}
          onClick={closeNav}
        />
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Channels and servers"
          className={cn(
            'absolute inset-y-0 left-0 flex w-[min(100vw-3rem,20.5rem)] max-w-full',
            'safe-pb transform bg-discord-deepest shadow-2xl transition-transform duration-200 ease-out',
            navOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <ServerRail className="border-r border-black/20" />
          {showChannels ? <RoomSidebar className="min-w-0 flex-1" /> : null}
        </div>
      </div>

      <div className={cn('flex min-w-0 flex-1 flex-col bg-discord-main', className)}>
        {header}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <MobileNavProvider>
      <AppShellInner {...props} />
    </MobileNavProvider>
  );
}
