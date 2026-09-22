import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressPeerServer } from 'peer';
import type { Express } from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { setupAdmin } from './admin/setup-admin';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  const expressApp = app.getHttpAdapter().getInstance() as Express;

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

  const port = Number(process.env.PORT) || 9000;
  await app.listen(port, '0.0.0.0');
  logger.log(`GraphQL API listening on http://0.0.0.0:${port}/graphql`);

  // PeerJS: listen first, then attach (peer README + Nest).
  // Mount path `/` + broker path `/peerjs` → client uses path `/peerjs`
  // so ID URL is /peerjs/peerjs/id (path + default key).
  const httpServer = app.getHttpServer();
  const peerServer = ExpressPeerServer(httpServer, {
    path: '/peerjs',
    proxied: true,
    allow_discovery: true,
    corsOptions: { origin: true, credentials: true },
  });
  expressApp.use(peerServer);
  logger.log('PeerJS broker ready (GET /peerjs/peerjs/id)');
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start NestJS application', error);
  process.exit(1);
});
