import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class NotificationType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  userId!: number;

  @Field()
  type!: string;

  @Field()
  title!: string;

  @Field(() => String, { nullable: true })
  body?: string | null;

  @Field(() => Int, { nullable: true })
  roomId?: number | null;

  @Field(() => Int, { nullable: true })
  messageId?: number | null;

  @Field()
  isRead!: boolean;

  @Field()
  createdAt!: Date;
}
