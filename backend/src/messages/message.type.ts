import { ObjectType, Field, Int } from '@nestjs/graphql';
import { UserType } from '../users/user.type';

@ObjectType()
export class MessageType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  roomId!: number;

  @Field(() => Int)
  senderId!: number;

  @Field()
  content!: string;

  @Field(() => UserType, { nullable: true })
  sender?: UserType;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
