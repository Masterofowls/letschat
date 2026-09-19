import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  passkeyCredentials,
  qrLoginSessions,
  PasskeyCredential,
  QrLoginSession,
} from '../database/schema';

@Injectable()
export class AuthSecurityRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async listPasskeys(userId: number): Promise<PasskeyCredential[]> {
    return this.databaseService.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, userId));
  }

  async findPasskeyByCredentialId(credentialId: string): Promise<PasskeyCredential | undefined> {
    const [row] = await this.databaseService.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.credentialId, credentialId))
      .limit(1);
    return row;
  }

  async createPasskey(data: {
    userId: number;
    credentialId: string;
    publicKey: string;
    counter: number;
    transports?: string | null;
    deviceType?: string | null;
    backedUp?: boolean;
  }): Promise<PasskeyCredential> {
    const [row] = await this.databaseService.db
      .insert(passkeyCredentials)
      .values({
        userId: data.userId,
        credentialId: data.credentialId,
        publicKey: data.publicKey,
        counter: data.counter,
        transports: data.transports,
        deviceType: data.deviceType,
        backedUp: data.backedUp ?? false,
      })
      .returning();
    return row;
  }

  async updatePasskeyCounter(id: number, counter: number): Promise<void> {
    await this.databaseService.db
      .update(passkeyCredentials)
      .set({ counter })
      .where(eq(passkeyCredentials.id, id));
  }

  async createQrSession(data: {
    id: string;
    expiresAt: Date;
  }): Promise<QrLoginSession> {
    const [row] = await this.databaseService.db
      .insert(qrLoginSessions)
      .values({
        id: data.id,
        status: 'pending',
        expiresAt: data.expiresAt,
      })
      .returning();
    return row;
  }

  async findQrSession(id: string): Promise<QrLoginSession | undefined> {
    const [row] = await this.databaseService.db
      .select()
      .from(qrLoginSessions)
      .where(eq(qrLoginSessions.id, id))
      .limit(1);
    return row;
  }

  async approveQrSession(data: {
    id: string;
    userId: number;
    accessToken: string;
  }): Promise<QrLoginSession | undefined> {
    const [row] = await this.databaseService.db
      .update(qrLoginSessions)
      .set({
        status: 'approved',
        userId: data.userId,
        accessToken: data.accessToken,
      })
      .where(eq(qrLoginSessions.id, data.id))
      .returning();
    return row;
  }
}
