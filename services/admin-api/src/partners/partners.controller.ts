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
  async createConfig(@Body() body: Record<string, unknown>, @BearerToken() token: string) {
    return this.partnersService.createConfig(body, token);
  }

  @Get()
  @ApiOperation({ summary: '파트너 설정 목록' })
  async listConfigs(
    @Query() query: Record<string, unknown>,
    @AdminContext() ctx: AdminContextData,
    @BearerToken() token: string,
  ) {
    // COMPANY scope: 자기 회사만 조회
    if (ctx?.scope === 'COMPANY' && ctx.companyId) {
      query.companyId = ctx.companyId;
    }
    return this.partnersService.listConfigs(query, token);
  }

  @Get(':id')
  @ApiOperation({ summary: '파트너 설정 상세' })
  async getConfig(@Param('id', ParseIntPipe) id: number, @BearerToken() token: string) {
    return this.partnersService.getConfig(id, token);
  }

  @Put(':id')
  @ApiOperation({ summary: '파트너 설정 수정' })
  async updateConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @BearerToken() token: string,
  ) {
    return this.partnersService.updateConfig({ ...body, id }, token);
  }

  @Delete(':id')
  @ApiOperation({ summary: '파트너 설정 삭제' })
  async deleteConfig(@Param('id', ParseIntPipe) id: number, @BearerToken() token: string) {
    return this.partnersService.deleteConfig(id, token);
  }

  @Post(':id/test')
  @ApiOperation({ summary: '연결 테스트' })
  async testConnection(@Param('id', ParseIntPipe) id: number, @BearerToken() token: string) {
    return this.partnersService.testConnection(id, token);
  }

  // ──────────────────────────────────────────────
  // admin-dashboard: 내 골프장 연동 현황
  // ──────────────────────────────────────────────

  @Get('my/club/:clubId')
  @ApiOperation({ summary: '내 골프장 파트너 설정 조회' })
  async getMyConfig(@Param('clubId', ParseIntPipe) clubId: number, @BearerToken() token: string) {
    return this.partnersService.getConfigByClub(clubId, token);
  }

  @Get('my/club/:clubId/sync-logs')
  @ApiOperation({ summary: '내 골프장 동기화 이력' })
  async getMySyncLogs(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Query() query: Record<string, unknown>,
    @BearerToken() token: string,
  ) {
    return this.partnersService.getSyncLogs({ ...query, clubId }, token);
  }

  @Post('my/club/:clubId/sync')
  @ApiOperation({ summary: '내 골프장 수동 동기화' })
  async myManualSync(@Param('clubId', ParseIntPipe) clubId: number, @BearerToken() token: string) {
    return this.partnersService.manualSync(clubId, token);
  }

  @Get('my/club/:clubId/booking-mappings')
  @ApiOperation({ summary: '내 골프장 예약 매핑 목록' })
  async myBookingMappings(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Query() query: Record<string, unknown>,
    @BearerToken() token: string,
  ) {
    return this.partnersService.listBookingMappings({ ...query, clubId }, token);
  }

  @Post('my/booking-mappings/:bid/resolve')
  @ApiOperation({ summary: '예약 매핑 충돌 해결' })
  async resolveConflict(
    @Param('bid', ParseIntPipe) bid: number,
    @Body() body: Record<string, unknown>,
    @BearerToken() token: string,
  ) {
    return this.partnersService.resolveConflict(bid, body, token);
  }

  // ──────────────────────────────────────────────
  // 코스 매핑
  // ──────────────────────────────────────────────

  @Post(':id/course-mappings')
  @ApiOperation({ summary: '코스 매핑 등록' })
  async createCourseMapping(
    @Param('id', ParseIntPipe) partnerId: number,
    @Body() body: Record<string, unknown>,
    @BearerToken() token: string,
  ) {
    return this.partnersService.createCourseMapping({ ...body, partnerId }, token);
  }

  @Get(':id/course-mappings')
  @ApiOperation({ summary: '코스 매핑 목록' })
  async listCourseMappings(@Param('id', ParseIntPipe) partnerId: number, @BearerToken() token: string) {
    return this.partnersService.listCourseMappings(partnerId, token);
  }

  @Put('course-mappings/:mappingId')
  @ApiOperation({ summary: '코스 매핑 수정' })
  async updateCourseMapping(
    @Param('mappingId', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @BearerToken() token: string,
  ) {
    return this.partnersService.updateCourseMapping({ ...body, id }, token);
  }

  @Delete('course-mappings/:mappingId')
  @ApiOperation({ summary: '코스 매핑 삭제' })
  async deleteCourseMapping(@Param('mappingId', ParseIntPipe) id: number, @BearerToken() token: string) {
    return this.partnersService.deleteCourseMapping(id, token);
  }
}
