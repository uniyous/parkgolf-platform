import { Injectable, Logger } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { notificationSettings, type NotificationSettings } from '../../db/schema';
import { NotificationPreferencesDto } from '../dto/notification.dto';

type PreferenceChannel = 'email' | 'sms' | 'push' | 'marketing';

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async getPreferences(userId: string): Promise<NotificationSettings> {
    const [existing] = await this.db.select().from(notificationSettings).where(eq(notificationSettings.userId, userId)).limit(1);
    if (existing) return existing;

    const [created] = await this.db
      .insert(notificationSettings)
      .values({ userId, email: true, sms: false, push: true, marketing: false })
      .returning();
    return created;
  }

  async updatePreferences(userId: string, dto: NotificationPreferencesDto): Promise<NotificationSettings> {
    this.logger.log(`Updating notification preferences for user: ${userId}`);
    const [row] = await this.db
      .insert(notificationSettings)
      .values({ userId, ...dto })
      .onConflictDoUpdate({ target: notificationSettings.userId, set: { ...dto, updatedAt: new Date() } })
      .returning();
    return row;
  }

  async checkUserPreference(userId: string, channel: PreferenceChannel): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    return preferences[channel];
  }

  async getUsersWithPreference(channel: PreferenceChannel, userIds?: string[]): Promise<string[]> {
    const conds = [eq(notificationSettings[channel], true)];
    if (userIds && userIds.length > 0) conds.push(inArray(notificationSettings.userId, userIds));
    const rows = await this.db.select({ userId: notificationSettings.userId }).from(notificationSettings).where(and(...conds));
    return rows.map((s) => s.userId);
  }
}
