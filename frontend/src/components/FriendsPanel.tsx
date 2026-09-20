'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { MessageSquare, UserCheck, UserPlus } from 'lucide-react';
import { FRIENDS_QUERY, FRIEND_REQUESTS_QUERY } from '@/lib/graphql/queries';
import {
  ACCEPT_FRIEND_REQUEST,
  REMOVE_FRIEND,
  OPEN_DIRECT_MESSAGE,
} from '@/lib/graphql/mutations';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';

export function FriendsPanel() {
  const router = useRouter();
  const { data: friendsData, refetch: refetchFriends } = useQuery(FRIENDS_QUERY);
  const { data: requestsData, refetch: refetchRequests } = useQuery(FRIEND_REQUESTS_QUERY);
  const [acceptFriendRequest] = useMutation(ACCEPT_FRIEND_REQUEST);
  const [removeFriend] = useMutation(REMOVE_FRIEND);
  const [openDirectMessage, { loading: openingDm }] = useMutation(OPEN_DIRECT_MESSAGE);

  const friends = friendsData?.friends ?? [];
  const requests = requestsData?.friendRequests ?? [];

  async function messageFriend(userId: number) {
    const result = await openDirectMessage({ variables: { userId } });
    const roomId = result.data?.openDirectMessage?.id;
    if (roomId) router.push(`/chat/${roomId}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
      {requests.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Incoming requests
          </h2>
          <ul className="space-y-2">
            {requests.map(
              (req: {
                id: number;
                requester: {
                  id: number;
                  username: string;
                  displayName?: string | null;
                  avatarUrl?: string | null;
                };
              }) => {
                const display = req.requester.displayName || req.requester.username;
                return (
                  <li
                    key={req.id}
                    className="flex items-center gap-3 rounded-lg bg-[#2b2d31] px-3 py-2"
                  >
                    <Link
                      href={`/u/${req.requester.username}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <UserAvatar name={display} avatarUrl={req.requester.avatarUrl} size="md" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{display}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          @{req.requester.username}
                        </p>
                      </div>
                    </Link>
                    <Button
                      type="button"
                      size="sm"
                      variant="blurple"
                      className="gap-1"
                      onClick={async () => {
                        await acceptFriendRequest({
                          variables: { input: { userId: req.requester.id } },
                        });
                        await Promise.all([refetchFriends(), refetchRequests()]);
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Accept
                    </Button>
                  </li>
                );
              },
            )}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          All friends — {friends.length}
        </h2>
        {friends.length === 0 ? (
          <div className="rounded-lg bg-[#2b2d31] p-6 text-center">
            <p className="font-medium text-white">No friends yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the search bar to find people and send friend requests.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {friends.map(
              (f: {
                id: number;
                otherUser?: {
                  id: number;
                  username: string;
                  displayName?: string | null;
                  avatarUrl?: string | null;
                  publicProfilePath?: string;
                } | null;
              }) => {
                if (!f.otherUser) return null;
                const display = f.otherUser.displayName || f.otherUser.username;
                return (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#2b2d31]"
                  >
                    <Link
                      href={f.otherUser.publicProfilePath || `/u/${f.otherUser.username}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <UserAvatar
                        name={display}
                        avatarUrl={f.otherUser.avatarUrl}
                        size="md"
                        online
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{display}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          @{f.otherUser.username}
                        </p>
                      </div>
                    </Link>
                    <Button
                      type="button"
                      size="sm"
                      variant="blurple"
                      className="gap-1"
                      disabled={openingDm}
                      onClick={() => void messageFriend(f.otherUser!.id)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Message
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-muted-foreground"
                      onClick={async () => {
                        await removeFriend({
                          variables: { input: { userId: f.otherUser!.id } },
                        });
                        await refetchFriends();
                      }}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </li>
                );
              },
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
