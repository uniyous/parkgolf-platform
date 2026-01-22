import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateNotificationSettingsDto } from './dto/settings.dto';

@ApiTags('Settings')
@Controller('api/user/settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('notifications')
  @ApiOperation({ summary: '알림 설정 조회' })
  @ApiResponse({ status: 200, description: '알림 설정 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getNotificationSettings(@Request() req: any) {
    return this.settingsService.getNotificationSettings(req.user.userId);
  }

  @Put('notifications')
  @ApiOperation({ summary: '알림 설정 변경' })
  @ApiResponse({ status: 200, description: '알림 설정 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async updateNotificationSettings(
    @Request() req: any,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.settingsService.updateNotificationSettings(req.user.userId, dto);
  }
}
