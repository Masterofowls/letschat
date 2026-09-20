import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { PublicUserType, UserType } from './user.type';
import { UpdateProfileInput, ReportPlatformInput } from './users.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../database/schema';

@Resolver(() => UserType)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => UserType)
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User): UserType {
    return this.usersService.toUserType(user);
  }

  @Query(() => [UserType])
  @UseGuards(JwtAuthGuard)
  async users(): Promise<UserType[]> {
    const rows = await this.usersService.findAll();
    return rows.map((u) => this.usersService.toUserType(u));
  }

  @Query(() => UserType)
  @UseGuards(JwtAuthGuard)
  async user(@Args('id', { type: () => Int }) id: number): Promise<UserType> {
    const user = await this.usersService.findById(id);
    return this.usersService.toUserType(user);
  }

  @Query(() => PublicUserType)
  publicProfile(
    @Args('username') username: string,
  ): Promise<PublicUserType> {
    return this.usersService.findPublicByUsername(username);
  }

  @Mutation(() => UserType)
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Args('input') input: UpdateProfileInput,
    @CurrentUser() user: User,
  ): Promise<UserType> {
    const updated = await this.usersService.updateProfile(user.id, input);
    return this.usersService.toUserType(updated);
  }

  @Mutation(() => UserType)
  @UseGuards(JwtAuthGuard)
  async reportPlatform(
    @Args('input') input: ReportPlatformInput,
    @CurrentUser() user: User,
  ): Promise<UserType> {
    const updated = await this.usersService.reportPlatform(user.id, input.platform);
    return this.usersService.toUserType(updated);
  }
}
