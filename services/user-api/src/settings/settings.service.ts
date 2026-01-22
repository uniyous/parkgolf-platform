import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { ApiResponse } from '../common/types';
import { NotificationSettingsDto, UpdateNotificationSettingsDto } from './dto/settings.dto';

/**
 * Settings Service for User API
 *
 * NATS Patterns:
 * - users.settings.notifications.get: 알림 설정 조회
 * - users.settings.notifications.update: 알림 설정 변경
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async getNotificationSettings(userId: number): Promise<ApiResponse<NotificationSettingsDto>> {
    this.logger.log(`Get notification settings: userId=${userId}`);
    return this.natsClient.send(
      'users.settings.notifications.get',
      { userId },
      NATS_TIMEOUTS.QUICK,
    );
  }

  async updateNotificationSettings(
    userId: number,
    settings: UpdateNotificationSettingsDto,
  ): Promise<ApiResponse<NotificationSettingsDto>> {
    this.logger.log(`Update notification settings: userId=${userId}`);
    return this.natsClient.send(
      'users.settings.notifications.update',
      { userId, settings },
      NATS_TIMEOUTS.QUICK,
    );
  }
}
