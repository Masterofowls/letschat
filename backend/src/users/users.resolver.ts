import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserType } from './user.type';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../database/schema';

@Resolver(() => UserType)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => UserType)
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User): UserType {
    return user;
  }

  @Query(() => [UserType])
  @UseGuards(JwtAuthGuard)
  users(): Promise<UserType[]> {
    return this.usersService.findAll();
  }

  @Query(() => UserType)
  @UseGuards(JwtAuthGuard)
  user(@Args('id', { type: () => Int }) id: number): Promise<UserType> {
    return this.usersService.findById(id);
  }
}
