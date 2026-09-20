import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RoomsRepository } from './rooms.repository';
import { CreateRoomInput } from './rooms.dto';
import { Room, User } from '../database/schema';
import { RoomType } from './room.type';
import { FriendsService } from '../friends/friends.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly friendsService: FriendsService,
    private readonly usersService: UsersService,
  ) {}

  toRoomType(room: Room): RoomType {
    return {
      ...room,
      isDm: Boolean(room.isDm),
      publicRoomPath: room.isDm ? `/chat/${room.id}` : `/r/${room.inviteCode}`,
    };
  }

  private generateInviteCode(): string {
    return randomBytes(6).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  }

  private dmKeyFor(userA: number, userB: number): string {
    const [low, high] = userA < userB ? [userA, userB] : [userB, userA];
    return `${low}:${high}`;
  }

  async create(input: CreateRoomInput, userId: number): Promise<Room> {
    const room = await this.roomsRepository.create({
      name: input.name,
      description: input.description,
      createdById: userId,
      inviteCode: this.generateInviteCode(),
      isDm: false,
      dmKey: null,
    });
    await this.roomsRepository.addMember(room.id, userId);
    return room;
  }

  async openDirectMessage(viewerId: number, friendUserId: number): Promise<Room> {
    if (viewerId === friendUserId) {
      throw new BadRequestException('Cannot message yourself');
    }
    const status = await this.friendsService.friendshipStatus(viewerId, friendUserId);
    if (status !== 'friends') {
      throw new ForbiddenException('You can only message accepted friends');
    }

    const dmKey = this.dmKeyFor(viewerId, friendUserId);
    const existing = await this.roomsRepository.findByDmKey(dmKey);
    if (existing) return existing;

    const [viewer, peer] = await Promise.all([
      this.usersService.findById(viewerId),
      this.usersService.findById(friendUserId),
    ]);

    const room = await this.roomsRepository.create({
      name: `${viewer.username} · ${peer.username}`,
      description: 'Direct message',
      createdById: viewerId,
      inviteCode: this.generateInviteCode(),
      isDm: true,
      dmKey,
    });
    await this.roomsRepository.addMember(room.id, viewerId);
    await this.roomsRepository.addMember(room.id, friendUserId);
    return room;
  }

  async findAll(): Promise<Room[]> {
    return this.roomsRepository.findAllPublic();
  }

  async findForUser(userId: number): Promise<Room[]> {
    return this.roomsRepository.findForUser(userId, { channelsOnly: true });
  }

  async findDirectMessages(userId: number): Promise<Room[]> {
    return this.roomsRepository.findForUser(userId, { dmsOnly: true });
  }

  async findById(id: number): Promise<Room> {
    const room = await this.roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundException(`Room ${id} not found`);
    }
    return room;
  }

  async findByInviteCode(inviteCode: string): Promise<Room> {
    const room = await this.roomsRepository.findByInviteCode(inviteCode);
    if (!room || room.isDm) {
      throw new NotFoundException('Invite link is invalid or expired');
    }
    return room;
  }

  async search(query: string, limit = 12): Promise<Room[]> {
    return this.roomsRepository.search(query, limit);
  }

  async join(roomId: number, userId: number): Promise<Room> {
    const room = await this.findById(roomId);
    if (room.isDm) {
      throw new ForbiddenException('Direct messages cannot be joined by invite');
    }
    await this.roomsRepository.addMember(roomId, userId);
    return room;
  }

  async joinByInvite(inviteCode: string, userId: number): Promise<Room> {
    const room = await this.findByInviteCode(inviteCode);
    await this.roomsRepository.addMember(room.id, userId);
    return room;
  }

  async assertMembership(roomId: number, userId: number): Promise<void> {
    const isMember = await this.roomsRepository.isMember(roomId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this room');
    }
  }

  async isMember(roomId: number, userId: number): Promise<boolean> {
    return this.roomsRepository.isMember(roomId, userId);
  }

  async getMembers(roomId: number): Promise<User[]> {
    return this.roomsRepository.getMembers(roomId);
  }

  async getMemberIds(roomId: number): Promise<number[]> {
    return this.roomsRepository.getMemberIds(roomId);
  }

  async getDmPeer(room: Room, viewerId: number) {
    if (!room.isDm) return null;
    const members = await this.getMembers(room.id);
    const peer = members.find((m) => m.id !== viewerId) ?? members[0];
    return peer ? this.usersService.toPublicUserType(peer) : null;
  }
}
