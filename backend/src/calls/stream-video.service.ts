import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamClient } from '@stream-io/node-sdk';

export type StreamVideoAuth = {
  apiKey: string;
  token: string;
  userId: string;
  callType: string;
};

/** Stable Stream call id derived from our DB call row. */
export function streamCallIdFor(callId: number): string {
  return `letschat-${callId}`;
}

/** Stream user ids are strings; map our numeric user id. */
export function streamUserIdFor(userId: number): string {
  return String(userId);
}

@Injectable()
export class StreamVideoService implements OnModuleInit {
  private readonly logger = new Logger(StreamVideoService.name);
  private client: StreamClient | null = null;
  private apiKey = '';
  private readonly callType = 'default';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.configService.get<string>('STREAM_API_KEY')?.trim() ?? '';
    const apiSecret = this.configService.get<string>('STREAM_API_SECRET')?.trim() ?? '';
    if (!apiKey || !apiSecret) {
      this.logger.warn(
        'STREAM_API_KEY / STREAM_API_SECRET missing — video token endpoint will fail until set',
      );
      return;
    }
    this.apiKey = apiKey;
    this.client = new StreamClient(apiKey, apiSecret);
    this.logger.log('GetStream Video client ready (calls media only)');
  }

  isConfigured(): boolean {
    return this.client != null && this.apiKey.length > 0;
  }

  createUserToken(userId: number, validitySeconds = 3600): StreamVideoAuth {
    if (!this.client || !this.apiKey) {
      throw new Error('GetStream is not configured on the server');
    }
    const streamUserId = streamUserIdFor(userId);
    const token = this.client.generateUserToken({
      user_id: streamUserId,
      validity_in_seconds: validitySeconds,
    });
    return {
      apiKey: this.apiKey,
      token,
      userId: streamUserId,
      callType: this.callType,
    };
  }
}
