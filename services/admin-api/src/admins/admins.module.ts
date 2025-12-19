import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { AdminsController } from './admins.controller';
import { AdminService } from './admins.service';
import { NATS_CLIENT_OPTIONS } from '../shared/nats';

/**
 * Admins Module
 */
@Module({
  imports: [ClientsModule.registerAsync(NATS_CLIENT_OPTIONS)],
  controllers: [AdminsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminsModule {}