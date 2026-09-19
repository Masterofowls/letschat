import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User } from '../database/schema';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

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

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
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
