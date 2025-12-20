import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // Notification Management
  async getNotifications(filters: any = {}, page = 1, limit = 20, adminToken: string): Promise<any> {
    this.logger.log('Fetching notifications');
    return this.natsClient.send('notifications.list', {
      filters,
      page,
      limit,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getNotificationById(notificationId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching notification: ${notificationId}`);
    return this.natsClient.send('notifications.findById', {
      notificationId,
      token: adminToken,
    }, NATS_TIMEOUTS.QUICK);
  }

  async createNotification(notificationData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating notification');
    return this.natsClient.send('notifications.create', {
      data: notificationData,
      token: adminToken,
    });
  }

  async sendBulkNotification(bulkNotificationData: any, adminToken: string): Promise<any> {
    this.logger.log('Sending bulk notification');
    return this.natsClient.send('notifications.sendBulk', {
      data: bulkNotificationData,
      token: adminToken,
    }, NATS_TIMEOUTS.ANALYTICS);
  }

  async getUserNotifications(userId: string, page = 1, limit = 20, adminToken: string): Promise<any> {
    this.logger.log(`Fetching user notifications: ${userId}`);
    return this.natsClient.send('notifications.user', {
      userId,
      page,
      limit,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async markAsRead(notificationId: string, userId: string, adminToken: string): Promise<any> {
    this.logger.log(`Marking notification as read: ${notificationId}`);
    return this.natsClient.send('notifications.markRead', {
      notificationId,
      userId,
      token: adminToken,
    });
  }

  async markAllAsRead(userId: string, adminToken: string): Promise<any> {
    this.logger.log(`Marking all notifications as read for user: ${userId}`);
    return this.natsClient.send('notifications.markAllRead', {
      userId,
      token: adminToken,
    });
  }

  // Template Management
  async getTemplates(page = 1, limit = 20, adminToken: string): Promise<any> {
    this.logger.log('Fetching notification templates');
    return this.natsClient.send('templates.list', {
      page,
      limit,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getTemplateById(templateId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching template: ${templateId}`);
    return this.natsClient.send('templates.findById', {
      templateId,
      token: adminToken,
    }, NATS_TIMEOUTS.QUICK);
  }

  async createTemplate(templateData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating notification template');
    return this.natsClient.send('templates.create', {
      data: templateData,
      token: adminToken,
    });
  }

  async updateTemplate(templateId: string, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating template: ${templateId}`);
    return this.natsClient.send('templates.update', {
      templateId,
      data: updateData,
      token: adminToken,
    });
  }

  async deleteTemplate(templateId: string, adminToken: string): Promise<any> {
    this.logger.log(`Deleting template: ${templateId}`);
    return this.natsClient.send('templates.delete', {
      templateId,
      token: adminToken,
    });
  }

  async testTemplate(templateId: string, testData: any, adminToken: string): Promise<any> {
    this.logger.log(`Testing template: ${templateId}`);
    return this.natsClient.send('templates.test', {
      templateId,
      data: testData,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  // User Preferences Management
  async getUserPreferences(userId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching user preferences: ${userId}`);
    return this.natsClient.send('preferences.get', {
      userId,
      token: adminToken,
    }, NATS_TIMEOUTS.QUICK);
  }

  async updateUserPreferences(userId: string, preferencesData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating user preferences: ${userId}`);
    return this.natsClient.send('preferences.update', {
      userId,
      data: preferencesData,
      token: adminToken,
    });
  }

  // Notification Statistics
  async getNotificationStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    this.logger.log('Fetching notification statistics');
    return this.natsClient.send('notifications.stats', {
      dateRange,
      token: adminToken,
    }, NATS_TIMEOUTS.ANALYTICS);
  }

  async getDeliveryStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    this.logger.log('Fetching delivery statistics');
    return this.natsClient.send('notifications.deliveryStats', {
      dateRange,
      token: adminToken,
    }, NATS_TIMEOUTS.ANALYTICS);
  }

  // Campaign Management
  async getCampaigns(page = 1, limit = 20, adminToken: string): Promise<any> {
    this.logger.log('Fetching notification campaigns');
    return this.natsClient.send('campaigns.list', {
      page,
      limit,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async createCampaign(campaignData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating notification campaign');
    return this.natsClient.send('campaigns.create', {
      data: campaignData,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getCampaignById(campaignId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching campaign: ${campaignId}`);
    return this.natsClient.send('campaigns.findById', {
      campaignId,
      token: adminToken,
    }, NATS_TIMEOUTS.QUICK);
  }

  async updateCampaign(campaignId: string, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating campaign: ${campaignId}`);
    return this.natsClient.send('campaigns.update', {
      campaignId,
      data: updateData,
      token: adminToken,
    });
  }

  async deleteCampaign(campaignId: string, adminToken: string): Promise<any> {
    this.logger.log(`Deleting campaign: ${campaignId}`);
    return this.natsClient.send('campaigns.delete', {
      campaignId,
      token: adminToken,
    });
  }
}
