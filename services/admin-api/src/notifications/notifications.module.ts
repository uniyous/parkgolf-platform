import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { NotificationsController } from './notifications.controller';
import { NotificationService } from './notifications.service';
import { NATS_CLIENT_OPTIONS } from '../shared/nats';

/**
 * Notifications Module
 */
@Module({
  imports: [ClientsModule.registerAsync(NATS_CLIENT_OPTIONS)],
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}