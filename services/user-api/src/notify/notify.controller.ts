import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotifyService } from './notify.service';
import { CurrentUser } from '../common/decorators';
import { GetNotificationsQueryDto } from './dto/notification.dto';

@ApiTags('Notifications')
@Controller('api/user/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotifyController {
  constructor(private readonly notifyService: NotifyService) {}

  @Get()
  @ApiOperation({ summary: '알림 목록 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, description: '알림 타입 필터' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: '알림 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getNotifications(
    @CurrentUser('userId') userId: number,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.notifyService.getNotifications(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '읽지 않은 알림 수 조회' })
  @ApiResponse({ status: 200, description: '읽지 않은 알림 수 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getUnreadCount(@CurrentUser('userId') userId: number) {
    return this.notifyService.getUnreadCount(userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '알림 읽음 처리' })
  @ApiParam({ name: 'id', description: '알림 ID' })
  @ApiResponse({ status: 200, description: '알림 읽음 처리 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '알림을 찾을 수 없음' })
  async markAsRead(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notifyService.markAsRead(id, userId);
  }

  @Post('read-all')
  @ApiOperation({ summary: '모든 알림 읽음 처리' })
  @ApiResponse({ status: 200, description: '모든 알림 읽음 처리 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async markAllAsRead(@CurrentUser('userId') userId: number) {
    return this.notifyService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '알림 삭제' })
  @ApiParam({ name: 'id', description: '알림 ID' })
  @ApiResponse({ status: 200, description: '알림 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '알림을 찾을 수 없음' })
  async deleteNotification(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notifyService.deleteNotification(id, userId);
  }

  // Legacy endpoints
  @Post('email')
  @ApiOperation({ summary: '이메일 발송' })
  @ApiResponse({ status: 200, description: '이메일 발송 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async sendEmail(
    @Body() data: {
      to: string;
      subject: string;
      template: string;
      context: Record<string, unknown>;
    },
  ) {
    return this.notifyService.sendEmail(data);
  }

  @Post('sms')
  @ApiOperation({ summary: 'SMS 발송' })
  @ApiResponse({ status: 200, description: 'SMS 발송 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async sendSMS(
    @Body() data: {
      to: string;
      message: string;
    },
  ) {
    return this.notifyService.sendSMS(data);
  }
}
