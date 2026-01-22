import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface NotificationSettingsDto {
  booking: boolean;
  chat: boolean;
  friend: boolean;
  marketing: boolean;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==============================================
  // 알림 설정 조회
  // ==============================================
  async getNotificationSettings(userId: number): Promise<NotificationSettingsDto> {
    let settings = await this.prisma.userNotificationSetting.findUnique({
      where: { userId },
    });

    // 설정이 없으면 기본값으로 생성
    if (!settings) {
      settings = await this.prisma.userNotificationSetting.create({
        data: { userId },
      });
      this.logger.log(`Created default notification settings for user: ${userId}`);
    }

    return {
      booking: settings.booking,
      chat: settings.chat,
      friend: settings.friend,
      marketing: settings.marketing,
    };
  }

  // ==============================================
  // 알림 설정 변경
  // ==============================================
  async updateNotificationSettings(
    userId: number,
    data: Partial<NotificationSettingsDto>,
  ): Promise<NotificationSettingsDto> {
    const settings = await this.prisma.userNotificationSetting.upsert({
      where: { userId },
      create: {
        userId,
        booking: data.booking ?? true,
        chat: data.chat ?? true,
        friend: data.friend ?? true,
        marketing: data.marketing ?? false,
      },
      update: {
        ...(data.booking !== undefined && { booking: data.booking }),
        ...(data.chat !== undefined && { chat: data.chat }),
        ...(data.friend !== undefined && { friend: data.friend }),
        ...(data.marketing !== undefined && { marketing: data.marketing }),
      },
    });

    this.logger.log(`Updated notification settings for user: ${userId}`);

    return {
      booking: settings.booking,
      chat: settings.chat,
      friend: settings.friend,
      marketing: settings.marketing,
    };
  }
}
