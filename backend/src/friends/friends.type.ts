import { ObjectType, Field, Int, InputType } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';
import { PublicUserType } from '../users/user.type';

@ObjectType()
export class FriendshipType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  requesterId!: number;

  @Field(() => Int)
  addresseeId!: number;

  @Field()
  status!: string;

  @Field(() => PublicUserType, { nullable: true })
  requester?: PublicUserType;

  @Field(() => PublicUserType, { nullable: true })
  addressee?: PublicUserType;

  @Field(() => PublicUserType, { nullable: true })
  otherUser?: PublicUserType;

  @Field()
  createdAt!: Date;
}

@ObjectType()
export class UserSearchResultType {
  @Field(() => Int)
  id!: number;

  @Field()
  username!: string;

  @Field(() => String, { nullable: true })
  displayName?: string | null;

  @Field(() => String, { nullable: true })
  bio?: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

  @Field(() => String, { nullable: true })
  platform?: string | null;

  @Field()
  publicProfilePath!: string;

  /** none | pending_outgoing | pending_incoming | friends */
  @Field()
  friendshipStatus!: string;
}

@InputType()
export class FriendUserInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  userId!: number;
}
