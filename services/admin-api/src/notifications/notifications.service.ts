import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Optional() @Inject('NATS_CLIENT') private readonly notifyClient?: ClientProxy,
  ) {}

  // Notification Management
  async getNotifications(filters: any = {}, page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      this.logger.log('Fetching notifications via NATS');
      
      const result = await firstValueFrom(
        this.notifyClient.send('notifications.list', { 
          filters, 
          page, 
          limit, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch notifications', error);
      throw error;
    }
  }

  async getNotificationById(notificationId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching notification via NATS: ${notificationId}`);
      
      const result = await firstValueFrom(
        this.notifyClient.send('notifications.findById', { 
          notificationId, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch notification: ${notificationId}`, error);
      throw error;
    }
  }

  async createNotification(notificationData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log('Creating notification via NATS');
      
      const result = await firstValueFrom(
        this.notifyClient.send('notifications.create', { 
          data: notificationData, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to create notification', error);
      throw error;
    }
  }

  async sendBulkNotification(bulkNotificationData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log('Sending bulk notification via NATS');
      
      const result = await firstValueFrom(
        this.notifyClient.send('notifications.sendBulk', { 
          data: bulkNotificationData, 
          token: adminToken 
        }).pipe(timeout(15000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to send bulk notification', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching user notifications via NATS: ${userId}`);
      
      const result = await firstValueFrom(
        this.notifyClient.send('notifications.user', { 
          userId, 
          page, 
          limit, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch notifications for user: ${userId}`, error);
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Marking notification as read via NATS: ${notificationId}`);
      
      const result = await firstValueFrom(
        this.notifyClient.send('notifications.markRead', { 
          notificationId, 
          userId, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to mark notification as read: ${notificationId}`, error);
      throw error;
    }
  }

  async markAllAsRead(userId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Marking all notifications as read via NATS for user: ${userId}`);
      
      const result = await firstValueFrom(
        this.notifyClient.send('notifications.markAllRead', { 
          userId, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to mark all notifications as read for user: ${userId}`, error);
      throw error;
    }
  }

  // Template Management
  async getTemplates(page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      this.logger.log('Fetching notification templates via NATS');
      
      const result = await firstValueFrom(
        this.notifyClient.send('templates.list', { 
          page, 
          limit, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch notification templates', error);
      throw error;
    }
  }

  async getTemplateById(templateId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching template via NATS: ${templateId}`);
      
      const result = await firstValueFrom(
        this.notifyClient.send('templates.findById', { 
          templateId, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch template: ${templateId}`, error);
      throw error;
    }
  }

  async createTemplate(templateData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log('Creating notification template via NATS');
      
      const result = await firstValueFrom(
        this.notifyClient.send('templates.create', { 
          data: templateData, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to create notification template', error);
      throw error;
    }
  }

  async updateTemplate(templateId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Updating template via NATS: ${templateId}`);
      
      const result = await firstValueFrom(
        this.notifyClient.send('templates.update', { 
          templateId, 
          data: updateData, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update template: ${templateId}`, error);
      throw error;
    }
  }

  async deleteTemplate(templateId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Deleting template via NATS: ${templateId}`);
      
      const result = await firstValueFrom(
        this.notifyClient.send('templates.delete', { 
          templateId, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete template: ${templateId}`, error);
      throw error;
    }
  }

  async testTemplate(templateId: string, testData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Testing template via NATS: ${templateId}`);
      
      const result = await firstValueFrom(
        this.notifyClient.send('templates.test', { 
          templateId, 
          data: testData, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to test template: ${templateId}`, error);
      throw error;
    }
  }

  // User Preferences Management
  async getUserPreferences(userId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching user preferences via NATS: ${userId}`);
      
      const result = await firstValueFrom(
        this.notifyClient.send('preferences.get', { 
          userId, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch preferences for user: ${userId}`, error);
      throw error;
    }
  }

  async updateUserPreferences(userId: string, preferencesData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Updating user preferences via NATS: ${userId}`);
      
      const result = await firstValueFrom(
        this.notifyClient.send('preferences.update', { 
          userId, 
          data: preferencesData, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update preferences for user: ${userId}`, error);
      throw error;
    }
  }

  // Notification Statistics
  async getNotificationStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    try {
      this.logger.log('Fetching notification statistics via NATS');
      
      const result = await firstValueFrom(
        this.notifyClient.send('notifications.stats', { 
          dateRange, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch notification statistics', error);
      throw error;
    }
  }

  async getDeliveryStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    try {
      this.logger.log('Fetching delivery statistics via NATS');
      
      const result = await firstValueFrom(
        this.notifyClient.send('notifications.deliveryStats', { 
          dateRange, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch delivery statistics', error);
      throw error;
    }
  }

  // Campaign Management
  async getCampaigns(page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      this.logger.log('Fetching notification campaigns via NATS');
      
      const result = await firstValueFrom(
        this.notifyClient.send('campaigns.list', { 
          page, 
          limit, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch notification campaigns', error);
      throw error;
    }
  }

  async createCampaign(campaignData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log('Creating notification campaign via NATS');
      
      const result = await firstValueFrom(
        this.notifyClient.send('campaigns.create', { 
          data: campaignData, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to create notification campaign', error);
      throw error;
    }
  }

  async getCampaignById(campaignId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching campaign via NATS: ${campaignId}`);
      
      const result = await firstValueFrom(
        this.notifyClient.send('campaigns.findById', { 
          campaignId, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch campaign: ${campaignId}`, error);
      throw error;
    }
  }

  async updateCampaign(campaignId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Updating campaign via NATS: ${campaignId}`);
      
      const result = await firstValueFrom(
        this.notifyClient.send('campaigns.update', { 
          campaignId, 
          data: updateData, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update campaign: ${campaignId}`, error);
      throw error;
    }
  }

  async deleteCampaign(campaignId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Deleting campaign via NATS: ${campaignId}`);
      
      const result = await firstValueFrom(
        this.notifyClient.send('campaigns.delete', { 
          campaignId, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete campaign: ${campaignId}`, error);
      throw error;
    }
  }

  onModuleInit() {
    this.notifyClient.connect();
  }

  onModuleDestroy() {
    this.notifyClient.close();
  }
}