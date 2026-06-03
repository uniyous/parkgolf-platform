import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { userNotificationSettings } from '../db/schema';

export interface NotificationSettingsDto {
  booking: boolean;
  chat: boolean;
  friend: boolean;
  marketing: boolean;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  // ==============================================
  // 알림 설정 조회
  // ==============================================
  async getNotificationSettings(userId: number): Promise<NotificationSettingsDto> {
    let [settings] = await this.db
      .select()
      .from(userNotificationSettings)
      .where(eq(userNotificationSettings.userId, userId))
      .limit(1);

    // 설정이 없으면 기본값으로 생성
    if (!settings) {
      [settings] = await this.db
        .insert(userNotificationSettings)
        .values({ userId })
        .returning();
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
    const [settings] = await this.db
      .insert(userNotificationSettings)
      .values({
        userId,
        booking: data.booking ?? true,
        chat: data.chat ?? true,
        friend: data.friend ?? true,
        marketing: data.marketing ?? false,
      })
      .onConflictDoUpdate({
        target: userNotificationSettings.userId,
        set: {
          ...(data.booking !== undefined && { booking: data.booking }),
          ...(data.chat !== undefined && { chat: data.chat }),
          ...(data.friend !== undefined && { friend: data.friend }),
          ...(data.marketing !== undefined && { marketing: data.marketing }),
        },
      })
      .returning();

    this.logger.log(`Updated notification settings for user: ${userId}`);

    return {
      booking: settings.booking,
      chat: settings.chat,
      friend: settings.friend,
      marketing: settings.marketing,
    };
  }
}
