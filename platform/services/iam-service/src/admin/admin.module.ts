import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminNatsController } from './admin-nats.controller';

@Module({
  imports: [],
  controllers: [AdminNatsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}