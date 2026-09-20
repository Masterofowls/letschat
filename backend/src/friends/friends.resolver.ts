import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendshipType, FriendUserInput, UserSearchResultType } from './friends.type';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../database/schema';

@Resolver(() => FriendshipType)
export class FriendsResolver {
  constructor(private readonly friendsService: FriendsService) {}

  @Query(() => [UserSearchResultType])
  @UseGuards(JwtAuthGuard)
  searchUsers(
    @Args('query') query: string,
    @CurrentUser() user: User,
  ): Promise<UserSearchResultType[]> {
    return this.friendsService.searchUsers(user.id, query);
  }

  @Query(() => [FriendshipType])
  @UseGuards(JwtAuthGuard)
  friends(@CurrentUser() user: User): Promise<FriendshipType[]> {
    return this.friendsService.listFriends(user.id);
  }

  @Query(() => [FriendshipType])
  @UseGuards(JwtAuthGuard)
  friendRequests(@CurrentUser() user: User): Promise<FriendshipType[]> {
    return this.friendsService.listIncomingRequests(user.id);
  }

  @Mutation(() => FriendshipType)
  @UseGuards(JwtAuthGuard)
  sendFriendRequest(
    @Args('input') input: FriendUserInput,
    @CurrentUser() user: User,
  ): Promise<FriendshipType> {
    return this.friendsService.sendRequest(user.id, input.userId);
  }

  @Mutation(() => FriendshipType)
  @UseGuards(JwtAuthGuard)
  acceptFriendRequest(
    @Args('input') input: FriendUserInput,
    @CurrentUser() user: User,
  ): Promise<FriendshipType> {
    return this.friendsService.acceptRequest(user.id, input.userId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  removeFriend(
    @Args('input') input: FriendUserInput,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.friendsService.removeFriend(user.id, input.userId);
  }
}
