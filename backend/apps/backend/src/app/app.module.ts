import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
