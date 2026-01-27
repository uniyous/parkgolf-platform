import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notifications.service';
import { BearerToken } from '../common';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('api/admin/notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationService: NotificationService) {}

  // Notification Management
  @Get()
  @ApiOperation({ summary: 'Get notifications list' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by notification type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiResponse({ status: 200, description: 'Notifications list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotifications(
    @BearerToken() token: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    const filters: Record<string, string | undefined> = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (userId) filters.userId = userId;

    this.logger.log(`Fetching notifications - page: ${page}, limit: ${limit}, filters: ${JSON.stringify(filters)}`);
    return this.notificationService.getNotifications(filters, page, limit, token);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Notification statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationStats(
    @BearerToken() token: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dateRange = {
      startDate: startDate || defaultStartDate,
      endDate: endDate || defaultEndDate,
    };

    this.logger.log(`Fetching notification statistics for range: ${dateRange.startDate} to ${dateRange.endDate}`);
    return this.notificationService.getNotificationStats(dateRange, token);
  }

  @Get('stats/delivery')
  @ApiOperation({ summary: 'Get delivery statistics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Delivery statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDeliveryStats(
    @BearerToken() token: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dateRange = {
      startDate: startDate || defaultStartDate,
      endDate: endDate || defaultEndDate,
    };

    this.logger.log(`Fetching delivery statistics for range: ${dateRange.startDate} to ${dateRange.endDate}`);
    return this.notificationService.getDeliveryStats(dateRange, token);
  }

  @Get('templates/list')
  @ApiOperation({ summary: 'Get notification templates' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Templates list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTemplates(
    @BearerToken() token: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    this.logger.log(`Fetching templates - page: ${page}, limit: ${limit}`);
    return this.notificationService.getTemplates(page, limit, token);
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTemplateById(
    @BearerToken() token: string,
    @Param('templateId') templateId: string,
  ) {
    this.logger.log(`Fetching template: ${templateId}`);
    return this.notificationService.getTemplateById(templateId, token);
  }

  @Get('campaigns/list')
  @ApiOperation({ summary: 'Get notification campaigns' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Campaigns list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCampaigns(
    @BearerToken() token: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    this.logger.log(`Fetching campaigns - page: ${page}, limit: ${limit}`);
    return this.notificationService.getCampaigns(page, limit, token);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'User notifications retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserNotifications(
    @BearerToken() token: string,
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    this.logger.log(`Fetching notifications for user: ${userId}`);
    return this.notificationService.getUserNotifications(userId, page, limit, token);
  }

  @Get('preferences/:userId')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({ status: 200, description: 'User preferences retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserPreferences(
    @BearerToken() token: string,
    @Param('userId') userId: string,
  ) {
    this.logger.log(`Fetching preferences for user: ${userId}`);
    return this.notificationService.getUserPreferences(userId, token);
  }

  @Get(':notificationId')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationById(
    @BearerToken() token: string,
    @Param('notificationId') notificationId: string,
  ) {
    this.logger.log(`Fetching notification: ${notificationId}`);
    return this.notificationService.getNotificationById(notificationId, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createNotification(
    @BearerToken() token: string,
    @Body() notificationData: Record<string, unknown>,
  ) {
    this.logger.log('Creating notification');
    return this.notificationService.createNotification(notificationData, token);
  }

  @Post('send-bulk')
  @ApiOperation({ summary: 'Send bulk notification' })
  @ApiResponse({ status: 200, description: 'Bulk notification sent successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendBulkNotification(
    @BearerToken() token: string,
    @Body() bulkNotificationData: Record<string, unknown>,
  ) {
    this.logger.log('Sending bulk notification');
    return this.notificationService.sendBulkNotification(bulkNotificationData, token);
  }

  @Post(':notificationId/mark-read/:userId')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAsRead(
    @BearerToken() token: string,
    @Param('notificationId') notificationId: string,
    @Param('userId') userId: string,
  ) {
    this.logger.log(`Marking notification as read: ${notificationId} for user: ${userId}`);
    return this.notificationService.markAsRead(notificationId, userId, token);
  }

  @Post('mark-all-read/:userId')
  @ApiOperation({ summary: 'Mark all notifications as read for user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(
    @BearerToken() token: string,
    @Param('userId') userId: string,
  ) {
    this.logger.log(`Marking all notifications as read for user: ${userId}`);
    return this.notificationService.markAllAsRead(userId, token);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create notification template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createTemplate(
    @BearerToken() token: string,
    @Body() templateData: Record<string, unknown>,
  ) {
    this.logger.log('Creating notification template');
    return this.notificationService.createTemplate(templateData, token);
  }

  @Post('templates/:templateId/test')
  @ApiOperation({ summary: 'Test notification template' })
  @ApiResponse({ status: 200, description: 'Template tested successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async testTemplate(
    @BearerToken() token: string,
    @Param('templateId') templateId: string,
    @Body() testData: Record<string, unknown>,
  ) {
    this.logger.log(`Testing template: ${templateId}`);
    return this.notificationService.testTemplate(templateId, testData, token);
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'Create notification campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCampaign(
    @BearerToken() token: string,
    @Body() campaignData: Record<string, unknown>,
  ) {
    this.logger.log('Creating notification campaign');
    return this.notificationService.createCampaign(campaignData, token);
  }

  @Patch('templates/:templateId')
  @ApiOperation({ summary: 'Update notification template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateTemplate(
    @BearerToken() token: string,
    @Param('templateId') templateId: string,
    @Body() updateData: Record<string, unknown>,
  ) {
    this.logger.log(`Updating template: ${templateId}`);
    return this.notificationService.updateTemplate(templateId, updateData, token);
  }

  @Patch('preferences/:userId')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({ status: 200, description: 'User preferences updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUserPreferences(
    @BearerToken() token: string,
    @Param('userId') userId: string,
    @Body() preferencesData: Record<string, unknown>,
  ) {
    this.logger.log(`Updating preferences for user: ${userId}`);
    return this.notificationService.updateUserPreferences(userId, preferencesData, token);
  }

  @Delete('templates/:templateId')
  @ApiOperation({ summary: 'Delete notification template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteTemplate(
    @BearerToken() token: string,
    @Param('templateId') templateId: string,
  ) {
    this.logger.log(`Deleting template: ${templateId}`);
    return this.notificationService.deleteTemplate(templateId, token);
  }
}
