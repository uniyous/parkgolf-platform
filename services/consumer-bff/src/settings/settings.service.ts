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

  // ─── AI Agent Memory (Phase 3 — UNI-20 프라이버시 토글) ──────

  /**
   * AI 비서 메모리 상태 조회 (enabled / hasMemory / summary)
   * NATS: agent.memory.get
   */
  async getAgentMemory(userId: number): Promise<ApiResponse<{
    userId: number;
    enabled: boolean;
    hasMemory: boolean;
    summary: string | null;
    favoriteClubsCount?: number;
    frequentTeammatesCount?: number;
  }>> {
    this.logger.log(`Get agent memory: userId=${userId}`);
    return this.natsClient.send('agent.memory.get', { userId }, NATS_TIMEOUTS.QUICK);
  }

  /**
   * AI 비서 메모리 프라이버시 토글 (ON/OFF)
   * NATS: agent.memory.setEnabled
   */
  async setAgentMemoryEnabled(
    userId: number,
    enabled: boolean,
  ): Promise<ApiResponse<{ userId: number; enabled: boolean }>> {
    this.logger.log(`Set agent memory: userId=${userId} enabled=${enabled}`);
    return this.natsClient.send(
      'agent.memory.setEnabled',
      { userId, enabled },
      NATS_TIMEOUTS.QUICK,
    );
  }
}
