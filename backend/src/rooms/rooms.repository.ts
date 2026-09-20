import { Injectable } from '@nestjs/common';
import { and, eq, ilike, or } from 'drizzle-orm';
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

  async findByInviteCode(inviteCode: string): Promise<Room | undefined> {
    const [room] = await this.databaseService.db
      .select()
      .from(rooms)
      .where(eq(rooms.inviteCode, inviteCode))
      .limit(1);
    return room;
  }

  async findByDmKey(dmKey: string): Promise<Room | undefined> {
    const [room] = await this.databaseService.db
      .select()
      .from(rooms)
      .where(eq(rooms.dmKey, dmKey))
      .limit(1);
    return room;
  }

  async findAllPublic(): Promise<Room[]> {
    return this.databaseService.db.select().from(rooms).where(eq(rooms.isDm, false));
  }

  async findAll(): Promise<Room[]> {
    return this.databaseService.db.select().from(rooms);
  }

  async search(query: string, limit = 12): Promise<Room[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const q = `%${trimmed}%`;
    return this.databaseService.db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.isDm, false),
          or(ilike(rooms.name, q), ilike(rooms.description, q)),
        ),
      )
      .limit(limit);
  }

  async findForUser(userId: number, opts?: { dmsOnly?: boolean; channelsOnly?: boolean }): Promise<Room[]> {
    const rows = await this.databaseService.db
      .select({
        id: rooms.id,
        name: rooms.name,
        description: rooms.description,
        inviteCode: rooms.inviteCode,
        isDm: rooms.isDm,
        dmKey: rooms.dmKey,
        createdById: rooms.createdById,
        createdAt: rooms.createdAt,
        updatedAt: rooms.updatedAt,
      })
      .from(rooms)
      .innerJoin(roomMembers, eq(roomMembers.roomId, rooms.id))
      .where(eq(roomMembers.userId, userId));

    if (opts?.dmsOnly) return rows.filter((r) => r.isDm);
    if (opts?.channelsOnly) return rows.filter((r) => !r.isDm);
    return rows;
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
        displayName: users.displayName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        platform: users.platform,
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
