import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationPreferencesDto } from '../dto/notification.dto';
import { NotificationSettings } from '@prisma/client';

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string): Promise<NotificationSettings> {
    let preferences = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });

    // Create default preferences if not found
    if (!preferences) {
      preferences = await this.prisma.notificationSettings.create({
        data: {
          userId,
          email: true,
          sms: false,
          push: true,
          marketing: false,
        },
      });
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    preferencesDto: NotificationPreferencesDto
  ): Promise<NotificationSettings> {
    this.logger.log(`Updating notification preferences for user: ${userId}`);

    return this.prisma.notificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...preferencesDto,
      },
      update: preferencesDto,
    });
  }

  async checkUserPreference(
    userId: string,
    channel: 'email' | 'sms' | 'push' | 'marketing'
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    return preferences[channel];
  }

  async getUsersWithPreference(
    channel: 'email' | 'sms' | 'push' | 'marketing',
    userIds?: string[]
  ): Promise<string[]> {
    const where: any = {
      [channel]: true,
    };

    if (userIds && userIds.length > 0) {
      where.userId = { in: userIds };
    }

    const settings = await this.prisma.notificationSettings.findMany({
      where,
      select: { userId: true },
    });

    return settings.map(setting => setting.userId);
  }
}