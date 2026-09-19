'use client';

import { FormEvent, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Hash, Smile } from 'lucide-react';
import { LoaderCircleIcon, SendIcon } from 'lucide-animated';
import { MESSAGES_QUERY } from '@/lib/graphql/queries';
import { SEND_MESSAGE_MUTATION } from '@/lib/graphql/mutations';
import { MESSAGE_ADDED_SUBSCRIPTION } from '@/lib/graphql/subscriptions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';

type Message = {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  createdAt: string;
  sender?: { id: number; username: string } | null;
};

type Props = {
  roomId: number;
  currentUserId?: number;
  roomName?: string;
};

export function MessageList({ roomId, currentUserId, roomName }: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const { data, loading, error, subscribeToMore } = useQuery<{ messages: Message[] }>(
    MESSAGES_QUERY,
    { variables: { roomId } },
  );

  useEffect(() => {
    const unsubscribe = subscribeToMore<{ messageAdded: Message }>({
      document: MESSAGE_ADDED_SUBSCRIPTION,
      variables: { roomId },
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const incoming = subscriptionData.data.messageAdded;
        if (prev.messages.some((m) => m.id === incoming.id)) return prev;
        return { messages: [...prev.messages, incoming] };
      },
    });
    return () => unsubscribe();
  }, [roomId, subscribeToMore]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [data?.messages?.length]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
        <LoaderCircleIcon size={20} className="animate-spin" />
        Loading messages…
      </div>
    );
  }

  if (error) {
    return (
      <p className="p-4 text-sm text-destructive">Failed to load messages: {error.message}</p>
    );
  }

  const messages = data?.messages ?? [];

  return (
    <ScrollArea className="flex-1 scrollbar-thin">
      <div className="flex min-h-full flex-col justify-end pb-4" role="log" aria-live="polite">
        <div className="space-y-2 px-4 pb-4 pt-6">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-discord-modifier">
            <Hash className="h-10 w-10 text-foreground" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome to #{roomName ?? `room-${roomId}`}!
          </h2>
          <p className="text-muted-foreground">
            This is the start of the #{roomName ?? `room-${roomId}`} channel.
          </p>
        </div>

        {messages.map((message, index) => {
          const prev = messages[index - 1];
          const sameAuthor = prev?.senderId === message.senderId;
          const closeInTime =
            prev &&
            Math.abs(new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime()) <
              5 * 60 * 1000;
          const compact = sameAuthor && closeInTime;
          const mine = message.senderId === currentUserId;
          const username = message.sender?.username ?? 'User';

          return (
            <article
              key={message.id}
              className={cn('message-row animate-fade-up', compact ? 'mt-0' : 'mt-4')}
            >
              {compact ? (
                <div className="w-10 shrink-0" />
              ) : (
                <UserAvatar name={username} size="md" />
              )}
              <div className="min-w-0 flex-1">
                {!compact ? (
                  <header className="flex items-baseline gap-2">
                    <strong
                      className={cn(
                        'text-[1rem] font-medium hover:underline',
                        mine && 'text-primary',
                      )}
                    >
                      {username}
                    </strong>
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={message.createdAt}
                    >
                      {new Date(message.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </header>
                ) : null}
                <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#dbdee1]">
                  {message.content}
                </p>
              </div>
            </article>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

export function MessageInput({ roomId, roomName }: { roomId: number; roomName?: string }) {
  const [sendMessage, { loading }] = useMutation(SEND_MESSAGE_MUTATION);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = inputRef.current?.value.trim() ?? '';
    if (!value) return;

    await sendMessage({
      variables: { input: { roomId, content: value } },
      update: (cache, { data }) => {
        const created = data?.sendMessage;
        if (!created) return;
        const existing = cache.readQuery<{ messages: Message[] }>({
          query: MESSAGES_QUERY,
          variables: { roomId },
        });
        if (!existing || existing.messages.some((m) => m.id === created.id)) return;
        cache.writeQuery({
          query: MESSAGES_QUERY,
          variables: { roomId },
          data: { messages: [...existing.messages, created] },
        });
      },
    });

    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  }

  return (
    <form className="px-4 pb-6" onSubmit={onSubmit}>
      <div className="flex items-center gap-2 rounded-lg bg-[#383a40] px-3 py-1.5">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Add content"
          tabIndex={-1}
        >
          <Smile className="h-6 w-6" />
        </button>
        <label className="sr-only" htmlFor="message">
          Message
        </label>
        <Input
          id="message"
          ref={inputRef}
          name="message"
          placeholder={`Message #${roomName ?? roomId}`}
          autoComplete="off"
          disabled={loading}
          className="h-10 flex-1 rounded-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
        <Button type="submit" disabled={loading} size="icon" variant="ghost" aria-label="Send">
          <SendIcon size={18} />
        </Button>
      </div>
    </form>
  );
}
