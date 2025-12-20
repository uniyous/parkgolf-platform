import { Module } from '@nestjs/common';
import { AdminsController } from './admins.controller';
import { AdminService } from './admins.service';

/**
 * Admins Module
 * NatsClientService is provided globally by NatsModule
 */
@Module({
  controllers: [AdminsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminsModule {}
