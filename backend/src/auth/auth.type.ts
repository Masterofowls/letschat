import { ObjectType, Field } from '@nestjs/graphql';
import { UserType } from '../users/user.type';

@ObjectType()
export class AuthPayload {
  @Field(() => String, { nullable: true })
  accessToken?: string | null;

  @Field(() => UserType, { nullable: true })
  user?: UserType | null;

  @Field()
  requires2FA!: boolean;

  @Field(() => String, { nullable: true })
  pendingToken?: string | null;
}

@ObjectType()
export class AvailabilityResult {
  @Field()
  available!: boolean;

  @Field(() => String, { nullable: true })
  message?: string | null;
}

@ObjectType()
export class TotpSetupPayload {
  @Field()
  secret!: string;

  @Field()
  otpauthUrl!: string;
}

@ObjectType()
export class WebAuthnOptionsPayload {
  @Field()
  optionsJson!: string;
}

@ObjectType()
export class QrLoginSessionPayload {
  @Field()
  sessionId!: string;

  @Field()
  expiresAt!: Date;

  @Field()
  status!: string;

  @Field(() => String, { nullable: true })
  accessToken?: string | null;

  @Field(() => UserType, { nullable: true })
  user?: UserType | null;
}
