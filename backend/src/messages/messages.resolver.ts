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
import { MessagesService, MESSAGE_ADDED } from './messages.service';
import { MessageType } from './message.type';
import { SendMessageInput } from './messages.dto';
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

  @Subscription(() => MessageType, {
    filter: (payload: { messageAdded: MessageType }, variables: { roomId: number }) =>
      payload.messageAdded.roomId === variables.roomId,
  })
  messageAdded(@Args('roomId', { type: () => Int }) _roomId: number) {
    return this.pubSub.asyncIterableIterator(MESSAGE_ADDED);
  }

  @ResolveField(() => UserType, { nullable: true })
  sender(@Parent() message: MessageType): Promise<UserType> {
    return this.usersService.findById(message.senderId);
  }
}
