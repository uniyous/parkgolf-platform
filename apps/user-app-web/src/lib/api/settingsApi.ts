import { apiClient } from './client';
import { unwrapResponse, type BffResponse } from './bffParser';

export interface NotificationSettings {
  booking: boolean;
  chat: boolean;
  friend: boolean;
  marketing: boolean;
}

export type UpdateNotificationSettings = Partial<NotificationSettings>;

export interface AgentMemoryStatus {
  userId: number;
  enabled: boolean;
  hasMemory: boolean;
  summary: string | null;
  favoriteClubsCount?: number;
  frequentTeammatesCount?: number;
}

export const settingsApi = {
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    const response = await apiClient.get<BffResponse<NotificationSettings>>(
      '/api/user/settings/notifications',
    );
    return unwrapResponse(response.data);
  },

  updateNotificationSettings: async (settings: UpdateNotificationSettings): Promise<NotificationSettings> => {
    const response = await apiClient.put<BffResponse<NotificationSettings>>(
      '/api/user/settings/notifications',
      settings,
    );
    return unwrapResponse(response.data);
  },

  /** Phase 3 — AI 비서 메모리 상태 조회 */
  getAgentMemory: async (): Promise<AgentMemoryStatus> => {
    const response = await apiClient.get<BffResponse<AgentMemoryStatus>>(
      '/api/user/settings/agent-memory',
    );
    return unwrapResponse(response.data);
  },

  /** Phase 3 — AI 비서 메모리 ON/OFF 토글 (프라이버시) */
  setAgentMemoryEnabled: async (enabled: boolean): Promise<{ userId: number; enabled: boolean }> => {
    const response = await apiClient.put<BffResponse<{ userId: number; enabled: boolean }>>(
      '/api/user/settings/agent-memory',
      { enabled },
    );
    return unwrapResponse(response.data);
  },
};
