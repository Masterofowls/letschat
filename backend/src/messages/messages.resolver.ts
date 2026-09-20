import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  Subscription,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { MessagesService, MESSAGE_ADDED, TYPING_UPDATED } from './messages.service';
import { MessageType } from './message.type';
import { SendMessageInput } from './messages.dto';
import { SetTypingInput, TypingEventType } from './typing.type';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../database/schema';
import { UserType } from '../users/user.type';
import { UsersService } from '../users/users.service';
import { PUB_SUB } from '../pubsub/pubsub.module';

@Resolver(() => MessageType)
export class MessagesResolver {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly usersService: UsersService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => [MessageType])
  @UseGuards(JwtAuthGuard)
  messages(
    @Args('roomId', { type: () => Int }) roomId: number,
    @CurrentUser() user: User,
  ): Promise<MessageType[]> {
    return this.messagesService.findByRoom(roomId, user.id);
  }

  @Mutation(() => MessageType)
  @UseGuards(JwtAuthGuard)
  sendMessage(
    @Args('input') input: SendMessageInput,
    @CurrentUser() user: User,
  ): Promise<MessageType> {
    return this.messagesService.send(input, user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  setTyping(
    @Args('input') input: SetTypingInput,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.messagesService.setTyping(input.roomId, user, input.isTyping);
  }

  @Subscription(() => MessageType, {
    filter: (payload: { messageAdded: MessageType }, variables: { roomId: number }) =>
      payload.messageAdded.roomId === variables.roomId,
  })
  messageAdded(@Args('roomId', { type: () => Int }) _roomId: number) {
    return this.pubSub.asyncIterableIterator(MESSAGE_ADDED);
  }

  @Subscription(() => TypingEventType, {
    filter: (
      payload: { typingUpdated: TypingEventType },
      variables: { roomId: number },
    ) => payload.typingUpdated.roomId === variables.roomId,
  })
  typingUpdated(@Args('roomId', { type: () => Int }) _roomId: number) {
    return this.pubSub.asyncIterableIterator(TYPING_UPDATED);
  }

  @ResolveField(() => UserType, { nullable: true })
  async sender(@Parent() message: MessageType): Promise<UserType> {
    const user = await this.usersService.findById(message.senderId);
    return this.usersService.toUserType(user);
  }

  @ResolveField(() => MessageType, { nullable: true })
  async replyTo(@Parent() message: MessageType): Promise<MessageType | null> {
    if (!message.replyToId) return null;
    return this.messagesService.getReplyTo(message as never);
  }
}
