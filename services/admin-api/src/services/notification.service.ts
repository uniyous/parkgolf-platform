import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly notifyServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.notifyServiceUrl = this.configService.get<string>('NOTIFY_SERVICE_URL') || 'http://localhost:3014';
  }

  // Notification Management
  async getNotifications(filters: any = {}, page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      const params = { page, limit, ...filters };

      const response = await firstValueFrom(
        this.httpService.get(`${this.notifyServiceUrl}/api/notifications`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          params
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch notifications', error);
      throw error;
    }
  }

  async getNotificationById(notificationId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.notifyServiceUrl}/api/notifications/${notificationId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch notification: ${notificationId}`, error);
      throw error;
    }
  }

  async createNotification(notificationData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.notifyServiceUrl}/api/notifications`, notificationData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create notification', error);
      throw error;
    }
  }

  async sendBulkNotification(bulkNotificationData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.notifyServiceUrl}/api/notifications/send`, bulkNotificationData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to send bulk notification', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.notifyServiceUrl}/api/notifications/user/${userId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          params: { page, limit }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch notifications for user: ${userId}`, error);
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.notifyServiceUrl}/api/notifications/${notificationId}/user/${userId}/mark-read`, {}, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to mark notification as read: ${notificationId}`, error);
      throw error;
    }
  }

  async markAllAsRead(userId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.notifyServiceUrl}/api/notifications/user/${userId}/mark-all-read`, {}, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to mark all notifications as read for user: ${userId}`, error);
      throw error;
    }
  }

  // Template Management
  async getTemplates(page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.notifyServiceUrl}/api/notifications/templates`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          params: { page, limit }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch notification templates', error);
      throw error;
    }
  }

  async getTemplateById(templateId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.notifyServiceUrl}/api/notifications/templates/${templateId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch template: ${templateId}`, error);
      throw error;
    }
  }

  async createTemplate(templateData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.notifyServiceUrl}/api/notifications/templates`, templateData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create notification template', error);
      throw error;
    }
  }

  async updateTemplate(templateId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.notifyServiceUrl}/api/notifications/templates/${templateId}`, updateData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update template: ${templateId}`, error);
      throw error;
    }
  }

  async deleteTemplate(templateId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.notifyServiceUrl}/api/notifications/templates/${templateId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to delete template: ${templateId}`, error);
      throw error;
    }
  }

  async testTemplate(templateId: string, testData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.notifyServiceUrl}/api/notifications/templates/${templateId}/test`, testData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to test template: ${templateId}`, error);
      throw error;
    }
  }

  // User Preferences Management
  async getUserPreferences(userId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.notifyServiceUrl}/api/notifications/preferences/${userId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch preferences for user: ${userId}`, error);
      throw error;
    }
  }

  async updateUserPreferences(userId: string, preferencesData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(`${this.notifyServiceUrl}/api/notifications/preferences/${userId}`, preferencesData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update preferences for user: ${userId}`, error);
      throw error;
    }
  }

  // Notification Statistics
  async getNotificationStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.notifyServiceUrl}/api/notifications/stats`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          params: dateRange
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch notification statistics', error);
      throw error;
    }
  }

  async getDeliveryStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.notifyServiceUrl}/api/notifications/delivery-stats`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          params: dateRange
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch delivery statistics', error);
      throw error;
    }
  }
}