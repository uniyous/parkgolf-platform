import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators';
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
  async getNotificationSettings(@CurrentUser('userId') userId: number) {
    return this.settingsService.getNotificationSettings(userId);
  }

  @Put('notifications')
  @ApiOperation({ summary: '알림 설정 변경' })
  @ApiResponse({ status: 200, description: '알림 설정 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async updateNotificationSettings(
    @CurrentUser('userId') userId: number,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.settingsService.updateNotificationSettings(userId, dto);
  }

  // ─── AI Agent Memory (Phase 3 — UNI-20 프라이버시 토글) ───

  @Get('agent-memory')
  @ApiOperation({ summary: 'AI 비서 메모리 상태 조회 (프라이버시 토글)' })
  @ApiResponse({ status: 200, description: '조회 성공 — { enabled, hasMemory, summary }' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getAgentMemory(@CurrentUser('userId') userId: number) {
    return this.settingsService.getAgentMemory(userId);
  }

  @Put('agent-memory')
  @ApiOperation({ summary: 'AI 비서 메모리 ON/OFF 토글 (프라이버시)' })
  @ApiResponse({ status: 200, description: '변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async setAgentMemoryEnabled(
    @CurrentUser('userId') userId: number,
    @Body() body: { enabled: boolean },
  ) {
    return this.settingsService.setAgentMemoryEnabled(userId, !!body?.enabled);
  }
}
