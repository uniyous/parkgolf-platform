import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { GamesService } from './games.service';

@ApiTags('Games')
@Controller('api/user/games')
export class GamesController {
  private readonly logger = new Logger(GamesController.name);

  constructor(private readonly gamesService: GamesService) {}

  @Get()
  @ApiOperation({ summary: '게임 목록 조회' })
  @ApiQuery({ name: 'clubId', required: false, description: '클럽 ID로 필터링' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수', example: 20 })
  @ApiResponse({ status: 200, description: '게임 목록을 성공적으로 조회했습니다.' })
  async getGames(
    @Query('clubId') clubId?: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    this.logger.log(`Fetching games - clubId: ${clubId || 'all'}, page: ${page}, limit: ${limit}`);
    return this.gamesService.getGames(clubId, page, limit);
  }

  @Get('club/:clubId')
  @ApiOperation({ summary: '클럽별 게임 조회' })
  @ApiResponse({ status: 200, description: '클럽의 게임 목록을 성공적으로 조회했습니다.' })
  async getGamesByClub(@Param('clubId', ParseIntPipe) clubId: number) {
    this.logger.log(`Fetching games for club: ${clubId}`);
    return this.gamesService.getGamesByClub(clubId);
  }

  @Get(':gameId')
  @ApiOperation({ summary: '게임 상세 조회' })
  @ApiResponse({ status: 200, description: '게임 정보를 성공적으로 조회했습니다.' })
  @ApiResponse({ status: 404, description: '게임을 찾을 수 없습니다.' })
  async getGameById(@Param('gameId', ParseIntPipe) gameId: number) {
    this.logger.log(`Fetching game: ${gameId}`);
    return this.gamesService.getGameById(gameId);
  }

  @Get(':gameId/time-slots')
  @ApiOperation({ summary: '게임의 타임슬롯 조회' })
  @ApiQuery({ name: 'date', required: false, description: '날짜 필터 (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: '타임슬롯 목록을 성공적으로 조회했습니다.' })
  async getTimeSlotsByGame(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Query('date') date?: string,
  ) {
    this.logger.log(`Fetching time slots for game: ${gameId}, date: ${date || 'all'}`);
    return this.gamesService.getTimeSlotsByGame(gameId, date);
  }

  @Get(':gameId/time-slots/available')
  @ApiOperation({ summary: '예약 가능한 타임슬롯 조회' })
  @ApiQuery({ name: 'date', required: true, description: '조회할 날짜 (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: '예약 가능한 타임슬롯 목록을 성공적으로 조회했습니다.' })
  async getAvailableTimeSlots(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Query('date') date: string,
  ) {
    this.logger.log(`Fetching available time slots for game: ${gameId} on ${date}`);

    if (!date) {
      date = new Date().toISOString().split('T')[0];
    }

    return this.gamesService.getAvailableTimeSlots(gameId, date);
  }
}
