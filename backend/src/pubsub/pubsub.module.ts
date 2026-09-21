import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub } from 'graphql-subscriptions';
import { PostgresPubSub } from 'graphql-pg-subscriptions';
import { Client } from 'pg';
import { createPgPoolConfig } from '../database/pg-pool-options';

export const PUB_SUB = 'PUB_SUB';

@Global()
@Module({
  providers: [
    {
      provide: PUB_SUB,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const usePgPubSub = configService.get<string>('USE_PG_PUBSUB') === 'true';

        if (usePgPubSub && databaseUrl) {
          // Multi-instance production: PostgreSQL LISTEN/NOTIFY
          const client = new Client(createPgPoolConfig(databaseUrl));
          await client.connect();
          return new PostgresPubSub({ client });
        }

        // In-memory PubSub is fine for single-instance local development.
        return new PubSub();
      },
    },
  ],
  exports: [PUB_SUB],
})
export class PubSubModule {}
