import { apiClient } from './client';
import { extractPaginatedList, extractSingle, type PaginatedResult } from './bffParser';

// Notification types
export interface Notification {
  id: string;
  userId?: number;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  title: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  scheduledAt?: Date;
  sentAt?: Date;
  readAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationCampaign {
  id: string;
  name: string;
  description?: string;
  templateId: string;
  targetAudience: 'ALL_USERS' | 'ACTIVE_USERS' | 'CUSTOM';
  targetFilters?: Record<string, unknown>;
  scheduledAt?: Date;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  template?: NotificationTemplate;
}

export type NotificationListResponse = PaginatedResult<Notification>;
export type TemplateListResponse = PaginatedResult<NotificationTemplate>;
export type CampaignListResponse = PaginatedResult<NotificationCampaign>;

export interface NotificationFilters {
  type?: string;
  status?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface CreateNotificationDto {
  userId?: number;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  title: string;
  message: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  scheduledAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BulkNotificationDto {
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  title: string;
  message: string;
  userIds?: number[];
  targetAudience?: 'ALL_USERS' | 'ACTIVE_USERS' | 'CUSTOM';
  targetFilters?: Record<string, unknown>;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  scheduledAt?: string;
}

export interface CreateTemplateDto {
  name: string;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  subject?: string;
  content: string;
  variables?: string[];
  isActive?: boolean;
}

export interface UpdateTemplateDto {
  name?: string;
  subject?: string;
  content?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface CreateCampaignDto {
  name: string;
  description?: string;
  templateId: string;
  targetAudience: 'ALL_USERS' | 'ACTIVE_USERS' | 'CUSTOM';
  targetFilters?: Record<string, unknown>;
  scheduledAt?: string;
}

export interface NotificationStats {
  totalNotifications: number;
  sentNotifications: number;
  deliveredNotifications: number;
  failedNotifications: number;
  readNotifications: number;
  notificationsByType: Array<{
    type: string;
    count: number;
  }>;
  notificationsByStatus: Array<{
    status: string;
    count: number;
  }>;
  deliveryRate: number;
  readRate: number;
}

export interface UserPreferences {
  userId: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  bookingReminders: boolean;
  promotionalEmails: boolean;
  systemUpdates: boolean;
}

export const notificationApi = {
  // Notification management
  async getNotifications(filters: NotificationFilters = {}, page = 1, limit = 20): Promise<NotificationListResponse> {
    try {
      const params = {
        page,
        limit,
        ...filters
      };
      const response = await apiClient.get<unknown>('/admin/notifications', params);
      return extractPaginatedList<Notification>(response.data, 'notifications', { page, limit });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  },

  async getNotificationById(id: string): Promise<Notification> {
    try {
      const response = await apiClient.get<unknown>(`/admin/notifications/${id}`);
      const notification = extractSingle<Notification>(response.data);
      if (!notification) {
        throw new Error(`Notification ${id} not found`);
      }
      return notification;
    } catch (error) {
      console.error(`Failed to fetch notification ${id}:`, error);
      throw error;
    }
  },

  async createNotification(data: CreateNotificationDto): Promise<Notification> {
    try {
      const response = await apiClient.post<unknown>('/admin/notifications', data);
      const notification = extractSingle<Notification>(response.data);
      if (!notification) {
        throw new Error('Failed to create notification');
      }
      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  },

  async sendBulkNotification(data: BulkNotificationDto): Promise<{ success: boolean; jobId: string }> {
    try {
      const response = await apiClient.post<unknown>('/admin/notifications/send-bulk', data);
      const result = extractSingle<{ success: boolean; jobId: string }>(response.data);
      if (!result) {
        throw new Error('Failed to send bulk notification');
      }
      return result;
    } catch (error) {
      console.error('Failed to send bulk notification:', error);
      throw error;
    }
  },

  async getUserNotifications(userId: number, page = 1, limit = 20): Promise<NotificationListResponse> {
    try {
      const response = await apiClient.get<unknown>(`/admin/notifications/user/${userId}`, { page, limit });
      return extractPaginatedList<Notification>(response.data, 'notifications', { page, limit });
    } catch (error) {
      console.error(`Failed to fetch notifications for user ${userId}:`, error);
      throw error;
    }
  },

  async markAsRead(notificationId: string, userId: number): Promise<void> {
    try {
      await apiClient.post(`/admin/notifications/${notificationId}/mark-read/${userId}`);
    } catch (error) {
      console.error(`Failed to mark notification as read: ${notificationId}`, error);
      throw error;
    }
  },

  async markAllAsRead(userId: number): Promise<void> {
    try {
      await apiClient.post(`/admin/notifications/mark-all-read/${userId}`);
    } catch (error) {
      console.error(`Failed to mark all notifications as read for user: ${userId}`, error);
      throw error;
    }
  },

  // Template management
  async getTemplates(page = 1, limit = 20): Promise<TemplateListResponse> {
    try {
      const response = await apiClient.get<unknown>('/admin/notifications/templates/list', { page, limit });
      return extractPaginatedList<NotificationTemplate>(response.data, 'templates', { page, limit });
    } catch (error) {
      console.error('Failed to fetch notification templates:', error);
      throw error;
    }
  },

  async getTemplateById(id: string): Promise<NotificationTemplate> {
    try {
      const response = await apiClient.get<unknown>(`/admin/notifications/templates/${id}`);
      const template = extractSingle<NotificationTemplate>(response.data);
      if (!template) {
        throw new Error(`Template ${id} not found`);
      }
      return template;
    } catch (error) {
      console.error(`Failed to fetch template ${id}:`, error);
      throw error;
    }
  },

  async createTemplate(data: CreateTemplateDto): Promise<NotificationTemplate> {
    try {
      const response = await apiClient.post<unknown>('/admin/notifications/templates', data);
      const template = extractSingle<NotificationTemplate>(response.data);
      if (!template) {
        throw new Error('Failed to create notification template');
      }
      return template;
    } catch (error) {
      console.error('Failed to create notification template:', error);
      throw error;
    }
  },

  async updateTemplate(id: string, data: UpdateTemplateDto): Promise<NotificationTemplate> {
    try {
      const response = await apiClient.patch<unknown>(`/admin/notifications/templates/${id}`, data);
      const template = extractSingle<NotificationTemplate>(response.data);
      if (!template) {
        throw new Error(`Failed to update template ${id}`);
      }
      return template;
    } catch (error) {
      console.error(`Failed to update template ${id}:`, error);
      throw error;
    }
  },

  async deleteTemplate(id: string): Promise<void> {
    try {
      await apiClient.delete(`/admin/notifications/templates/${id}`);
    } catch (error) {
      console.error(`Failed to delete template ${id}:`, error);
      throw error;
    }
  },

  async testTemplate(id: string, testData: Record<string, unknown>): Promise<{ success: boolean; preview: string }> {
    try {
      const response = await apiClient.post<unknown>(`/admin/notifications/templates/${id}/test`, testData);
      const result = extractSingle<{ success: boolean; preview: string }>(response.data);
      if (!result) {
        throw new Error(`Failed to test template ${id}`);
      }
      return result;
    } catch (error) {
      console.error(`Failed to test template ${id}:`, error);
      throw error;
    }
  },

  // User preferences
  async getUserPreferences(userId: number): Promise<UserPreferences> {
    try {
      const response = await apiClient.get<unknown>(`/admin/notifications/preferences/${userId}`);
      const preferences = extractSingle<UserPreferences>(response.data);
      if (!preferences) {
        throw new Error(`Preferences not found for user ${userId}`);
      }
      return preferences;
    } catch (error) {
      console.error(`Failed to fetch preferences for user ${userId}:`, error);
      throw error;
    }
  },

  async updateUserPreferences(userId: number, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const response = await apiClient.patch<unknown>(`/admin/notifications/preferences/${userId}`, preferences);
      const updatedPreferences = extractSingle<UserPreferences>(response.data);
      if (!updatedPreferences) {
        throw new Error(`Failed to update preferences for user ${userId}`);
      }
      return updatedPreferences;
    } catch (error) {
      console.error(`Failed to update preferences for user ${userId}:`, error);
      throw error;
    }
  },

  // Statistics
  async getNotificationStats(dateRange: { startDate: string; endDate: string }): Promise<NotificationStats> {
    try {
      const response = await apiClient.get<unknown>('/admin/notifications/stats/overview', dateRange);
      const stats = extractSingle<NotificationStats>(response.data);
      if (!stats) {
        throw new Error('Failed to fetch notification statistics');
      }
      return stats;
    } catch (error) {
      console.error('Failed to fetch notification statistics:', error);
      throw error;
    }
  },

  async getDeliveryStats(dateRange: { startDate: string; endDate: string }): Promise<unknown> {
    try {
      const response = await apiClient.get<unknown>('/admin/notifications/stats/delivery', dateRange);
      return extractSingle(response.data);
    } catch (error) {
      console.error('Failed to fetch delivery statistics:', error);
      throw error;
    }
  },

  // Campaign management
  async getCampaigns(page = 1, limit = 20): Promise<CampaignListResponse> {
    try {
      const response = await apiClient.get<unknown>('/admin/notifications/campaigns/list', { page, limit });
      return extractPaginatedList<NotificationCampaign>(response.data, 'campaigns', { page, limit });
    } catch (error) {
      console.error('Failed to fetch notification campaigns:', error);
      throw error;
    }
  },

  async createCampaign(data: CreateCampaignDto): Promise<NotificationCampaign> {
    try {
      const response = await apiClient.post<unknown>('/admin/notifications/campaigns', data);
      const campaign = extractSingle<NotificationCampaign>(response.data);
      if (!campaign) {
        throw new Error('Failed to create notification campaign');
      }
      return campaign;
    } catch (error) {
      console.error('Failed to create notification campaign:', error);
      throw error;
    }
  }
} as const;
