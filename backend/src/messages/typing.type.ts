import { ObjectType, Field, Int, InputType } from '@nestjs/graphql';
import { IsBoolean, IsInt } from 'class-validator';

@ObjectType()
export class TypingEventType {
  @Field(() => Int)
  roomId!: number;

  @Field(() => Int)
  userId!: number;

  @Field()
  username!: string;

  @Field()
  isTyping!: boolean;
}

@InputType()
export class SetTypingInput {
  @Field(() => Int)
  @IsInt()
  roomId!: number;

  @Field()
  @IsBoolean()
  isTyping!: boolean;
}
