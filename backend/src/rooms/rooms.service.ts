import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoomsRepository } from './rooms.repository';
import { CreateRoomInput } from './rooms.dto';
import { Room, User } from '../database/schema';

@Injectable()
export class RoomsService {
  constructor(private readonly roomsRepository: RoomsRepository) {}

  async create(input: CreateRoomInput, userId: number): Promise<Room> {
    const room = await this.roomsRepository.create({
      name: input.name,
      description: input.description,
      createdById: userId,
    });
    await this.roomsRepository.addMember(room.id, userId);
    return room;
  }

  async findAll(): Promise<Room[]> {
    return this.roomsRepository.findAll();
  }

  async findForUser(userId: number): Promise<Room[]> {
    return this.roomsRepository.findForUser(userId);
  }

  async findById(id: number): Promise<Room> {
    const room = await this.roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundException(`Room ${id} not found`);
    }
    return room;
  }

  async join(roomId: number, userId: number): Promise<Room> {
    const room = await this.findById(roomId);
    await this.roomsRepository.addMember(roomId, userId);
    return room;
  }

  async assertMembership(roomId: number, userId: number): Promise<void> {
    const isMember = await this.roomsRepository.isMember(roomId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this room');
    }
  }

  async getMembers(roomId: number): Promise<User[]> {
    return this.roomsRepository.getMembers(roomId);
  }

  async getMemberIds(roomId: number): Promise<number[]> {
    return this.roomsRepository.getMemberIds(roomId);
  }
}
