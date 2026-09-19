import { InputType, Field } from '@nestjs/graphql';
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

@InputType()
export class CreateRoomInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
