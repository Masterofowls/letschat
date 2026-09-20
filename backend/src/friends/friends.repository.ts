import { Injectable } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { friendships, Friendship, NewFriendship, User, users } from '../database/schema';

@Injectable()
export class FriendsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findBetween(userA: number, userB: number): Promise<Friendship | undefined> {
    const [row] = await this.databaseService.db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, userA), eq(friendships.addresseeId, userB)),
          and(eq(friendships.requesterId, userB), eq(friendships.addresseeId, userA)),
        ),
      )
      .limit(1);
    return row;
  }

  async create(data: NewFriendship): Promise<Friendship> {
    const [row] = await this.databaseService.db.insert(friendships).values(data).returning();
    return row;
  }

  async updateStatus(id: number, status: string): Promise<Friendship | undefined> {
    const [row] = await this.databaseService.db
      .update(friendships)
      .set({ status, updatedAt: new Date() })
      .where(eq(friendships.id, id))
      .returning();
    return row;
  }

  async delete(id: number): Promise<void> {
    await this.databaseService.db.delete(friendships).where(eq(friendships.id, id));
  }

  async listForUser(userId: number, status?: string): Promise<Friendship[]> {
    const conditions = [
      or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
    ];
    if (status) {
      conditions.push(eq(friendships.status, status));
    }
    return this.databaseService.db
      .select()
      .from(friendships)
      .where(and(...conditions));
  }

  async findUserById(id: number): Promise<User | undefined> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }
}
