import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query, 
  Headers,
  HttpStatus, 
  HttpException, 
  Logger 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { NotificationNatsService } from '../services/notification-nats.service';

@ApiTags('notifications')
@Controller('api/admin/notifications')
export class AdminNotificationsController {
  private readonly logger = new Logger(AdminNotificationsController.name);

  constructor(private readonly notificationService: NotificationNatsService) {}

  // Notification Management
  @Get()
  @ApiOperation({ summary: 'Get notifications list' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by notification type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiResponse({ status: 200, description: 'Notifications list retrieved successfully' })
  async getNotifications(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);
      
      const filters: any = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (userId) filters.userId = userId;
      
      this.logger.log(`Fetching notifications - page: ${page}, limit: ${limit}, filters:`, filters);
      
      const result = await this.notificationService.getNotifications(filters, page, limit, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch notifications', error);
      throw this.handleError(error);
    }
  }

  @Get(':notificationId')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Notification retrieved successfully' })
  async getNotificationById(
    @Param('notificationId') notificationId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching notification: ${notificationId}`);
      
      const result = await this.notificationService.getNotificationById(notificationId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch notification: ${notificationId}`, error);
      throw this.handleError(error);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create new notification' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  async createNotification(
    @Body() notificationData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log('Creating notification');
      
      const result = await this.notificationService.createNotification(notificationData, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to create notification', error);
      throw this.handleError(error);
    }
  }

  @Post('send-bulk')
  @ApiOperation({ summary: 'Send bulk notification' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Bulk notification sent successfully' })
  async sendBulkNotification(
    @Body() bulkNotificationData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log('Sending bulk notification');
      
      const result = await this.notificationService.sendBulkNotification(bulkNotificationData, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to send bulk notification', error);
      throw this.handleError(error);
    }
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'User notifications retrieved successfully' })
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching notifications for user: ${userId}`);
      
      const result = await this.notificationService.getUserNotifications(userId, page, limit, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch notifications for user: ${userId}`, error);
      throw this.handleError(error);
    }
  }

  @Post(':notificationId/mark-read/:userId')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Notification marked as read successfully' })
  async markAsRead(
    @Param('notificationId') notificationId: string,
    @Param('userId') userId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Marking notification as read: ${notificationId} for user: ${userId}`);
      
      const result = await this.notificationService.markAsRead(notificationId, userId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to mark notification as read: ${notificationId}`, error);
      throw this.handleError(error);
    }
  }

  @Post('mark-all-read/:userId')
  @ApiOperation({ summary: 'Mark all notifications as read for user' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read successfully' })
  async markAllAsRead(
    @Param('userId') userId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Marking all notifications as read for user: ${userId}`);
      
      const result = await this.notificationService.markAllAsRead(userId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to mark all notifications as read for user: ${userId}`, error);
      throw this.handleError(error);
    }
  }

  // Template Management
  @Get('templates/list')
  @ApiOperation({ summary: 'Get notification templates' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Templates list retrieved successfully' })
  async getTemplates(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching templates - page: ${page}, limit: ${limit}`);
      
      const result = await this.notificationService.getTemplates(page, limit, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch templates', error);
      throw this.handleError(error);
    }
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async getTemplateById(
    @Param('templateId') templateId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching template: ${templateId}`);
      
      const result = await this.notificationService.getTemplateById(templateId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch template: ${templateId}`, error);
      throw this.handleError(error);
    }
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create notification template' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(
    @Body() templateData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log('Creating notification template');
      
      const result = await this.notificationService.createTemplate(templateData, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to create template', error);
      throw this.handleError(error);
    }
  }

  @Patch('templates/:templateId')
  @ApiOperation({ summary: 'Update notification template' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() updateData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating template: ${templateId}`);
      
      const result = await this.notificationService.updateTemplate(templateId, updateData, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update template: ${templateId}`, error);
      throw this.handleError(error);
    }
  }

  @Delete('templates/:templateId')
  @ApiOperation({ summary: 'Delete notification template' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async deleteTemplate(
    @Param('templateId') templateId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Deleting template: ${templateId}`);
      
      const result = await this.notificationService.deleteTemplate(templateId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete template: ${templateId}`, error);
      throw this.handleError(error);
    }
  }

  @Post('templates/:templateId/test')
  @ApiOperation({ summary: 'Test notification template' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Template tested successfully' })
  async testTemplate(
    @Param('templateId') templateId: string,
    @Body() testData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Testing template: ${templateId}`);
      
      const result = await this.notificationService.testTemplate(templateId, testData, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to test template: ${templateId}`, error);
      throw this.handleError(error);
    }
  }

  // User Preferences Management
  @Get('preferences/:userId')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'User preferences retrieved successfully' })
  async getUserPreferences(
    @Param('userId') userId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching preferences for user: ${userId}`);
      
      const result = await this.notificationService.getUserPreferences(userId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch preferences for user: ${userId}`, error);
      throw this.handleError(error);
    }
  }

  @Patch('preferences/:userId')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'User preferences updated successfully' })
  async updateUserPreferences(
    @Param('userId') userId: string,
    @Body() preferencesData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating preferences for user: ${userId}`);
      
      const result = await this.notificationService.updateUserPreferences(userId, preferencesData, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update preferences for user: ${userId}`, error);
      throw this.handleError(error);
    }
  }

  // Statistics
  @Get('stats/overview')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Notification statistics retrieved successfully' })
  async getNotificationStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);
      
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const dateRange = {
        startDate: startDate || defaultStartDate,
        endDate: endDate || defaultEndDate
      };
      
      this.logger.log(`Fetching notification statistics for range: ${dateRange.startDate} to ${dateRange.endDate}`);
      
      const result = await this.notificationService.getNotificationStats(dateRange, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch notification statistics', error);
      throw this.handleError(error);
    }
  }

  @Get('stats/delivery')
  @ApiOperation({ summary: 'Get delivery statistics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Delivery statistics retrieved successfully' })
  async getDeliveryStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);
      
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const dateRange = {
        startDate: startDate || defaultStartDate,
        endDate: endDate || defaultEndDate
      };
      
      this.logger.log(`Fetching delivery statistics for range: ${dateRange.startDate} to ${dateRange.endDate}`);
      
      const result = await this.notificationService.getDeliveryStats(dateRange, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch delivery statistics', error);
      throw this.handleError(error);
    }
  }

  // Campaign Management
  @Get('campaigns/list')
  @ApiOperation({ summary: 'Get notification campaigns' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Campaigns list retrieved successfully' })
  async getCampaigns(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching campaigns - page: ${page}, limit: ${limit}`);
      
      const result = await this.notificationService.getCampaigns(page, limit, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch campaigns', error);
      throw this.handleError(error);
    }
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'Create notification campaign' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  async createCampaign(
    @Body() campaignData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log('Creating notification campaign');
      
      const result = await this.notificationService.createCampaign(campaignData, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to create campaign', error);
      throw this.handleError(error);
    }
  }

  private extractToken(authorization: string): string {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization token required',
          }
        },
        HttpStatus.UNAUTHORIZED
      );
    }
    return authorization.substring(7);
  }

  private handleError(error: any): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (error.message?.includes('timeout') || error.code === 'ECONNREFUSED') {
      return new HttpException(
        {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Notification service temporarily unavailable',
          }
        },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    return new HttpException(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        }
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}