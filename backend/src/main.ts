import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressPeerServer } from 'peer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { setupAdmin } from './admin/setup-admin';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  const uploadsRoot = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsRoot)) {
    mkdirSync(join(uploadsRoot, 'avatars'), { recursive: true });
  }
  app.useStaticAssets(uploadsRoot, { prefix: '/uploads' });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  try {
    await setupAdmin(app);
    logger.log(`AdminJS panel listening on http://0.0.0.0:${Number(process.env.PORT) || 9000}/admin`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`AdminJS skipped: ${message}`);
  }

  // PeerJS broker (Habr tutorial pattern: ExpressPeerServer + client Peer)
  await app.init();
  const httpServer = app.getHttpServer();
  const peerServer = ExpressPeerServer(httpServer, {
    path: '/',
    allow_discovery: true,
  });
  app.use('/peerjs', peerServer);
  logger.log('PeerJS broker mounted at /peerjs');

  // Render requires binding to 0.0.0.0 and process.env.PORT
  const port = Number(process.env.PORT) || 9000;
  await app.listen(port, '0.0.0.0');
  logger.log(`GraphQL API listening on http://0.0.0.0:${port}/graphql`);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start NestJS application', error);
  process.exit(1);
});
