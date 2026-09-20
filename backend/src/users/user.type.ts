import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class PublicUserType {
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
  createdAt!: Date;

  @Field()
  publicProfilePath!: string;
}

@ObjectType()
export class UserType {
  @Field(() => Int)
  id!: number;

  @Field()
  email!: string;

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
  totpEnabled!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field()
  publicProfilePath!: string;
}
