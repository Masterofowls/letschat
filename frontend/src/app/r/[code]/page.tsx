'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { Hash } from 'lucide-react';
import { ROOM_BY_INVITE_QUERY, ME_QUERY, MY_ROOMS_QUERY } from '@/lib/graphql/queries';
import { JOIN_ROOM_BY_INVITE_MUTATION } from '@/lib/graphql/mutations';
import { getToken } from '@/lib/apollo-client';
import { Button } from '@/components/ui/button';

export default function PublicRoomInvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const inviteCode = decodeURIComponent(params.code);
  const [ready, setReady] = useState(false);
  const hasToken = typeof window !== 'undefined' && Boolean(getToken());

  const { data: meData } = useQuery(ME_QUERY, { skip: !ready || !hasToken });
  const { data, loading, error } = useQuery(ROOM_BY_INVITE_QUERY, {
    variables: { inviteCode },
    skip: !ready || !hasToken,
  });
  const { data: myRoomsData, refetch: refetchMy } = useQuery(MY_ROOMS_QUERY, {
    skip: !ready || !hasToken,
  });
  const [joinByInvite, { loading: joining }] = useMutation(JOIN_ROOM_BY_INVITE_MUTATION);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-discord-deepest text-muted-foreground">
        Loading invite…
      </main>
    );
  }

  if (!getToken()) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-discord-deepest p-6 text-center">
        <h1 className="text-2xl font-bold text-white">Room invite</h1>
        <p className="max-w-sm text-muted-foreground">
          Sign in to join this room via public link <code className="text-primary">/r/{inviteCode}</code>.
        </p>
        <Button asChild variant="blurple">
          <Link href="/">Sign in</Link>
        </Button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-discord-deepest text-muted-foreground">
        Loading room…
      </main>
    );
  }

  if (error || !data?.roomByInvite) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-discord-deepest p-6 text-center">
        <h1 className="text-2xl font-bold text-white">Invite not found</h1>
        <p className="text-muted-foreground">This public room link is invalid.</p>
        <Button asChild variant="blurple">
          <Link href="/">Back home</Link>
        </Button>
      </main>
    );
  }

  const room = data.roomByInvite;
  const alreadyMember = (myRoomsData?.myRooms ?? []).some(
    (r: { id: number }) => r.id === room.id,
  );

  async function onJoin() {
    const result = await joinByInvite({ variables: { inviteCode } });
    await refetchMy();
    const id = result.data?.joinRoomByInvite?.id ?? room.id;
    router.push(`/chat/${id}`);
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-y-auto bg-[#313338] p-4 sm:overflow-hidden sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, #5865F2 0%, transparent 40%), radial-gradient(circle at 80% 80%, #eb459e55 0%, transparent 35%)',
        }}
      />
      <article className="relative z-10 w-full max-w-md rounded-xl bg-[#2b2d31] p-6 shadow-elev">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-discord-modifier">
          <Hash className="h-8 w-8 text-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-white">#{room.name}</h1>
        {room.description ? (
          <p className="mt-2 text-sm text-muted-foreground">{room.description}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">You&apos;re invited to this channel.</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Signed in as @{meData?.me?.username} · {room.members?.length ?? 0} members
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {alreadyMember ? (
            <Button variant="blurple" onClick={() => router.push(`/chat/${room.id}`)}>
              Open channel
            </Button>
          ) : (
            <Button variant="blurple" disabled={joining} onClick={() => void onJoin()}>
              {joining ? 'Joining…' : 'Join room'}
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link href="/">Cancel</Link>
          </Button>
        </div>
      </article>
    </main>
  );
}
