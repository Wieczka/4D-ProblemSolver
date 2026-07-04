/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { execSync } from 'child_process';

async function bootstrap() {
  // Automatically execute database schema pushes on production startup
  if (process.env.NODE_ENV === 'production') {
    try {
      Logger.log('Executing automated Prisma schema push to database...');
      execSync('npx prisma db push --schema=prisma/schema.prisma --accept-data-loss', {
        stdio: 'inherit',
      });
      Logger.log('Automated database schema push completed successfully!');
    } catch (error: any) {
      Logger.error('Failed to push database schema on startup:', error.message);
    }
  }

  const app = await NestFactory.create(AppModule);
  
  // Enable CORS globally to permit cross-origin requests from our Angular frontend domain
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: false,
  });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
