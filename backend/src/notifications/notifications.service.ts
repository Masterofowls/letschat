import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { NotificationsRepository } from './notifications.repository';
import { PUB_SUB } from '../pubsub/pubsub.module';
import { Notification } from '../database/schema';

export const NOTIFICATION_ADDED = 'notificationAdded';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  async findForUser(userId: number): Promise<Notification[]> {
    return this.notificationsRepository.findForUser(userId);
  }

  async unreadCount(userId: number): Promise<number> {
    return this.notificationsRepository.countUnread(userId);
  }

  async markAsRead(id: number, userId: number): Promise<Notification> {
    const notification = await this.notificationsRepository.markAsRead(id, userId);
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return notification;
  }

  async markAllAsRead(userId: number): Promise<number> {
    return this.notificationsRepository.markAllAsRead(userId);
  }

  async notifyNewMessage(params: {
    recipientIds: number[];
    roomId: number;
    messageId: number;
    roomName: string;
    preview: string;
  }): Promise<void> {
    const created = await this.notificationsRepository.createMany(
      params.recipientIds.map((userId) => ({
        userId,
        type: 'NEW_MESSAGE',
        title: `New message in ${params.roomName}`,
        body: params.preview,
        roomId: params.roomId,
        messageId: params.messageId,
        isRead: false,
      })),
    );

    await Promise.all(
      created.map((notification) =>
        this.pubSub.publish(NOTIFICATION_ADDED, { notificationAdded: notification }),
      ),
    );
  }
}
