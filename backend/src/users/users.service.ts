import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User } from '../database/schema';
import { PublicUserType, UserType } from './user.type';
import { UpdateProfileInput } from './users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  toUserType(user: User): UserType {
    return {
      ...user,
      publicProfilePath: `/u/${user.username}`,
    };
  }

  toPublicUserType(user: User): PublicUserType {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      platform: user.platform,
      createdAt: user.createdAt,
      publicProfilePath: `/u/${user.username}`,
    };
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findByEmail(email);
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.usersRepository.findByUsername(username);
  }

  async findPublicByUsername(username: string): Promise<PublicUserType> {
    const user = await this.usersRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`User @${username} not found`);
    }
    return this.toPublicUserType(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async search(query: string, excludeUserId: number, limit = 20): Promise<User[]> {
    const trimmed = query.trim();
    if (trimmed.length < 1) return [];
    return this.usersRepository.search(trimmed, excludeUserId, limit);
  }

  async create(data: {
    email: string;
    username: string;
    passwordHash: string;
  }): Promise<User> {
    return this.usersRepository.create({
      email: data.email.toLowerCase(),
      username: data.username,
      passwordHash: data.passwordHash,
      totpEnabled: false,
    });
  }

  async updateProfile(userId: number, input: UpdateProfileInput): Promise<User> {
    const data: {
      displayName?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
    } = {};
    if (input.displayName !== undefined) data.displayName = input.displayName;
    if (input.bio !== undefined) data.bio = input.bio;
    if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;

    const user = await this.usersRepository.updateProfile(userId, data);
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return user;
  }

  async reportPlatform(userId: number, platform: string): Promise<User> {
    const user = await this.usersRepository.updateProfile(userId, {
      platform: platform.toLowerCase(),
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return user;
  }

  async setAvatarUrl(userId: number, avatarUrl: string): Promise<User> {
    const user = await this.usersRepository.updateProfile(userId, { avatarUrl });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return user;
  }

  async setTotpSecret(userId: number, totpSecret: string): Promise<User> {
    const user = await this.usersRepository.updateTotp(userId, { totpSecret, totpEnabled: false });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return user;
  }

  async enableTotp(userId: number): Promise<User> {
    const user = await this.usersRepository.updateTotp(userId, { totpEnabled: true });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return user;
  }

  async disableTotp(userId: number): Promise<User> {
    const user = await this.usersRepository.updateTotp(userId, {
      totpEnabled: false,
      totpSecret: null,
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return user;
  }
}
