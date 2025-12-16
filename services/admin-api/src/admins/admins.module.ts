import { Module } from '@nestjs/common';
import { AdminsController } from './admins.controller';
import { AdminService } from './admins.service';

@Module({
  controllers: [AdminsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminsModule {}