import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  Subscription,
} from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import {
  NotificationsService,
  NOTIFICATION_ADDED,
} from './notifications.service';
import { NotificationType } from './notification.type';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../database/schema';
import { PUB_SUB } from '../pubsub/pubsub.module';

@Resolver(() => NotificationType)
export class NotificationsResolver {
  constructor(
    private readonly notificationsService: NotificationsService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => [NotificationType])
  @UseGuards(JwtAuthGuard)
  notifications(@CurrentUser() user: User): Promise<NotificationType[]> {
    return this.notificationsService.findForUser(user.id);
  }

  @Query(() => Int)
  @UseGuards(JwtAuthGuard)
  unreadNotificationCount(@CurrentUser() user: User): Promise<number> {
    return this.notificationsService.unreadCount(user.id);
  }

  @Mutation(() => NotificationType)
  @UseGuards(JwtAuthGuard)
  markNotificationRead(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: User,
  ): Promise<NotificationType> {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Mutation(() => Int)
  @UseGuards(JwtAuthGuard)
  markAllNotificationsRead(@CurrentUser() user: User): Promise<number> {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Subscription(() => NotificationType, {
    filter: (
      payload: { notificationAdded: NotificationType },
      _variables: unknown,
      context: { req?: { user?: User } },
    ) => {
      const userId = context?.req?.user?.id;
      if (!userId) {
        return false;
      }
      return payload.notificationAdded.userId === userId;
    },
  })
  @UseGuards(JwtAuthGuard)
  notificationAdded(@CurrentUser() _user: User) {
    return this.pubSub.asyncIterableIterator(NOTIFICATION_ADDED);
  }
}
