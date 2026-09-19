'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useSubscription } from '@apollo/client';
import { BellIcon, CheckCheckIcon } from 'lucide-animated';
import { NOTIFICATIONS_QUERY } from '@/lib/graphql/queries';
import {
  MARK_ALL_NOTIFICATIONS_READ,
  MARK_NOTIFICATION_READ,
} from '@/lib/graphql/mutations';
import { NOTIFICATION_ADDED_SUBSCRIPTION } from '@/lib/graphql/subscriptions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type Notification = {
  id: number;
  title: string;
  body?: string | null;
  roomId?: number | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const { data, refetch } = useQuery<{
    notifications: Notification[];
    unreadNotificationCount: number;
  }>(NOTIFICATIONS_QUERY);
  const [markRead] = useMutation(MARK_NOTIFICATION_READ);
  const [markAll] = useMutation(MARK_ALL_NOTIFICATIONS_READ);

  useSubscription(NOTIFICATION_ADDED_SUBSCRIPTION, {
    onData: () => {
      void refetch();
    },
  });

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const unread = data?.unreadNotificationCount ?? 0;
  const notifications = data?.notifications ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        >
          <BellIcon size={20} />
          {unread > 0 ? (
            <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center rounded-full bg-destructive px-1 text-[10px]">
              {unread}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 border-none bg-[#111214] p-0 shadow-elev">
        <div className="flex items-center justify-between px-1">
          <DropdownMenuLabel>Inbox</DropdownMenuLabel>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={async () => {
              await markAll();
              await refetch();
            }}
          >
            <CheckCheckIcon size={14} />
            Mark all read
          </Button>
        </div>
        <DropdownMenuSeparator className="bg-white/10" />
        <ScrollArea className="h-72">
          {notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  'mx-1 my-1 flex-col items-start rounded-md',
                  !notification.isRead && 'bg-primary/15',
                )}
                onSelect={async (event) => {
                  event.preventDefault();
                  if (!notification.isRead) {
                    await markRead({ variables: { id: notification.id } });
                    await refetch();
                  }
                }}
              >
                <span className="font-medium">{notification.title}</span>
                {notification.body ? (
                  <span className="text-xs text-muted-foreground">{notification.body}</span>
                ) : null}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
