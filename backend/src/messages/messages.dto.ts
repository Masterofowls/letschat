import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsString, MinLength, MaxLength } from 'class-validator';

@InputType()
export class SendMessageInput {
  @Field(() => Int)
  @IsInt()
  roomId!: number;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}
