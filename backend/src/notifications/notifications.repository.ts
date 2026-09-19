import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  notifications,
  NewNotification,
  Notification,
} from '../database/schema';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async createMany(data: NewNotification[]): Promise<Notification[]> {
    if (data.length === 0) {
      return [];
    }
    return this.databaseService.db.insert(notifications).values(data).returning();
  }

  async findForUser(userId: number, limit = 50): Promise<Notification[]> {
    return this.databaseService.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markAsRead(id: number, userId: number): Promise<Notification | undefined> {
    const [notification] = await this.databaseService.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return notification;
  }

  async markAllAsRead(userId: number): Promise<number> {
    const updated = await this.databaseService.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .returning();
    return updated.length;
  }

  async countUnread(userId: number): Promise<number> {
    const rows = await this.databaseService.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return rows.length;
  }
}
