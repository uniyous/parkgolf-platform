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
  user?: { id: number; username: string; email: string };
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

export type NotificationListResponse = PaginatedResult<Notification>;
export type TemplateListResponse = PaginatedResult<NotificationTemplate>;

export interface NotificationFilters {
  type?: string;
  status?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
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

export interface NotificationStats {
  totalNotifications: number;
  sentNotifications: number;
  deliveredNotifications: number;
  failedNotifications: number;
  readNotifications: number;
  notificationsByType: Array<{ type: string; count: number }>;
  notificationsByStatus: Array<{ status: string; count: number }>;
  deliveryRate: number;
  readRate: number;
}

export const notificationApi = {
  // ===== Notification History =====
  async getNotifications(filters: NotificationFilters = {}, page = 1, limit = 20): Promise<NotificationListResponse> {
    const params = { page, limit, ...filters };
    const response = await apiClient.get<unknown>('/admin/notifications', params);
    return extractPaginatedList<Notification>(response.data, 'notifications', { page, limit });
  },

  async getNotificationById(id: string): Promise<Notification> {
    const response = await apiClient.get<unknown>(`/admin/notifications/${id}`);
    const notification = extractSingle<Notification>(response.data);
    if (!notification) throw new Error(`Notification ${id} not found`);
    return notification;
  },

  // ===== Template Management =====
  async getTemplates(page = 1, limit = 20): Promise<TemplateListResponse> {
    const response = await apiClient.get<unknown>('/admin/notifications/templates/list', { page, limit });
    return extractPaginatedList<NotificationTemplate>(response.data, 'templates', { page, limit });
  },

  async getTemplateById(id: string): Promise<NotificationTemplate> {
    const response = await apiClient.get<unknown>(`/admin/notifications/templates/${id}`);
    const template = extractSingle<NotificationTemplate>(response.data);
    if (!template) throw new Error(`Template ${id} not found`);
    return template;
  },

  async createTemplate(data: CreateTemplateDto): Promise<NotificationTemplate> {
    const response = await apiClient.post<unknown>('/admin/notifications/templates', data);
    const template = extractSingle<NotificationTemplate>(response.data);
    if (!template) throw new Error('Failed to create notification template');
    return template;
  },

  async updateTemplate(id: string, data: UpdateTemplateDto): Promise<NotificationTemplate> {
    const response = await apiClient.patch<unknown>(`/admin/notifications/templates/${id}`, data);
    const template = extractSingle<NotificationTemplate>(response.data);
    if (!template) throw new Error(`Failed to update template ${id}`);
    return template;
  },

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/admin/notifications/templates/${id}`);
  },

  async testTemplate(id: string, testData: Record<string, unknown>): Promise<{ success: boolean; preview: string }> {
    const response = await apiClient.post<unknown>(`/admin/notifications/templates/${id}/test`, testData);
    const result = extractSingle<{ success: boolean; preview: string }>(response.data);
    if (!result) throw new Error(`Failed to test template ${id}`);
    return result;
  },

  // ===== Statistics =====
  async getNotificationStats(dateRange: { startDate: string; endDate: string }): Promise<NotificationStats> {
    const response = await apiClient.get<unknown>('/admin/notifications/stats/overview', dateRange);
    const stats = extractSingle<NotificationStats>(response.data);
    if (!stats) throw new Error('Failed to fetch notification statistics');
    return stats;
  },
} as const;
