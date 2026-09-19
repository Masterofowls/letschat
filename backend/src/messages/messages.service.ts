import { Inject, Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { MessagesRepository } from './messages.repository';
import { SendMessageInput } from './messages.dto';
import { RoomsService } from '../rooms/rooms.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PUB_SUB } from '../pubsub/pubsub.module';
import { Message } from '../database/schema';

export const MESSAGE_ADDED = 'messageAdded';

@Injectable()
export class MessagesService {
  constructor(
    private readonly messagesRepository: MessagesRepository,
    private readonly roomsService: RoomsService,
    private readonly notificationsService: NotificationsService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  async findByRoom(roomId: number, userId: number): Promise<Message[]> {
    await this.roomsService.assertMembership(roomId, userId);
    return this.messagesRepository.findByRoom(roomId);
  }

  async send(input: SendMessageInput, senderId: number): Promise<Message> {
    await this.roomsService.assertMembership(input.roomId, senderId);

    // Persistence first — history must survive crashes before publish
    const message = await this.messagesRepository.create({
      roomId: input.roomId,
      senderId,
      content: input.content.trim(),
    });

    await this.pubSub.publish(MESSAGE_ADDED, { messageAdded: message });

    const memberIds = await this.roomsService.getMemberIds(input.roomId);
    const recipients = memberIds.filter((id) => id !== senderId);
    if (recipients.length > 0) {
      const room = await this.roomsService.findById(input.roomId);
      await this.notificationsService.notifyNewMessage({
        recipientIds: recipients,
        roomId: input.roomId,
        messageId: message.id,
        roomName: room.name,
        preview: input.content.trim().slice(0, 120),
      });
    }

    return message;
  }
}
