import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { setupAdmin } from './admin/setup-admin';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

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

  await setupAdmin(app);

  // Render requires binding to 0.0.0.0 and process.env.PORT
  const port = Number(process.env.PORT) || 9000;
  await app.listen(port, '0.0.0.0');
  logger.log(`GraphQL API listening on http://0.0.0.0:${port}/graphql`);
  logger.log(`AdminJS panel listening on http://0.0.0.0:${port}/admin`);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start NestJS application', error);
  process.exit(1);
});
