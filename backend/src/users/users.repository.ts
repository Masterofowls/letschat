import { Injectable } from '@nestjs/common';
import { and, eq, ilike, ne, or } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { users, NewUser, User } from '../database/schema';

@Injectable()
export class UsersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(data: NewUser): Promise<User> {
    const [user] = await this.databaseService.db.insert(users).values(data).returning();
    return user;
  }

  async findById(id: number): Promise<User | undefined> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return user;
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.databaseService.db.select().from(users);
  }

  async search(query: string, excludeUserId: number, limit = 20): Promise<User[]> {
    const q = `%${query.trim()}%`;
    return this.databaseService.db
      .select()
      .from(users)
      .where(
        and(
          ne(users.id, excludeUserId),
          or(ilike(users.username, q), ilike(users.displayName, q), ilike(users.email, q)),
        ),
      )
      .limit(limit);
  }

  async updateTotp(
    userId: number,
    data: { totpSecret?: string | null; totpEnabled?: boolean },
  ): Promise<User | undefined> {
    const [user] = await this.databaseService.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateProfile(
    userId: number,
    data: {
      displayName?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
      platform?: string | null;
    },
  ): Promise<User | undefined> {
    const [user] = await this.databaseService.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}
