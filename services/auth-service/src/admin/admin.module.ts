import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminNatsController } from './admin-nats.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminNatsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}