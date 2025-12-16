import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from '../service/notification.service';
import { PreferencesService } from '../service/preferences.service';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationQueryDto,
  NotificationPreferencesDto,
  SendNotificationDto,
} from '../dto/notification.dto';

@ApiTags('notifications')
@Controller('api/notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferencesService: PreferencesService,
  ) {}

  @Post()
  @ApiOperation({ summary: '알림 생성' })
  @ApiResponse({ status: 201, description: '알림이 성공적으로 생성됨' })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Post('send')
  @ApiOperation({ summary: '다중 사용자에게 알림 발송' })
  @ApiResponse({ status: 201, description: '알림이 성공적으로 발송됨' })
  async sendToMultipleUsers(@Body() sendNotificationDto: SendNotificationDto) {
    return this.notificationService.sendToMultipleUsers(sendNotificationDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: '사용자 알림 목록 조회' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지 크기' })
  @ApiQuery({ name: 'type', required: false, description: '알림 유형' })
  @ApiQuery({ name: 'status', required: false, description: '알림 상태' })
  @ApiQuery({ name: 'unreadOnly', required: false, description: '읽지 않은 알림만' })
  async findAll(
    @Param('userId') userId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.findAll(userId, query);
  }

  @Get('user/:userId/unread-count')
  @ApiOperation({ summary: '사용자 읽지 않은 알림 수 조회' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async getUnreadCount(@Param('userId') userId: string) {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Get(':id/user/:userId')
  @ApiOperation({ summary: '특정 알림 조회' })
  @ApiParam({ name: 'id', description: '알림 ID' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId') userId: string,
  ) {
    return this.notificationService.findOne(id, userId);
  }

  @Put(':id/user/:userId')
  @ApiOperation({ summary: '알림 수정' })
  @ApiParam({ name: 'id', description: '알림 ID' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId') userId: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationService.update(id, userId, updateNotificationDto);
  }

  @Post(':id/user/:userId/mark-read')
  @ApiOperation({ summary: '알림을 읽음으로 표시' })
  @ApiParam({ name: 'id', description: '알림 ID' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId') userId: string,
  ) {
    return this.notificationService.markAsRead(id, userId);
  }

  @Post('user/:userId/mark-all-read')
  @ApiOperation({ summary: '모든 알림을 읽음으로 표시' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async markAllAsRead(@Param('userId') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Delete(':id/user/:userId')
  @ApiOperation({ summary: '알림 삭제' })
  @ApiParam({ name: 'id', description: '알림 ID' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId') userId: string,
  ) {
    await this.notificationService.remove(id, userId);
    return { message: 'Notification deleted successfully' };
  }

  @Get('preferences/:userId')
  @ApiOperation({ summary: '사용자 알림 설정 조회' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async getPreferences(@Param('userId') userId: string) {
    return this.preferencesService.getPreferences(userId);
  }

  @Put('preferences/:userId')
  @ApiOperation({ summary: '사용자 알림 설정 업데이트' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async updatePreferences(
    @Param('userId') userId: string,
    @Body() preferencesDto: NotificationPreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(userId, preferencesDto);
  }
}