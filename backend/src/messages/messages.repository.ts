import { Injectable } from '@nestjs/common';
import { asc, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { messages, NewMessage, Message } from '../database/schema';

@Injectable()
export class MessagesRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(data: NewMessage): Promise<Message> {
    const [message] = await this.databaseService.db
      .insert(messages)
      .values(data)
      .returning();
    return message;
  }

  async findByRoom(roomId: number, limit = 100): Promise<Message[]> {
    const rows = await this.databaseService.db
      .select()
      .from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return rows.reverse();
  }

  async findById(id: number): Promise<Message | undefined> {
    const [message] = await this.databaseService.db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);
    return message;
  }

  async findRecentByRoom(roomId: number): Promise<Message[]> {
    return this.databaseService.db
      .select()
      .from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(asc(messages.createdAt));
  }
}
