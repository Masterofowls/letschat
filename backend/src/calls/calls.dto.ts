import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CallMediaType } from './call.type';

@InputType()
export class StartCallInput {
  @Field(() => Int)
  @IsInt()
  roomId!: number;

  @Field(() => CallMediaType)
  @IsEnum(CallMediaType)
  mediaType!: CallMediaType;
}

@InputType()
export class SendCallSignalInput {
  @Field(() => Int)
  @IsInt()
  callId!: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  toUserId?: number;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  signalType!: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  payload!: string;
}

@InputType()
export class UpdateCallMediaInput {
  @Field(() => Int)
  @IsInt()
  callId!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  muted?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  cameraOff?: boolean;
}
