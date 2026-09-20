import { ObjectType, Field, Int } from '@nestjs/graphql';
import { UserType, PublicUserType } from '../users/user.type';

@ObjectType()
export class RoomType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field()
  inviteCode!: string;

  @Field()
  publicRoomPath!: string;

  @Field()
  isDm!: boolean;

  @Field(() => String, { nullable: true })
  dmKey?: string | null;

  @Field(() => PublicUserType, { nullable: true })
  dmPeer?: PublicUserType | null;

  @Field(() => Int)
  createdById!: number;

  @Field(() => UserType, { nullable: true })
  createdBy?: UserType;

  @Field(() => [UserType], { nullable: true })
  members?: UserType[];

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
