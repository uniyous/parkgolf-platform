import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { BearerToken } from '../common/decorators/bearer-token.decorator';
import { AdminContext, AdminContextData } from '../common/decorators/admin-context.decorator';

/**
 * 파트너 연동 관리 API
 *
 * platform-dashboard: 전체 파트너 CRUD, 설정, 모니터링
 * admin-dashboard: 내 골프장 연동 현황 (clubId 기반)
 */
@ApiTags('Partners')
@ApiBearerAuth()
@Controller('api/admin/partners')
export class PartnersController {
  private readonly logger = new Logger(PartnersController.name);

  constructor(private readonly partnersService: PartnersService) {}

  // ──────────────────────────────────────────────
  // platform-dashboard: 파트너 설정 전체 CRUD
  // ──────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: '파트너 설정 등록' })
  async createConfig(@Body() body: Record<string, unknown>, @BearerToken() _token: string) {
    return this.partnersService.createConfig(body);
  }

  @Get()
  @ApiOperation({ summary: '파트너 설정 목록' })
  async listConfigs(
    @Query() query: Record<string, unknown>,
    @AdminContext() ctx: AdminContextData,
    @BearerToken() _token: string,
  ) {
    // COMPANY scope: 자기 회사만 조회
    if (ctx?.scope === 'COMPANY' && ctx.companyId) {
      query.companyId = ctx.companyId;
    }
    return this.partnersService.listConfigs(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '파트너 설정 상세' })
  async getConfig(@Param('id', ParseIntPipe) id: number, @BearerToken() _token: string) {
    return this.partnersService.getConfig(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '파트너 설정 수정' })
  async updateConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @BearerToken() _token: string,
  ) {
    return this.partnersService.updateConfig({ ...body, id });
  }

  @Delete(':id')
  @ApiOperation({ summary: '파트너 설정 삭제' })
  async deleteConfig(@Param('id', ParseIntPipe) id: number, @BearerToken() _token: string) {
    return this.partnersService.deleteConfig(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: '연결 테스트' })
  async testConnection(@Param('id', ParseIntPipe) id: number, @BearerToken() _token: string) {
    return this.partnersService.testConnection(id);
  }

  // ──────────────────────────────────────────────
  // admin-dashboard: 내 골프장 연동 현황
  // ──────────────────────────────────────────────

  @Get('my/club/:clubId')
  @ApiOperation({ summary: '내 골프장 파트너 설정 조회' })
  async getMyConfig(@Param('clubId', ParseIntPipe) clubId: number, @BearerToken() _token: string) {
    return this.partnersService.getConfigByClub(clubId);
  }

  @Get('my/club/:clubId/sync-logs')
  @ApiOperation({ summary: '내 골프장 동기화 이력' })
  async getMySyncLogs(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Query() query: Record<string, unknown>,
    @BearerToken() _token: string,
  ) {
    return this.partnersService.getSyncLogs({ ...query, clubId });
  }

  @Post('my/club/:clubId/sync')
  @ApiOperation({ summary: '내 골프장 수동 동기화' })
  async myManualSync(@Param('clubId', ParseIntPipe) clubId: number, @BearerToken() _token: string) {
    return this.partnersService.manualSync(clubId);
  }

  @Get('my/club/:clubId/booking-mappings')
  @ApiOperation({ summary: '내 골프장 예약 매핑 목록' })
  async myBookingMappings(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Query() query: Record<string, unknown>,
    @BearerToken() _token: string,
  ) {
    return this.partnersService.listBookingMappings({ ...query, clubId });
  }

  @Post('my/booking-mappings/:bid/resolve')
  @ApiOperation({ summary: '예약 매핑 충돌 해결' })
  async resolveConflict(
    @Param('bid', ParseIntPipe) bid: number,
    @Body() body: Record<string, unknown>,
    @BearerToken() _token: string,
  ) {
    return this.partnersService.resolveConflict(bid, body);
  }

  // ──────────────────────────────────────────────
  // platform-dashboard: 파트너 기준 동기화/매핑 조회
  // ──────────────────────────────────────────────

  @Get(':id/sync-logs')
  @ApiOperation({ summary: '파트너 동기화 이력 (partnerId)' })
  async getPartnerSyncLogs(
    @Param('id', ParseIntPipe) partnerId: number,
    @Query() query: Record<string, unknown>,
    @BearerToken() _token: string,
  ) {
    return this.partnersService.getSyncLogs({ ...query, partnerId });
  }

  @Post(':id/sync')
  @ApiOperation({ summary: '파트너 수동 동기화 (partnerId)' })
  async partnerManualSync(@Param('id', ParseIntPipe) partnerId: number, @BearerToken() _token: string) {
    return this.partnersService.manualSyncByPartnerId(partnerId);
  }

  @Get(':id/booking-mappings')
  @ApiOperation({ summary: '파트너 예약 매핑 목록 (partnerId)' })
  async partnerBookingMappings(
    @Param('id', ParseIntPipe) partnerId: number,
    @Query() query: Record<string, unknown>,
    @BearerToken() _token: string,
  ) {
    return this.partnersService.listBookingMappings({ ...query, partnerId });
  }

  @Get(':id/slot-mappings')
  @ApiOperation({ summary: '슬롯 매핑 목록' })
  async listSlotMappings(
    @Param('id', ParseIntPipe) partnerId: number,
    @Query() query: Record<string, unknown>,
    @BearerToken() _token: string,
  ) {
    return this.partnersService.listSlotMappings({ ...query, partnerId });
  }

  @Post('booking-mappings/:bid/resolve')
  @ApiOperation({ summary: '예약 매핑 충돌 해결 (platform)' })
  async resolveConflictPlatform(
    @Param('bid', ParseIntPipe) bid: number,
    @Body() body: Record<string, unknown>,
    @BearerToken() _token: string,
  ) {
    return this.partnersService.resolveConflict(bid, body);
  }

  // ──────────────────────────────────────────────
  // 게임 매핑
  // ──────────────────────────────────────────────

  @Post(':id/game-mappings')
  @ApiOperation({ summary: '게임 매핑 등록' })
  async createGameMapping(
    @Param('id', ParseIntPipe) partnerId: number,
    @Body() body: Record<string, unknown>,
    @BearerToken() _token: string,
  ) {
    return this.partnersService.createGameMapping({ ...body, partnerId });
  }

  @Get(':id/game-mappings')
  @ApiOperation({ summary: '게임 매핑 목록' })
  async listGameMappings(@Param('id', ParseIntPipe) partnerId: number, @BearerToken() _token: string) {
    return this.partnersService.listGameMappings(partnerId);
  }

  @Put('game-mappings/:mappingId')
  @ApiOperation({ summary: '게임 매핑 수정' })
  async updateGameMapping(
    @Param('mappingId', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @BearerToken() _token: string,
  ) {
    return this.partnersService.updateGameMapping({ ...body, id });
  }

  @Delete('game-mappings/:mappingId')
  @ApiOperation({ summary: '게임 매핑 삭제' })
  async deleteGameMapping(@Param('mappingId', ParseIntPipe) id: number, @BearerToken() _token: string) {
    return this.partnersService.deleteGameMapping(id);
  }
}
