import { apiClient } from './client';
import { unwrapResponse, type BffResponse } from './bffParser';

export interface NotificationSettings {
  booking: boolean;
  chat: boolean;
  friend: boolean;
  marketing: boolean;
}

export type UpdateNotificationSettings = Partial<NotificationSettings>;

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
};
