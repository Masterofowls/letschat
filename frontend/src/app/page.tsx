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
      <main className="flex h-screen items-center justify-center bg-discord-deepest text-muted-foreground">
        Loading…
      </main>
    );
  }

  if (!getToken() || error) {
    return (
      <main className="relative flex h-screen items-center justify-center overflow-hidden bg-[#313338]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #5865F2 0%, transparent 40%), radial-gradient(circle at 80% 80%, #eb459e55 0%, transparent 35%)',
          }}
        />
        <div className="relative z-10 grid w-full max-w-5xl gap-0 overflow-hidden rounded-lg bg-[#313338] shadow-elev md:grid-cols-[1.1fr_1fr]">
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
          <div className="flex h-full min-h-[660px] flex-col p-8 md:p-10">
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
      <main className="flex h-screen items-center justify-center bg-discord-deepest text-muted-foreground">
        Loading workspace…
      </main>
    );
  }

  return (
    <AppShell
      header={
        <header className="flex h-12 items-center justify-between gap-3 border-b border-black/20 px-4 shadow-sm">
          <div className="flex shrink-0 items-center gap-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <h1 className="font-semibold">Friends</h1>
            <span className="mx-2 hidden h-6 w-px bg-white/10 sm:block" />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Signed in as {data?.me?.username}
            </span>
          </div>
          <GlobalSearch />
          <div className="flex shrink-0 items-center gap-1">
            <NotificationBell />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => void logout()}
            >
              <LogoutIcon size={16} />
              Log Out
            </Button>
          </div>
        </header>
      }
    >
      <FriendsPanel />
    </AppShell>
  );
}
