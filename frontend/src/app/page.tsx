'use client';

import { useEffect, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Hash } from 'lucide-react';
import { LogoutIcon, MessageCircleMoreIcon } from 'lucide-animated';
import { AuthForm } from '@/components/AuthForm';
import { AppShell } from '@/components/AppShell';
import { NotificationBell } from '@/components/NotificationBell';
import { TypingText } from '@/components/TypingText';
import { GlobalSearch } from '@/components/GlobalSearch';
import { FriendsPanel } from '@/components/FriendsPanel';
import { MobileMenuButton } from '@/components/MobileMenuButton';
import { ME_QUERY } from '@/lib/graphql/queries';
import { getToken, setToken } from '@/lib/apollo-client';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const client = useApolloClient();
  const [ready, setReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const hasToken = typeof window !== 'undefined' && Boolean(getToken());
  const { data, loading, error, refetch } = useQuery(ME_QUERY, {
    skip: !ready || !hasToken,
  });

  useEffect(() => {
    setReady(true);
  }, []);

  async function logout() {
    setToken(null);
    await client.clearStore();
    window.location.reload();
  }

  const greeting =
    authMode === 'register'
      ? 'hello new guy on the block'
      : 'nice to hear from you again';

  if (!ready) {
    return (
      <main className="flex h-dvh items-center justify-center bg-discord-deepest text-muted-foreground">
        Loading…
      </main>
    );
  }

  if (!getToken() || error) {
    return (
      <main className="relative flex min-h-dvh items-stretch justify-center overflow-y-auto bg-[#313338] md:items-center md:overflow-hidden md:h-dvh">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #5865F2 0%, transparent 40%), radial-gradient(circle at 80% 80%, #eb459e55 0%, transparent 35%)',
          }}
        />
        <div className="relative z-10 my-0 grid w-full max-w-5xl gap-0 overflow-hidden bg-[#313338] shadow-elev md:my-6 md:rounded-lg md:grid-cols-[1.1fr_1fr]">
          <div className="hidden flex-col justify-between bg-[#2b2d31] p-10 md:flex">
            <div className="flex items-center gap-2 text-primary">
              <MessageCircleMoreIcon size={32} />
              <span className="text-2xl font-bold tracking-tight text-white">LetsChat</span>
            </div>
            <div>
              <TypingText
                as="h1"
                text="Your place to talk"
                className="min-h-[2.5em] text-4xl font-bold leading-tight text-white"
                speedMs={42}
              />
              <TypingText
                as="p"
                text="Hang out with friends in rooms, send messages live, and stay in the loop with notifications."
                className="mt-3 min-h-[4.5em] max-w-sm text-[#b5bac1]"
                speedMs={18}
                startDelayMs={900}
                showCursor={false}
              />
            </div>
            <p className="text-sm text-muted-foreground">Create an account or log in to continue.</p>
          </div>
          <div className="flex min-h-dvh flex-col p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-8 md:min-h-[660px] md:p-10">
            <div className="mb-6 shrink-0 md:hidden">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <MessageCircleMoreIcon size={28} />
                <span className="text-xl font-bold text-white">LetsChat</span>
              </div>
              <TypingText
                key={`mobile-${authMode}`}
                as="h1"
                text={greeting}
                className="min-h-[2.8em] text-2xl font-bold text-white"
                speedMs={45}
              />
            </div>
            <TypingText
              key={`desktop-${authMode}`}
              as="h2"
              text={greeting}
              className="mb-6 hidden min-h-[2.8em] shrink-0 text-2xl font-semibold text-white md:block"
              speedMs={45}
            />
            <AuthForm
              onModeChange={setAuthMode}
              onSuccess={async () => {
                await refetch();
                window.location.reload();
              }}
            />
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex h-dvh items-center justify-center bg-discord-deepest text-muted-foreground">
        Loading workspace…
      </main>
    );
  }

  return (
    <AppShell
      header={
        <header className="app-header justify-between">
          <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
            <MobileMenuButton />
            <Hash className="hidden h-5 w-5 text-muted-foreground sm:block" />
            <h1 className="truncate font-semibold">Friends</h1>
            <span className="mx-2 hidden h-6 w-px bg-white/10 lg:block" />
            <span className="hidden truncate text-sm text-muted-foreground lg:inline">
              Signed in as {data?.me?.username}
            </span>
          </div>
          <GlobalSearch className="mx-1 hidden min-w-0 flex-1 sm:block" />
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <GlobalSearch className="sm:hidden" compact />
            <NotificationBell />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => void logout()}
            >
              <LogoutIcon size={16} />
              <span className="hidden sm:inline">Log Out</span>
            </Button>
          </div>
        </header>
      }
    >
      <FriendsPanel />
    </AppShell>
  );
}
