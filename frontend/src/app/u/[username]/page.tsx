'use client';

import { useEffect, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import Link from 'next/link';
import { MonitorSmartphone, UserPlus, UserCheck, UserMinus } from 'lucide-react';
import { PUBLIC_PROFILE_QUERY, ME_QUERY, SEARCH_USERS_QUERY } from '@/lib/graphql/queries';
import {
  SEND_FRIEND_REQUEST,
  ACCEPT_FRIEND_REQUEST,
  REMOVE_FRIEND,
} from '@/lib/graphql/mutations';
import { UserAvatar } from '@/components/UserAvatar';
import { absoluteProfileUrl } from '@/lib/media';
import { platformLabel } from '@/lib/platform';
import { getToken } from '@/lib/apollo-client';
import { Button } from '@/components/ui/button';

type Props = {
  params: { username: string };
};

export default function PublicProfilePage({ params }: Props) {
  const username = decodeURIComponent(params.username);
  const [hasToken, setHasToken] = useState(false);
  const { data, loading, error } = useQuery(PUBLIC_PROFILE_QUERY, {
    variables: { username },
  });
  const { data: meData } = useQuery(ME_QUERY, { skip: !hasToken });
  const [searchUsers] = useLazyQuery(SEARCH_USERS_QUERY);
  const [sendFriendRequest] = useMutation(SEND_FRIEND_REQUEST);
  const [acceptFriendRequest] = useMutation(ACCEPT_FRIEND_REQUEST);
  const [removeFriend] = useMutation(REMOVE_FRIEND);
  const [friendshipStatus, setFriendshipStatus] = useState('guest');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(getToken()));
  }, []);

  useEffect(() => {
    if (!hasToken || !data?.publicProfile) return;
    if (meData?.me?.id === data.publicProfile.id) {
      setFriendshipStatus('self');
      return;
    }
    void searchUsers({ variables: { query: data.publicProfile.username } }).then((result) => {
      const hit = result.data?.searchUsers?.find(
        (u: { id: number }) => u.id === data.publicProfile.id,
      );
      setFriendshipStatus(hit?.friendshipStatus ?? 'none');
    });
  }, [hasToken, data?.publicProfile, meData?.me?.id, searchUsers]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-discord-deepest text-muted-foreground">
        Loading profile…
      </main>
    );
  }

  if (error || !data?.publicProfile) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-discord-deepest p-6 text-center">
        <h1 className="text-2xl font-bold text-white">Profile not found</h1>
        <p className="text-muted-foreground">@{username} doesn’t exist on LetsChat.</p>
        <Button asChild variant="blurple">
          <Link href="/">Back home</Link>
        </Button>
      </main>
    );
  }

  const profile = data.publicProfile;
  const display = profile.displayName || profile.username;
  const publicUrl = absoluteProfileUrl(profile.username);

  async function onFriendClick() {
    if (!hasToken || friendshipStatus === 'self' || friendshipStatus === 'guest') return;
    setBusy(true);
    try {
      if (friendshipStatus === 'none') {
        await sendFriendRequest({ variables: { input: { userId: profile.id } } });
        setFriendshipStatus('pending_outgoing');
      } else if (friendshipStatus === 'pending_incoming') {
        await acceptFriendRequest({ variables: { input: { userId: profile.id } } });
        setFriendshipStatus('friends');
      } else {
        await removeFriend({ variables: { input: { userId: profile.id } } });
        setFriendshipStatus('none');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-start justify-center overflow-y-auto bg-[#313338] p-4 py-8 sm:items-center sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, #5865F2 0%, transparent 40%), radial-gradient(circle at 80% 80%, #eb459e55 0%, transparent 35%)',
        }}
      />
      <article className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl bg-[#2b2d31] shadow-elev">
        <div className="h-24 bg-gradient-to-r from-[#5865F2] to-[#eb459e] sm:h-28" />
        <div className="relative px-4 pb-8 pt-0 sm:px-6">
          <div className="-mt-12 mb-4">
            <UserAvatar name={display} avatarUrl={profile.avatarUrl} size="xl" />
          </div>
          <h1 className="text-2xl font-bold text-white">{display}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>

          {profile.bio ? (
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-[#dbdee1]">
              {profile.bio}
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No bio yet.</p>
          )}

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#1e1f22] px-2.5 py-1">
              <MonitorSmartphone className="h-3.5 w-3.5" />
              {platformLabel(profile.platform)}
            </span>
            <span className="rounded-md bg-[#1e1f22] px-2.5 py-1">
              Joined{' '}
              {new Date(profile.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="mt-6 rounded-lg bg-[#1e1f22] p-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Public URL
            </p>
            <code className="break-all text-sm text-[#dbdee1]">{publicUrl}</code>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {friendshipStatus === 'none' ? (
              <Button variant="blurple" disabled={busy} className="gap-2" onClick={() => void onFriendClick()}>
                <UserPlus className="h-4 w-4" />
                Add friend
              </Button>
            ) : null}
            {friendshipStatus === 'pending_outgoing' ? (
              <Button variant="secondary" disabled={busy} className="gap-2" onClick={() => void onFriendClick()}>
                <UserMinus className="h-4 w-4" />
                Cancel request
              </Button>
            ) : null}
            {friendshipStatus === 'pending_incoming' ? (
              <Button variant="blurple" disabled={busy} className="gap-2" onClick={() => void onFriendClick()}>
                <UserPlus className="h-4 w-4" />
                Accept request
              </Button>
            ) : null}
            {friendshipStatus === 'friends' ? (
              <Button variant="secondary" disabled={busy} className="gap-2" onClick={() => void onFriendClick()}>
                <UserCheck className="h-4 w-4" />
                Friends · Remove
              </Button>
            ) : null}
            <Button asChild variant="ghost">
              <Link href="/">Open LetsChat</Link>
            </Button>
          </div>
        </div>
      </article>
    </main>
  );
}
