import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendsRepository } from './friends.repository';
import { UsersService } from '../users/users.service';
import { Friendship } from '../database/schema';
import { FriendshipType, UserSearchResultType } from './friends.type';

@Injectable()
export class FriendsService {
  constructor(
    private readonly friendsRepository: FriendsRepository,
    private readonly usersService: UsersService,
  ) {}

  async enrich(row: Friendship, viewerId: number): Promise<FriendshipType> {
    const otherId = row.requesterId === viewerId ? row.addresseeId : row.requesterId;
    const [requester, addressee, other] = await Promise.all([
      this.usersService.findById(row.requesterId),
      this.usersService.findById(row.addresseeId),
      this.usersService.findById(otherId),
    ]);
    return {
      id: row.id,
      requesterId: row.requesterId,
      addresseeId: row.addresseeId,
      status: row.status,
      createdAt: row.createdAt,
      requester: this.usersService.toPublicUserType(requester),
      addressee: this.usersService.toPublicUserType(addressee),
      otherUser: this.usersService.toPublicUserType(other),
    };
  }

  async friendshipStatus(viewerId: number, otherUserId: number): Promise<string> {
    if (viewerId === otherUserId) return 'self';
    const existing = await this.friendsRepository.findBetween(viewerId, otherUserId);
    if (!existing) return 'none';
    if (existing.status === 'accepted') return 'friends';
    if (existing.status === 'pending') {
      return existing.requesterId === viewerId ? 'pending_outgoing' : 'pending_incoming';
    }
    return 'none';
  }

  async searchUsers(viewerId: number, query: string): Promise<UserSearchResultType[]> {
    const users = await this.usersService.search(query, viewerId, 20);
    return Promise.all(
      users.map(async (user) => ({
        ...this.usersService.toPublicUserType(user),
        friendshipStatus: await this.friendshipStatus(viewerId, user.id),
      })),
    );
  }

  async sendRequest(viewerId: number, targetUserId: number): Promise<FriendshipType> {
    if (viewerId === targetUserId) {
      throw new BadRequestException('You cannot friend yourself');
    }
    await this.usersService.findById(targetUserId);
    const existing = await this.friendsRepository.findBetween(viewerId, targetUserId);
    if (existing) {
      if (existing.status === 'accepted') {
        throw new BadRequestException('Already friends');
      }
      if (existing.status === 'pending') {
        if (existing.addresseeId === viewerId) {
          return this.acceptRequest(viewerId, existing.requesterId);
        }
        throw new BadRequestException('Friend request already pending');
      }
    }
    const row = await this.friendsRepository.create({
      requesterId: viewerId,
      addresseeId: targetUserId,
      status: 'pending',
    });
    return this.enrich(row, viewerId);
  }

  async acceptRequest(viewerId: number, fromUserId: number): Promise<FriendshipType> {
    const existing = await this.friendsRepository.findBetween(viewerId, fromUserId);
    if (!existing || existing.status !== 'pending') {
      throw new NotFoundException('Friend request not found');
    }
    if (existing.addresseeId !== viewerId) {
      throw new ForbiddenException('Only the recipient can accept this request');
    }
    const updated = await this.friendsRepository.updateStatus(existing.id, 'accepted');
    return this.enrich(updated!, viewerId);
  }

  async removeFriend(viewerId: number, otherUserId: number): Promise<boolean> {
    const existing = await this.friendsRepository.findBetween(viewerId, otherUserId);
    if (!existing) return true;
    await this.friendsRepository.delete(existing.id);
    return true;
  }

  async listFriends(viewerId: number): Promise<FriendshipType[]> {
    const rows = await this.friendsRepository.listForUser(viewerId, 'accepted');
    return Promise.all(rows.map((row) => this.enrich(row, viewerId)));
  }

  async listIncomingRequests(viewerId: number): Promise<FriendshipType[]> {
    const rows = await this.friendsRepository.listForUser(viewerId, 'pending');
    const incoming = rows.filter((row) => row.addresseeId === viewerId);
    return Promise.all(incoming.map((row) => this.enrich(row, viewerId)));
  }
}
