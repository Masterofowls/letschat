import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

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

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  replyToId?: number;
}
