import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GamesService } from './games.service';
import { BearerToken } from '../common';
import {
  CreateGameDto,
  UpdateGameDto,
  GameFilterDto,
  CreateGameWeeklyScheduleDto,
  UpdateGameWeeklyScheduleDto,
  CreateGameTimeSlotDto,
  UpdateGameTimeSlotDto,
  GameTimeSlotFilterDto,
  BulkCreateGameTimeSlotDto,
  GenerateTimeSlotsDto,
} from './dto';

@ApiTags('games')
@ApiBearerAuth()
@Controller('api/admin/games')
export class GamesController {
  private readonly logger = new Logger(GamesController.name);

  constructor(private readonly gamesService: GamesService) {}

  // ============================================
  // Game Management
  // ============================================
  @Get()
  @ApiOperation({ summary: 'Get games list' })
  @ApiResponse({ status: 200, description: 'Games retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGames(
    @BearerToken() token: string,
    @Query() filters: GameFilterDto,
  ) {
    this.logger.log('Fetching games');
    return this.gamesService.getGames(filters, token);
  }

  // Statistics - 이 라우트는 :gameId 보다 먼저 선언되어야 함
  @Get('time-slots/stats')
  @ApiOperation({ summary: 'Get time slot statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTimeSlotStats(
    @BearerToken() token: string,
    @Query() filters: GameTimeSlotFilterDto,
  ) {
    this.logger.log('Fetching time slot statistics');
    return this.gamesService.getTimeSlotStats(filters, token);
  }

  @Get('club/:clubId')
  @ApiOperation({ summary: 'Get games by club' })
  @ApiResponse({ status: 200, description: 'Games retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGamesByClub(
    @BearerToken() token: string,
    @Param('clubId', ParseIntPipe) clubId: number,
  ) {
    this.logger.log(`Fetching games for club: ${clubId}`);
    return this.gamesService.getGamesByClub(clubId, token);
  }

  @Get(':gameId')
  @ApiOperation({ summary: 'Get game by ID' })
  @ApiResponse({ status: 200, description: 'Game retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGameById(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
  ) {
    this.logger.log(`Fetching game: ${gameId}`);
    return this.gamesService.getGameById(gameId, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new game' })
  @ApiResponse({ status: 201, description: 'Game created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createGame(
    @BearerToken() token: string,
    @Body() createGameDto: CreateGameDto,
  ) {
    this.logger.log('Creating game');
    return this.gamesService.createGame(createGameDto, token);
  }

  @Patch(':gameId')
  @ApiOperation({ summary: 'Update game' })
  @ApiResponse({ status: 200, description: 'Game updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateGame(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() updateGameDto: UpdateGameDto,
  ) {
    this.logger.log(`Updating game: ${gameId}`);
    return this.gamesService.updateGame(gameId, updateGameDto, token);
  }

  @Delete(':gameId')
  @ApiOperation({ summary: 'Delete game' })
  @ApiResponse({ status: 200, description: 'Game deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteGame(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
  ) {
    this.logger.log(`Deleting game: ${gameId}`);
    return this.gamesService.deleteGame(gameId, token);
  }

  // ============================================
  // Weekly Schedule Management
  // ============================================
  @Get(':gameId/weekly-schedules')
  @ApiOperation({ summary: 'Get weekly schedules for game' })
  @ApiResponse({ status: 200, description: 'Weekly schedules retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWeeklySchedules(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
  ) {
    this.logger.log(`Fetching weekly schedules for game: ${gameId}`);
    return this.gamesService.getWeeklySchedules(gameId, token);
  }

  @Get(':gameId/weekly-schedules/:scheduleId')
  @ApiOperation({ summary: 'Get weekly schedule by ID' })
  @ApiResponse({ status: 200, description: 'Weekly schedule retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWeeklyScheduleById(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
  ) {
    this.logger.log(`Fetching weekly schedule: ${scheduleId}`);
    return this.gamesService.getWeeklyScheduleById(scheduleId, token);
  }

  @Post(':gameId/weekly-schedules')
  @ApiOperation({ summary: 'Create weekly schedule' })
  @ApiResponse({ status: 201, description: 'Weekly schedule created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createWeeklySchedule(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() createDto: CreateGameWeeklyScheduleDto,
  ) {
    this.logger.log(`Creating weekly schedule for game: ${gameId}`);
    const data = { ...createDto, gameId };
    return this.gamesService.createWeeklySchedule(data, token);
  }

  @Patch(':gameId/weekly-schedules/:scheduleId')
  @ApiOperation({ summary: 'Update weekly schedule' })
  @ApiResponse({ status: 200, description: 'Weekly schedule updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateWeeklySchedule(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Body() updateDto: UpdateGameWeeklyScheduleDto,
  ) {
    this.logger.log(`Updating weekly schedule: ${scheduleId}`);
    return this.gamesService.updateWeeklySchedule(scheduleId, updateDto, token);
  }

  @Delete(':gameId/weekly-schedules/:scheduleId')
  @ApiOperation({ summary: 'Delete weekly schedule' })
  @ApiResponse({ status: 200, description: 'Weekly schedule deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteWeeklySchedule(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
  ) {
    this.logger.log(`Deleting weekly schedule: ${scheduleId}`);
    return this.gamesService.deleteWeeklySchedule(scheduleId, token);
  }

  // ============================================
  // Time Slot Management
  // ============================================
  @Get(':gameId/time-slots')
  @ApiOperation({ summary: 'Get time slots for game' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter end date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Time slots retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTimeSlotsByGame(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.logger.log(`Fetching time slots for game: ${gameId}`);
    const filters = {
      gameId,
      date,
      startDate,
      endDate,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    return this.gamesService.getTimeSlots(filters, token);
  }

  @Get(':gameId/time-slots/:timeSlotId')
  @ApiOperation({ summary: 'Get time slot by ID' })
  @ApiResponse({ status: 200, description: 'Time slot retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTimeSlotById(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
    @Param('timeSlotId', ParseIntPipe) timeSlotId: number,
  ) {
    this.logger.log(`Fetching time slot: ${timeSlotId}`);
    return this.gamesService.getTimeSlotById(timeSlotId, token);
  }

  @Post(':gameId/time-slots')
  @ApiOperation({ summary: 'Create time slot' })
  @ApiResponse({ status: 201, description: 'Time slot created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createTimeSlot(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() createDto: CreateGameTimeSlotDto,
  ) {
    this.logger.log(`Creating time slot for game: ${gameId}`);
    return this.gamesService.createTimeSlot(gameId, createDto, token);
  }

  @Post(':gameId/time-slots/bulk')
  @ApiOperation({ summary: 'Create bulk time slots' })
  @ApiResponse({ status: 201, description: 'Bulk time slots created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async bulkCreateTimeSlots(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() bulkDto: BulkCreateGameTimeSlotDto,
  ) {
    this.logger.log(`Creating bulk time slots for game: ${gameId}`);
    const results = await this.gamesService.bulkCreateTimeSlots(gameId, bulkDto.timeSlots, token);
    return { success: true, data: results };
  }

  @Post(':gameId/time-slots/generate')
  @ApiOperation({ summary: 'Generate time slots from weekly schedule' })
  @ApiResponse({ status: 201, description: 'Time slots generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateTimeSlots(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() generateDto: GenerateTimeSlotsDto,
  ) {
    this.logger.log(`Generating time slots for game: ${gameId}`);
    return this.gamesService.generateTimeSlots(gameId, generateDto.startDate, generateDto.endDate, token);
  }

  @Patch(':gameId/time-slots/:timeSlotId')
  @ApiOperation({ summary: 'Update time slot' })
  @ApiResponse({ status: 200, description: 'Time slot updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateTimeSlot(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
    @Param('timeSlotId', ParseIntPipe) timeSlotId: number,
    @Body() updateDto: UpdateGameTimeSlotDto,
  ) {
    this.logger.log(`Updating time slot: ${timeSlotId}`);
    return this.gamesService.updateTimeSlot(timeSlotId, updateDto, token);
  }

  @Delete(':gameId/time-slots/:timeSlotId')
  @ApiOperation({ summary: 'Delete time slot' })
  @ApiResponse({ status: 200, description: 'Time slot deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteTimeSlot(
    @BearerToken() token: string,
    @Param('gameId', ParseIntPipe) gameId: number,
    @Param('timeSlotId', ParseIntPipe) timeSlotId: number,
  ) {
    this.logger.log(`Deleting time slot: ${timeSlotId}`);
    return this.gamesService.deleteTimeSlot(timeSlotId, token);
  }
}
