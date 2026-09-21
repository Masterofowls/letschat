import {
  Args,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { CallsService, CALL_SIGNAL, CALL_UPDATED } from './calls.service';
import { CallSignalType, CallType } from './call.type';
import {
  SendCallSignalInput,
  StartCallInput,
  UpdateCallMediaInput,
} from './calls.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../database/schema';
import { PUB_SUB } from '../pubsub/pubsub.module';

@Resolver(() => CallType)
export class CallsResolver {
  constructor(
    private readonly callsService: CallsService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => CallType, { nullable: true })
  @UseGuards(JwtAuthGuard)
  activeCall(
    @Args('roomId', { type: () => Int }) roomId: number,
    @CurrentUser() user: User,
  ): Promise<CallType | null> {
    return this.callsService.activeCallForRoom(roomId, user.id);
  }

  @Query(() => CallType)
  @UseGuards(JwtAuthGuard)
  call(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: User,
  ): Promise<CallType> {
    return this.callsService.getCall(id, user.id);
  }

  @Mutation(() => CallType)
  @UseGuards(JwtAuthGuard)
  startCall(
    @Args('input') input: StartCallInput,
    @CurrentUser() user: User,
  ): Promise<CallType> {
    return this.callsService.startCall(input, user.id);
  }

  @Mutation(() => CallType)
  @UseGuards(JwtAuthGuard)
  joinCall(
    @Args('callId', { type: () => Int }) callId: number,
    @CurrentUser() user: User,
  ): Promise<CallType> {
    return this.callsService.joinCall(callId, user.id);
  }

  @Mutation(() => CallType)
  @UseGuards(JwtAuthGuard)
  leaveCall(
    @Args('callId', { type: () => Int }) callId: number,
    @CurrentUser() user: User,
  ): Promise<CallType> {
    return this.callsService.leaveCall(callId, user.id);
  }

  @Mutation(() => CallType)
  @UseGuards(JwtAuthGuard)
  endCall(
    @Args('callId', { type: () => Int }) callId: number,
    @CurrentUser() user: User,
  ): Promise<CallType> {
    return this.callsService.endCall(callId, user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  sendCallSignal(
    @Args('input') input: SendCallSignalInput,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.callsService.sendSignal(input, user.id);
  }

  @Mutation(() => CallType)
  @UseGuards(JwtAuthGuard)
  updateCallMedia(
    @Args('input') input: UpdateCallMediaInput,
    @CurrentUser() user: User,
  ): Promise<CallType> {
    return this.callsService.updateMedia(input, user.id);
  }

  @Subscription(() => CallType, {
    filter: (
      payload: { callUpdated: CallType },
      _variables: unknown,
      context: { req?: { user?: User } },
    ) => {
      const userId = context?.req?.user?.id;
      if (!userId) return false;
      const call = payload.callUpdated;
      if (call.createdById === userId) return true;
      if (call.targetUserIds?.includes(userId)) return true;
      return Boolean(call.participants?.some((p) => p.userId === userId));
    },
  })
  @UseGuards(JwtAuthGuard)
  callUpdated(@CurrentUser() _user: User) {
    return this.pubSub.asyncIterableIterator(CALL_UPDATED);
  }

  @Subscription(() => CallSignalType, {
    filter: (
      payload: { callSignal: CallSignalType },
      variables: { callId: number },
      context: { req?: { user?: User } },
    ) => {
      const signal = payload.callSignal;
      if (signal.callId !== variables.callId) return false;
      const userId = context?.req?.user?.id;
      if (!userId) return false;
      if (signal.fromUserId === userId) return false;
      if (signal.toUserId != null && signal.toUserId !== userId) return false;
      return true;
    },
  })
  @UseGuards(JwtAuthGuard)
  callSignal(
    @Args('callId', { type: () => Int }) _callId: number,
    @CurrentUser() _user: User,
  ) {
    return this.pubSub.asyncIterableIterator(CALL_SIGNAL);
  }
}
