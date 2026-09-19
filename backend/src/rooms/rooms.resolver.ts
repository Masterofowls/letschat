import { Resolver, Query, Mutation, Args, Int, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomType } from './room.type';
import { CreateRoomInput } from './rooms.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../database/schema';
import { UserType } from '../users/user.type';
import { UsersService } from '../users/users.service';

@Resolver(() => RoomType)
export class RoomsResolver {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly usersService: UsersService,
  ) {}

  @Query(() => [RoomType])
  @UseGuards(JwtAuthGuard)
  rooms(): Promise<RoomType[]> {
    return this.roomsService.findAll();
  }

  @Query(() => [RoomType])
  @UseGuards(JwtAuthGuard)
  myRooms(@CurrentUser() user: User): Promise<RoomType[]> {
    return this.roomsService.findForUser(user.id);
  }

  @Query(() => RoomType)
  @UseGuards(JwtAuthGuard)
  async room(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: User,
  ): Promise<RoomType> {
    await this.roomsService.assertMembership(id, user.id);
    return this.roomsService.findById(id);
  }

  @Mutation(() => RoomType)
  @UseGuards(JwtAuthGuard)
  createRoom(
    @Args('input') input: CreateRoomInput,
    @CurrentUser() user: User,
  ): Promise<RoomType> {
    return this.roomsService.create(input, user.id);
  }

  @Mutation(() => RoomType)
  @UseGuards(JwtAuthGuard)
  joinRoom(
    @Args('roomId', { type: () => Int }) roomId: number,
    @CurrentUser() user: User,
  ): Promise<RoomType> {
    return this.roomsService.join(roomId, user.id);
  }

  @ResolveField(() => UserType, { nullable: true })
  createdBy(@Parent() room: RoomType): Promise<UserType> {
    return this.usersService.findById(room.createdById);
  }

  @ResolveField(() => [UserType])
  members(@Parent() room: RoomType): Promise<UserType[]> {
    return this.roomsService.getMembers(room.id);
  }
}
