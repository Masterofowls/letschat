import { Resolver, Query, Mutation, Args, Int, ResolveField, Parent, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomType } from './room.type';
import { CreateRoomInput } from './rooms.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../database/schema';
import { PublicUserType, UserType } from '../users/user.type';
import { UsersService } from '../users/users.service';

@Resolver(() => RoomType)
export class RoomsResolver {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly usersService: UsersService,
  ) {}

  @Query(() => [RoomType])
  @UseGuards(JwtAuthGuard)
  async rooms(): Promise<RoomType[]> {
    const rows = await this.roomsService.findAll();
    return rows.map((r) => this.roomsService.toRoomType(r));
  }

  @Query(() => [RoomType])
  @UseGuards(JwtAuthGuard)
  async myRooms(@CurrentUser() user: User): Promise<RoomType[]> {
    const rows = await this.roomsService.findForUser(user.id);
    return rows.map((r) => this.roomsService.toRoomType(r));
  }

  @Query(() => [RoomType])
  @UseGuards(JwtAuthGuard)
  async myDirectMessages(@CurrentUser() user: User): Promise<RoomType[]> {
    const rows = await this.roomsService.findDirectMessages(user.id);
    return rows.map((r) => this.roomsService.toRoomType(r));
  }

  @Query(() => [RoomType])
  @UseGuards(JwtAuthGuard)
  async searchRooms(@Args('query') query: string): Promise<RoomType[]> {
    const rows = await this.roomsService.search(query);
    return rows.map((r) => this.roomsService.toRoomType(r));
  }

  @Query(() => RoomType)
  @UseGuards(JwtAuthGuard)
  async room(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: User,
  ): Promise<RoomType> {
    await this.roomsService.assertMembership(id, user.id);
    return this.roomsService.toRoomType(await this.roomsService.findById(id));
  }

  @Query(() => RoomType)
  @UseGuards(JwtAuthGuard)
  async roomByInvite(@Args('inviteCode') inviteCode: string): Promise<RoomType> {
    return this.roomsService.toRoomType(await this.roomsService.findByInviteCode(inviteCode));
  }

  @Mutation(() => RoomType)
  @UseGuards(JwtAuthGuard)
  async createRoom(
    @Args('input') input: CreateRoomInput,
    @CurrentUser() user: User,
  ): Promise<RoomType> {
    return this.roomsService.toRoomType(await this.roomsService.create(input, user.id));
  }

  @Mutation(() => RoomType)
  @UseGuards(JwtAuthGuard)
  async openDirectMessage(
    @Args('userId', { type: () => Int }) userId: number,
    @CurrentUser() user: User,
  ): Promise<RoomType> {
    return this.roomsService.toRoomType(
      await this.roomsService.openDirectMessage(user.id, userId),
    );
  }

  @Mutation(() => RoomType)
  @UseGuards(JwtAuthGuard)
  async joinRoom(
    @Args('roomId', { type: () => Int }) roomId: number,
    @CurrentUser() user: User,
  ): Promise<RoomType> {
    return this.roomsService.toRoomType(await this.roomsService.join(roomId, user.id));
  }

  @Mutation(() => RoomType)
  @UseGuards(JwtAuthGuard)
  async joinRoomByInvite(
    @Args('inviteCode') inviteCode: string,
    @CurrentUser() user: User,
  ): Promise<RoomType> {
    return this.roomsService.toRoomType(
      await this.roomsService.joinByInvite(inviteCode, user.id),
    );
  }

  @ResolveField(() => UserType, { nullable: true })
  async createdBy(@Parent() room: RoomType): Promise<UserType> {
    const user = await this.usersService.findById(room.createdById);
    return this.usersService.toUserType(user);
  }

  @ResolveField(() => [UserType])
  async members(@Parent() room: RoomType): Promise<UserType[]> {
    const members = await this.roomsService.getMembers(room.id);
    return members.map((u) => this.usersService.toUserType(u));
  }

  @ResolveField(() => PublicUserType, { nullable: true })
  async dmPeer(
    @Parent() room: RoomType,
    @Context() ctx: { req?: { user?: User } },
  ): Promise<PublicUserType | null> {
    const viewer = ctx.req?.user;
    if (!room.isDm || !viewer) return null;
    const full = await this.roomsService.findById(room.id);
    return this.roomsService.getDmPeer(full, viewer.id);
  }
}
