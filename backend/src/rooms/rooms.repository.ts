import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  rooms,
  roomMembers,
  users,
  NewRoom,
  Room,
  User,
} from '../database/schema';

@Injectable()
export class RoomsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(data: NewRoom): Promise<Room> {
    const [room] = await this.databaseService.db.insert(rooms).values(data).returning();
    return room;
  }

  async addMember(roomId: number, userId: number): Promise<void> {
    await this.databaseService.db
      .insert(roomMembers)
      .values({ roomId, userId })
      .onConflictDoNothing({ target: [roomMembers.roomId, roomMembers.userId] });
  }

  async findById(id: number): Promise<Room | undefined> {
    const [room] = await this.databaseService.db
      .select()
      .from(rooms)
      .where(eq(rooms.id, id))
      .limit(1);
    return room;
  }

  async findAll(): Promise<Room[]> {
    return this.databaseService.db.select().from(rooms);
  }

  async findForUser(userId: number): Promise<Room[]> {
    return this.databaseService.db
      .select({
        id: rooms.id,
        name: rooms.name,
        description: rooms.description,
        createdById: rooms.createdById,
        createdAt: rooms.createdAt,
        updatedAt: rooms.updatedAt,
      })
      .from(rooms)
      .innerJoin(roomMembers, eq(roomMembers.roomId, rooms.id))
      .where(eq(roomMembers.userId, userId));
  }

  async isMember(roomId: number, userId: number): Promise<boolean> {
    const [member] = await this.databaseService.db
      .select()
      .from(roomMembers)
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)))
      .limit(1);
    return Boolean(member);
  }

  async getMembers(roomId: number): Promise<User[]> {
    return this.databaseService.db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        passwordHash: users.passwordHash,
        totpSecret: users.totpSecret,
        totpEnabled: users.totpEnabled,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .innerJoin(roomMembers, eq(roomMembers.userId, users.id))
      .where(eq(roomMembers.roomId, roomId));
  }

  async getMemberIds(roomId: number): Promise<number[]> {
    const rows = await this.databaseService.db
      .select({ userId: roomMembers.userId })
      .from(roomMembers)
      .where(eq(roomMembers.roomId, roomId));
    return rows.map((row) => row.userId);
  }
}
