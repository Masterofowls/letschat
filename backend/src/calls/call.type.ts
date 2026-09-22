import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { UserType } from '../users/user.type';

export enum CallMediaType {
  AUDIO = 'audio',
  VIDEO = 'video',
}

export enum CallStatus {
  RINGING = 'ringing',
  ACTIVE = 'active',
  ENDED = 'ended',
}

registerEnumType(CallMediaType, { name: 'CallMediaType' });
registerEnumType(CallStatus, { name: 'CallStatus' });

@ObjectType()
export class CallParticipantType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  callId!: number;

  @Field(() => Int)
  userId!: number;

  @Field(() => Date)
  joinedAt!: Date;

  @Field(() => Date, { nullable: true })
  leftAt?: Date | null;

  @Field()
  muted!: boolean;

  @Field()
  cameraOff!: boolean;

  @Field(() => UserType, { nullable: true })
  user?: UserType | null;
}

@ObjectType()
export class CallType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  roomId!: number;

  @Field(() => Int)
  createdById!: number;

  @Field(() => CallMediaType)
  mediaType!: CallMediaType;

  @Field(() => CallStatus)
  status!: CallStatus;

  @Field(() => Int)
  maxParticipants!: number;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date, { nullable: true })
  endedAt?: Date | null;

  @Field(() => [CallParticipantType], { nullable: true })
  participants?: CallParticipantType[];

  /** Users who should receive the ring (room members except starter). */
  @Field(() => [Int], { nullable: true })
  targetUserIds?: number[];

  /** GetStream call id (`letschat-{id}`) — media only; lifecycle stays in our DB. */
  @Field()
  streamCallId!: string;
}

@ObjectType()
export class StreamVideoAuthType {
  @Field()
  apiKey!: string;

  @Field()
  token!: string;

  @Field()
  userId!: string;

  @Field()
  callType!: string;
}

@ObjectType()
export class CallSignalType {
  @Field(() => Int)
  callId!: number;

  @Field(() => Int)
  fromUserId!: number;

  @Field(() => Int, { nullable: true })
  toUserId?: number | null;

  @Field()
  signalType!: string;

  @Field()
  payload!: string;
}
