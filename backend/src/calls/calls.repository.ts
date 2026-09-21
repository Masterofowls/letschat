import { Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  callParticipants,
  calls,
  Call,
  CallParticipant,
  NewCall,
  NewCallParticipant,
} from '../database/schema';

@Injectable()
export class CallsRepository {
  constructor(private readonly database: DatabaseService) {}

  async createCall(data: NewCall): Promise<Call> {
    const [row] = await this.database.db.insert(calls).values(data).returning();
    return row;
  }

  async findById(id: number): Promise<Call | undefined> {
    const [row] = await this.database.db.select().from(calls).where(eq(calls.id, id)).limit(1);
    return row;
  }

  async findActiveByRoom(roomId: number): Promise<Call | undefined> {
    const [row] = await this.database.db
      .select()
      .from(calls)
      .where(and(eq(calls.roomId, roomId), eq(calls.status, 'ringing')))
      .orderBy(desc(calls.createdAt))
      .limit(1);
    if (row) return row;
    const [active] = await this.database.db
      .select()
      .from(calls)
      .where(and(eq(calls.roomId, roomId), eq(calls.status, 'active')))
      .orderBy(desc(calls.createdAt))
      .limit(1);
    return active;
  }

  async updateCall(
    id: number,
    patch: Partial<Pick<Call, 'status' | 'endedAt'>>,
  ): Promise<Call | undefined> {
    const [row] = await this.database.db
      .update(calls)
      .set(patch)
      .where(eq(calls.id, id))
      .returning();
    return row;
  }

  async addParticipant(data: NewCallParticipant): Promise<CallParticipant> {
    const inserted = await this.database.db
      .insert(callParticipants)
      .values(data)
      .onConflictDoNothing()
      .returning();
    if (inserted[0]) return inserted[0];
    const existing = await this.findParticipant(data.callId!, data.userId!);
    if (!existing) {
      throw new Error('Failed to add call participant');
    }
    return existing;
  }

  async listParticipants(callId: number, activeOnly = true): Promise<CallParticipant[]> {
    if (!activeOnly) {
      return this.database.db
        .select()
        .from(callParticipants)
        .where(eq(callParticipants.callId, callId));
    }
    return this.database.db
      .select()
      .from(callParticipants)
      .where(and(eq(callParticipants.callId, callId), isNull(callParticipants.leftAt)));
  }

  async findParticipant(
    callId: number,
    userId: number,
  ): Promise<CallParticipant | undefined> {
    const [row] = await this.database.db
      .select()
      .from(callParticipants)
      .where(and(eq(callParticipants.callId, callId), eq(callParticipants.userId, userId)))
      .limit(1);
    return row;
  }

  async markLeft(callId: number, userId: number): Promise<void> {
    await this.database.db
      .update(callParticipants)
      .set({ leftAt: new Date() })
      .where(
        and(
          eq(callParticipants.callId, callId),
          eq(callParticipants.userId, userId),
          isNull(callParticipants.leftAt),
        ),
      );
  }

  async reopenParticipant(
    callId: number,
    userId: number,
    defaults: { muted: boolean; cameraOff: boolean },
  ): Promise<CallParticipant> {
    const existing = await this.findParticipant(callId, userId);
    if (!existing) {
      return this.addParticipant({
        callId,
        userId,
        muted: defaults.muted,
        cameraOff: defaults.cameraOff,
      });
    }
    const [row] = await this.database.db
      .update(callParticipants)
      .set({
        leftAt: null,
        joinedAt: new Date(),
        muted: defaults.muted,
        cameraOff: defaults.cameraOff,
      })
      .where(and(eq(callParticipants.callId, callId), eq(callParticipants.userId, userId)))
      .returning();
    return row;
  }

  async updateMedia(
    callId: number,
    userId: number,
    patch: { muted?: boolean; cameraOff?: boolean },
  ): Promise<CallParticipant | undefined> {
    const [row] = await this.database.db
      .update(callParticipants)
      .set(patch)
      .where(and(eq(callParticipants.callId, callId), eq(callParticipants.userId, userId)))
      .returning();
    return row;
  }

  async countActive(callId: number): Promise<number> {
    const rows = await this.listParticipants(callId, true);
    return rows.length;
  }
}
