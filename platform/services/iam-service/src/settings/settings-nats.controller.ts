import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SettingsService, NotificationSettingsDto } from './settings.service';
import { NatsResponse } from '../common/types/response.types';

@Controller()
export class SettingsNatsController {
  private readonly logger = new Logger(SettingsNatsController.name);

  constructor(private readonly settingsService: SettingsService) {}

  // ==============================================
  // 알림 설정 조회
  // ==============================================
  @MessagePattern('users.settings.notifications.get')
  async getNotificationSettings(@Payload() data: { userId: number }) {
    this.logger.debug(`Getting notification settings for user: ${data.userId}`);
    const settings = await this.settingsService.getNotificationSettings(data.userId);
    return NatsResponse.success(settings);
  }

  // ==============================================
  // 알림 설정 변경
  // ==============================================
  @MessagePattern('users.settings.notifications.update')
  async updateNotificationSettings(
    @Payload() data: { userId: number; settings: Partial<NotificationSettingsDto> },
  ) {
    this.logger.debug(`Updating notification settings for user: ${data.userId}`);
    const settings = await this.settingsService.updateNotificationSettings(
      data.userId,
      data.settings,
    );
    return NatsResponse.success(settings);
  }
}
