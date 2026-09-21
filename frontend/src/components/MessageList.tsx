'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Hash, Reply, X } from 'lucide-react';
import { LoaderCircleIcon, SendIcon } from 'lucide-animated';
import { MESSAGES_QUERY } from '@/lib/graphql/queries';
import { SEND_MESSAGE_MUTATION, SET_TYPING_MUTATION } from '@/lib/graphql/mutations';
import {
  MESSAGE_ADDED_SUBSCRIPTION,
  TYPING_UPDATED_SUBSCRIPTION,
} from '@/lib/graphql/subscriptions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserAvatar } from '@/components/UserAvatar';
import { EmojiPicker } from '@/components/EmojiPicker';
import { cn } from '@/lib/utils';

type Message = {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  replyToId?: number | null;
  createdAt: string;
  replyTo?: {
    id: number;
    content: string;
    senderId: number;
    sender?: { id: number; username: string; displayName?: string | null } | null;
  } | null;
  sender?: {
    id: number;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
};

type TypingEvent = {
  roomId: number;
  userId: number;
  username: string;
  isTyping: boolean;
};

type Props = {
  roomId: number;
  currentUserId?: number;
  roomName?: string;
  isDm?: boolean;
};

export function MessageList({ roomId, currentUserId, roomName, isDm }: Props) {
  const client = useApolloClient();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [typers, setTypers] = useState<Record<number, string>>({});
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const { data, loading, error, subscribeToMore } = useQuery<{ messages: Message[] }>(
    MESSAGES_QUERY,
    { variables: { roomId } },
  );

  useEffect(() => {
    setTypers({});
    setReplyTo(null);
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
    const sub = client
      .subscribe<{ typingUpdated: TypingEvent }>({
        query: TYPING_UPDATED_SUBSCRIPTION,
        variables: { roomId },
      })
      .subscribe({
        next: ({ data: payload }) => {
          const event = payload?.typingUpdated;
          if (!event || event.userId === currentUserId) return;
          setTypers((prev) => {
            const next = { ...prev };
            if (event.isTyping) next[event.userId] = event.username;
            else delete next[event.userId];
            return next;
          });
        },
      });
    return () => sub.unsubscribe();
  }, [client, roomId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [data?.messages?.length, typers]);

  const typingLabel = useMemo(() => {
    const names = Object.values(typers);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing…`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
    return 'Several people are typing…';
  }, [typers]);

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
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="flex min-h-full flex-col justify-end pb-4" role="log" aria-live="polite">
          <div className="space-y-2 px-4 pb-4 pt-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-discord-modifier">
              <Hash className="h-10 w-10 text-foreground" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {isDm
                ? `Direct messages with ${roomName ?? 'friend'}`
                : `Welcome to #${roomName ?? `room-${roomId}`}!`}
            </h2>
            <p className="text-muted-foreground">
              {isDm
                ? 'This is the start of your private conversation.'
                : `This is the start of the #${roomName ?? `room-${roomId}`} channel.`}
            </p>
          </div>

          {messages.map((message, index) => {
            const prev = messages[index - 1];
            const sameAuthor = prev?.senderId === message.senderId && !message.replyTo;
            const closeInTime =
              prev &&
              Math.abs(
                new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime(),
              ) <
                5 * 60 * 1000;
            const compact = sameAuthor && closeInTime && !message.replyTo;
            const mine = message.senderId === currentUserId;
            const username = message.sender?.username ?? 'User';
            const display = message.sender?.displayName || username;
            const replyAuthor =
              message.replyTo?.sender?.displayName ||
              message.replyTo?.sender?.username ||
              'User';

            return (
              <article
                key={message.id}
                className={cn(
                  'message-row group animate-fade-up',
                  compact ? 'mt-0' : 'mt-4',
                )}
              >
                {compact ? (
                  <div className="w-10 shrink-0" />
                ) : (
                  <Link href={`/u/${username}`} className="shrink-0">
                    <UserAvatar name={display} avatarUrl={message.sender?.avatarUrl} size="md" />
                  </Link>
                )}
                <div className="min-w-0 flex-1">
                  {message.replyTo ? (
                    <button
                      type="button"
                      className="mb-1 flex max-w-full items-center gap-2 border-l-2 border-primary/70 pl-2 text-left text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        document
                          .getElementById(`message-${message.replyTo!.id}`)
                          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                    >
                      <Reply className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {replyAuthor}: {message.replyTo.content}
                      </span>
                    </button>
                  ) : null}
                  {!compact ? (
                    <header className="flex items-baseline gap-2">
                      <Link
                        href={`/u/${username}`}
                        className={cn(
                          'text-[1rem] font-medium hover:underline',
                          mine && 'text-primary',
                        )}
                      >
                        {display}
                      </Link>
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
                  <div className="flex items-start gap-2" id={`message-${message.id}`}>
                    <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#dbdee1]">
                      {message.content}
                    </p>
                    <button
                      type="button"
                      className="mt-0.5 inline-flex shrink-0 touch-manipulation rounded p-2 text-muted-foreground opacity-100 hover:bg-white/5 hover:text-foreground md:p-1 md:opacity-0 md:group-hover:opacity-100"
                      aria-label="Reply"
                      onClick={() => setReplyTo(message)}
                    >
                      <Reply className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="h-6 px-4 text-xs text-muted-foreground" aria-live="polite">
        {typingLabel}
      </div>
      <MessageInput
        roomId={roomId}
        roomName={roomName}
        isDm={isDm}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />
    </div>
  );
}

export function MessageInput({
  roomId,
  roomName,
  isDm,
  replyTo,
  onClearReply,
}: {
  roomId: number;
  roomName?: string;
  isDm?: boolean;
  replyTo?: Message | null;
  onClearReply?: () => void;
}) {
  const [sendMessage, { loading }] = useMutation(SEND_MESSAGE_MUTATION);
  const [setTyping] = useMutation(SET_TYPING_MUTATION);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  async function emitTyping(next: boolean) {
    if (isTyping.current === next) return;
    isTyping.current = next;
    try {
      await setTyping({ variables: { input: { roomId, isTyping: next } } });
    } catch {
      // ignore
    }
  }

  function onChange() {
    void emitTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      void emitTyping(false);
    }, 1500);
  }

  function insertEmoji(emoji: string) {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const next = `${input.value.slice(0, start)}${emoji}${input.value.slice(end)}`;
    input.value = next;
    const caret = start + emoji.length;
    input.setSelectionRange(caret, caret);
    input.focus();
    onChange();
  }

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      void emitTyping(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = inputRef.current?.value.trim() ?? '';
    if (!value) return;

    await emitTyping(false);
    await sendMessage({
      variables: {
        input: {
          roomId,
          content: value,
          replyToId: replyTo?.id,
        },
      },
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
    onClearReply?.();
  }

  const replyLabel =
    replyTo?.sender?.displayName || replyTo?.sender?.username || 'message';

  return (
    <form className="safe-pb px-3 pb-4 sm:px-4 sm:pb-6" onSubmit={onSubmit}>
      {replyTo ? (
        <div className="mb-2 flex items-center justify-between rounded-t-lg bg-[#2b2d31] px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">Replying to {replyLabel}</p>
            <p className="truncate text-muted-foreground">{replyTo.content}</p>
          </div>
          <button
            type="button"
            className="rounded p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            aria-label="Cancel reply"
            onClick={() => onClearReply?.()}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <div
        className={cn(
          'flex items-center gap-1 bg-[#383a40] px-2 py-1.5 sm:gap-2 sm:px-3',
          replyTo ? 'rounded-b-lg' : 'rounded-lg',
        )}
      >
        <EmojiPicker onPick={insertEmoji} />
        <label className="sr-only" htmlFor="message">
          Message
        </label>
        <Input
          id="message"
          ref={inputRef}
          name="message"
          placeholder={
            isDm
              ? `Message @${roomName ?? 'friend'}`
              : `Message #${roomName ?? roomId}`
          }
          autoComplete="off"
          disabled={loading}
          onChange={onChange}
          className="h-11 flex-1 rounded-none border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0 sm:h-10 sm:text-sm"
        />
        <Button
          type="submit"
          disabled={loading}
          size="icon"
          variant="ghost"
          className="h-11 w-11 touch-manipulation sm:h-9 sm:w-9"
          aria-label="Send"
        >
          <SendIcon size={18} />
        </Button>
      </div>
    </form>
  );
}
