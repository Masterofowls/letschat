import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { CallsRepository } from './calls.repository';
import { RoomsService } from '../rooms/rooms.service';
import { UsersService } from '../users/users.service';
import { PUB_SUB } from '../pubsub/pubsub.module';
import {
  CallMediaType,
  CallParticipantType,
  CallSignalType,
  CallStatus,
  CallType,
} from './call.type';
import {
  SendCallSignalInput,
  StartCallInput,
  UpdateCallMediaInput,
} from './calls.dto';
import { Call, CallParticipant } from '../database/schema';

export const CALL_UPDATED = 'callUpdated';
export const CALL_SIGNAL = 'callSignal';
export const MAX_CALL_PARTICIPANTS = 4;

@Injectable()
export class CallsService {
  constructor(
    private readonly callsRepository: CallsRepository,
    private readonly roomsService: RoomsService,
    private readonly usersService: UsersService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  async startCall(input: StartCallInput, userId: number): Promise<CallType> {
    await this.roomsService.assertMembership(input.roomId, userId);

    const existing = await this.callsRepository.findActiveByRoom(input.roomId);
    if (existing) {
      throw new BadRequestException('A call is already in progress in this room');
    }

    const room = await this.roomsService.findById(input.roomId);
    const memberIds = await this.roomsService.getMemberIds(input.roomId);
    const maxParticipants = room.isDm ? 2 : MAX_CALL_PARTICIPANTS;

    const call = await this.callsRepository.createCall({
      roomId: input.roomId,
      createdById: userId,
      mediaType: input.mediaType,
      status: 'ringing',
      maxParticipants,
    });

    await this.callsRepository.addParticipant({
      callId: call.id,
      userId,
      muted: false,
      cameraOff: input.mediaType === CallMediaType.AUDIO,
    });

    const targetUserIds = memberIds.filter((id) => id !== userId);
    const callType = await this.toCallType(call, targetUserIds);
    await this.pubSub.publish(CALL_UPDATED, { callUpdated: callType });
    return callType;
  }

  async joinCall(callId: number, userId: number): Promise<CallType> {
    const call = await this.requireCall(callId);
    if (call.status === 'ended') {
      throw new BadRequestException('Call has ended');
    }
    await this.roomsService.assertMembership(call.roomId, userId);

    const existing = await this.callsRepository.findParticipant(call.id, userId);
    const isActive = existing && !existing.leftAt;
    if (!isActive) {
      const activeCount = await this.callsRepository.countActive(call.id);
      if (activeCount >= call.maxParticipants) {
        throw new BadRequestException(
          `Call is full (max ${call.maxParticipants} participants)`,
        );
      }
      await this.callsRepository.reopenParticipant(call.id, userId, {
        muted: false,
        cameraOff: call.mediaType === 'audio',
      });
    }

    if (call.status === 'ringing') {
      await this.callsRepository.updateCall(call.id, { status: 'active' });
    }

    const refreshed = await this.requireCall(call.id);
    const callType = await this.toCallType(refreshed);
    await this.pubSub.publish(CALL_UPDATED, { callUpdated: callType });
    return callType;
  }

  async leaveCall(callId: number, userId: number): Promise<CallType> {
    const call = await this.requireCall(callId);
    await this.callsRepository.markLeft(call.id, userId);
    const remaining = await this.callsRepository.countActive(call.id);
    // 1:1 (or last-person-left): ending for one side ends the whole call.
    if (remaining <= 1 || call.maxParticipants <= 2) {
      await this.callsRepository.updateCall(call.id, {
        status: 'ended',
        endedAt: new Date(),
      });
      const stillActive = await this.callsRepository.listParticipants(call.id, true);
      for (const p of stillActive) {
        await this.callsRepository.markLeft(call.id, p.userId);
      }
    }
    const refreshed = await this.requireCall(call.id);
    const callType = await this.toCallType(refreshed);
    await this.pubSub.publish(CALL_UPDATED, { callUpdated: callType });
    return callType;
  }

  async endCall(callId: number, userId: number): Promise<CallType> {
    const call = await this.requireCall(callId);
    await this.roomsService.assertMembership(call.roomId, userId);
    await this.callsRepository.updateCall(call.id, {
      status: 'ended',
      endedAt: new Date(),
    });
    const participants = await this.callsRepository.listParticipants(call.id, true);
    for (const p of participants) {
      await this.callsRepository.markLeft(call.id, p.userId);
    }
    const refreshed = await this.requireCall(call.id);
    const callType = await this.toCallType(refreshed);
    await this.pubSub.publish(CALL_UPDATED, { callUpdated: callType });
    return callType;
  }

  async sendSignal(input: SendCallSignalInput, userId: number): Promise<boolean> {
    const call = await this.requireCall(input.callId);
    if (call.status === 'ended') {
      throw new BadRequestException('Call has ended');
    }
    const participant = await this.callsRepository.findParticipant(call.id, userId);
    if (!participant || participant.leftAt) {
      throw new ForbiddenException('Join the call before signaling');
    }
    if (input.toUserId) {
      const target = await this.callsRepository.findParticipant(call.id, input.toUserId);
      if (!target || target.leftAt) {
        throw new BadRequestException('Target user is not in the call');
      }
    }

    const signal: CallSignalType = {
      callId: call.id,
      fromUserId: userId,
      toUserId: input.toUserId ?? null,
      signalType: input.signalType,
      payload: input.payload,
    };
    await this.pubSub.publish(CALL_SIGNAL, { callSignal: signal });
    return true;
  }

  async updateMedia(input: UpdateCallMediaInput, userId: number): Promise<CallType> {
    const call = await this.requireCall(input.callId);
    const participant = await this.callsRepository.findParticipant(call.id, userId);
    if (!participant || participant.leftAt) {
      throw new ForbiddenException('Not in this call');
    }
    await this.callsRepository.updateMedia(call.id, userId, {
      ...(input.muted !== undefined ? { muted: input.muted } : {}),
      ...(input.cameraOff !== undefined ? { cameraOff: input.cameraOff } : {}),
    });
    const callType = await this.toCallType(call);
    await this.pubSub.publish(CALL_UPDATED, { callUpdated: callType });
    return callType;
  }

  async activeCallForRoom(roomId: number, userId: number): Promise<CallType | null> {
    await this.roomsService.assertMembership(roomId, userId);
    const call = await this.callsRepository.findActiveByRoom(roomId);
    if (!call) return null;
    return this.toCallType(call);
  }

  async getCall(callId: number, userId: number): Promise<CallType> {
    const call = await this.requireCall(callId);
    await this.roomsService.assertMembership(call.roomId, userId);
    return this.toCallType(call);
  }

  private async requireCall(callId: number): Promise<Call> {
    const call = await this.callsRepository.findById(callId);
    if (!call) throw new NotFoundException('Call not found');
    return call;
  }

  private async toCallType(call: Call, targetUserIds?: number[]): Promise<CallType> {
    const participants = await this.callsRepository.listParticipants(call.id, true);
    const participantTypes: CallParticipantType[] = [];
    for (const p of participants) {
      participantTypes.push(await this.toParticipantType(p));
    }

    let targets = targetUserIds;
    if (!targets && call.status === 'ringing') {
      const memberIds = await this.roomsService.getMemberIds(call.roomId);
      targets = memberIds.filter((id) => id !== call.createdById);
    }

    return {
      id: call.id,
      roomId: call.roomId,
      createdById: call.createdById,
      mediaType: call.mediaType as CallMediaType,
      status: call.status as CallStatus,
      maxParticipants: call.maxParticipants,
      createdAt: call.createdAt,
      endedAt: call.endedAt,
      participants: participantTypes,
      targetUserIds: targets,
    };
  }

  private async toParticipantType(p: CallParticipant): Promise<CallParticipantType> {
    const user = await this.usersService.findById(p.userId);
    return {
      id: p.id,
      callId: p.callId,
      userId: p.userId,
      joinedAt: p.joinedAt,
      leftAt: p.leftAt,
      muted: p.muted,
      cameraOff: p.cameraOff,
      user: user ? this.usersService.toUserType(user) : null,
    };
  }
}
