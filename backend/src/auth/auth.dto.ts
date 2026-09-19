import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

@InputType()
export class RegisterInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username may only contain letters, numbers, and underscores',
  })
  username!: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password needs upper, lower, and a number',
  })
  password!: string;
}

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  password!: string;
}

@InputType()
export class Verify2FAInput {
  @Field()
  @IsString()
  pendingToken!: string;

  @Field()
  @IsString()
  @MinLength(6)
  @MaxLength(8)
  code!: string;
}

@InputType()
export class ConfirmTotpInput {
  @Field()
  @IsString()
  @MinLength(6)
  @MaxLength(8)
  code!: string;
}

@InputType()
export class PasskeyResponseInput {
  @Field()
  @IsString()
  responseJson!: string;
}

@InputType()
export class ApproveQrLoginInput {
  @Field()
  @IsString()
  sessionId!: string;
}
