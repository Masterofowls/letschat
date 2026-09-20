import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

@InputType()
export class UpdateProfileInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string | null;
}

@InputType()
export class ReportPlatformInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(/^[a-z0-9_-]+$/i, { message: 'Invalid platform identifier' })
  platform!: string;
}
