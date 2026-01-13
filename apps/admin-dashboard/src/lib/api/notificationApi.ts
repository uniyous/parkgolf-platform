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
  // ===== Notification Management =====

  /**
   * 알림 목록 조회
   */
  async getNotifications(filters: NotificationFilters = {}, page = 1, limit = 20): Promise<NotificationListResponse> {
    const params = { page, limit, ...filters };
    const response = await apiClient.get<unknown>('/admin/notifications', params);
    return extractPaginatedList<Notification>(response.data, 'notifications', { page, limit });
  },

  /**
   * 알림 상세 조회
   */
  async getNotificationById(id: string): Promise<Notification> {
    const response = await apiClient.get<unknown>(`/admin/notifications/${id}`);
    const notification = extractSingle<Notification>(response.data);
    if (!notification) {
      throw new Error(`Notification ${id} not found`);
    }
    return notification;
  },

  /**
   * 알림 생성
   */
  async createNotification(data: CreateNotificationDto): Promise<Notification> {
    const response = await apiClient.post<unknown>('/admin/notifications', data);
    const notification = extractSingle<Notification>(response.data);
    if (!notification) {
      throw new Error('Failed to create notification');
    }
    return notification;
  },

  /**
   * 대량 알림 발송
   */
  async sendBulkNotification(data: BulkNotificationDto): Promise<{ success: boolean; jobId: string }> {
    const response = await apiClient.post<unknown>('/admin/notifications/send-bulk', data);
    const result = extractSingle<{ success: boolean; jobId: string }>(response.data);
    if (!result) {
      throw new Error('Failed to send bulk notification');
    }
    return result;
  },

  /**
   * 사용자별 알림 조회
   */
  async getUserNotifications(userId: number, page = 1, limit = 20): Promise<NotificationListResponse> {
    const response = await apiClient.get<unknown>(`/admin/notifications/user/${userId}`, { page, limit });
    return extractPaginatedList<Notification>(response.data, 'notifications', { page, limit });
  },

  /**
   * 알림 읽음 처리
   */
  async markAsRead(notificationId: string, userId: number): Promise<void> {
    await apiClient.post(`/admin/notifications/${notificationId}/mark-read/${userId}`);
  },

  /**
   * 모든 알림 읽음 처리
   */
  async markAllAsRead(userId: number): Promise<void> {
    await apiClient.post(`/admin/notifications/mark-all-read/${userId}`);
  },

  // ===== Template Management =====

  /**
   * 템플릿 목록 조회
   */
  async getTemplates(page = 1, limit = 20): Promise<TemplateListResponse> {
    const response = await apiClient.get<unknown>('/admin/notifications/templates/list', { page, limit });
    return extractPaginatedList<NotificationTemplate>(response.data, 'templates', { page, limit });
  },

  /**
   * 템플릿 상세 조회
   */
  async getTemplateById(id: string): Promise<NotificationTemplate> {
    const response = await apiClient.get<unknown>(`/admin/notifications/templates/${id}`);
    const template = extractSingle<NotificationTemplate>(response.data);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }
    return template;
  },

  /**
   * 템플릿 생성
   */
  async createTemplate(data: CreateTemplateDto): Promise<NotificationTemplate> {
    const response = await apiClient.post<unknown>('/admin/notifications/templates', data);
    const template = extractSingle<NotificationTemplate>(response.data);
    if (!template) {
      throw new Error('Failed to create notification template');
    }
    return template;
  },

  /**
   * 템플릿 수정
   */
  async updateTemplate(id: string, data: UpdateTemplateDto): Promise<NotificationTemplate> {
    const response = await apiClient.patch<unknown>(`/admin/notifications/templates/${id}`, data);
    const template = extractSingle<NotificationTemplate>(response.data);
    if (!template) {
      throw new Error(`Failed to update template ${id}`);
    }
    return template;
  },

  /**
   * 템플릿 삭제
   */
  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/admin/notifications/templates/${id}`);
  },

  /**
   * 템플릿 테스트
   */
  async testTemplate(id: string, testData: Record<string, unknown>): Promise<{ success: boolean; preview: string }> {
    const response = await apiClient.post<unknown>(`/admin/notifications/templates/${id}/test`, testData);
    const result = extractSingle<{ success: boolean; preview: string }>(response.data);
    if (!result) {
      throw new Error(`Failed to test template ${id}`);
    }
    return result;
  },

  // ===== User Preferences =====

  /**
   * 사용자 알림 설정 조회
   */
  async getUserPreferences(userId: number): Promise<UserPreferences> {
    const response = await apiClient.get<unknown>(`/admin/notifications/preferences/${userId}`);
    const preferences = extractSingle<UserPreferences>(response.data);
    if (!preferences) {
      throw new Error(`Preferences not found for user ${userId}`);
    }
    return preferences;
  },

  /**
   * 사용자 알림 설정 수정
   */
  async updateUserPreferences(userId: number, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const response = await apiClient.patch<unknown>(`/admin/notifications/preferences/${userId}`, preferences);
    const updatedPreferences = extractSingle<UserPreferences>(response.data);
    if (!updatedPreferences) {
      throw new Error(`Failed to update preferences for user ${userId}`);
    }
    return updatedPreferences;
  },

  // ===== Statistics =====

  /**
   * 알림 통계 조회
   */
  async getNotificationStats(dateRange: { startDate: string; endDate: string }): Promise<NotificationStats> {
    const response = await apiClient.get<unknown>('/admin/notifications/stats/overview', dateRange);
    const stats = extractSingle<NotificationStats>(response.data);
    if (!stats) {
      throw new Error('Failed to fetch notification statistics');
    }
    return stats;
  },

  /**
   * 발송 통계 조회
   */
  async getDeliveryStats(dateRange: { startDate: string; endDate: string }): Promise<unknown> {
    const response = await apiClient.get<unknown>('/admin/notifications/stats/delivery', dateRange);
    return extractSingle(response.data);
  },

  // ===== Campaign Management =====

  /**
   * 캠페인 목록 조회
   */
  async getCampaigns(page = 1, limit = 20): Promise<CampaignListResponse> {
    const response = await apiClient.get<unknown>('/admin/notifications/campaigns/list', { page, limit });
    return extractPaginatedList<NotificationCampaign>(response.data, 'campaigns', { page, limit });
  },

  /**
   * 캠페인 생성
   */
  async createCampaign(data: CreateCampaignDto): Promise<NotificationCampaign> {
    const response = await apiClient.post<unknown>('/admin/notifications/campaigns', data);
    const campaign = extractSingle<NotificationCampaign>(response.data);
    if (!campaign) {
      throw new Error('Failed to create notification campaign');
    }
    return campaign;
  },
} as const;
