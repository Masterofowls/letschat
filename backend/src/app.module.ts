import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { JwtModule } from '@nestjs/jwt';
import { join } from 'path';
import { DatabaseModule } from './database/database.module';
import { PubSubModule } from './pubsub/pubsub.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoomsModule } from './rooms/rooms.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FriendsModule } from './friends/friends.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        playground: configService.get('NODE_ENV') !== 'production',
        subscriptions: {
          'graphql-ws': {
            onConnect: (context: { connectionParams?: Record<string, unknown> }) => {
              const params = context.connectionParams ?? {};
              const authHeader =
                (params.Authorization as string | undefined) ||
                (params.authorization as string | undefined);
              return { authorization: authHeader };
            },
          },
        },
        context: ({
          req,
          connectionParams,
          extra,
        }: {
          req?: { headers?: Record<string, string> };
          connectionParams?: Record<string, unknown>;
          extra?: { request?: { headers?: Record<string, string> } };
        }) => {
          if (req) {
            return { req };
          }

          const authHeader =
            (connectionParams?.Authorization as string | undefined) ||
            (connectionParams?.authorization as string | undefined);

          return {
            req: {
              headers: {
                authorization: authHeader,
                ...(extra?.request?.headers ?? {}),
              },
            },
          };
        },
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is required');
        }
        return {
          secret,
          signOptions: { expiresIn: '7d' },
        };
      },
    }),
    DatabaseModule,
    PubSubModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    MessagesModule,
    NotificationsModule,
    FriendsModule,
  ],
})
export class AppModule {}
