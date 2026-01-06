import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  ParseIntPipe,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { GamesService } from './games.service';
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
@Controller('api/admin/games')
export class GamesController {
  private readonly logger = new Logger(GamesController.name);

  constructor(private readonly gamesService: GamesService) {}

  // ============================================
  // Game Management
  // ============================================
  @Get()
  @ApiOperation({ summary: 'Get games list' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Games retrieved successfully' })
  async getGames(
    @Query() filters: GameFilterDto,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log('Fetching games');
    return this.gamesService.getGames(filters, token);
  }

  // Statistics - 이 라우트는 :gameId 보다 먼저 선언되어야 함
  @Get('time-slots/stats')
  @ApiOperation({ summary: 'Get time slot statistics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getTimeSlotStats(
    @Query() filters: GameTimeSlotFilterDto,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log('Fetching time slot statistics');
    return this.gamesService.getTimeSlotStats(filters, token);
  }

  @Get('club/:clubId')
  @ApiOperation({ summary: 'Get games by club' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Games retrieved successfully' })
  async getGamesByClub(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Fetching games for club: ${clubId}`);
    return this.gamesService.getGamesByClub(clubId, token);
  }

  @Get(':gameId')
  @ApiOperation({ summary: 'Get game by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Game retrieved successfully' })
  async getGameById(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Fetching game: ${gameId}`);
    return this.gamesService.getGameById(gameId, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new game' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Game created successfully' })
  async createGame(
    @Body() createGameDto: CreateGameDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log('Creating game');
    return this.gamesService.createGame(createGameDto, token);
  }

  @Patch(':gameId')
  @ApiOperation({ summary: 'Update game' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Game updated successfully' })
  async updateGame(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() updateGameDto: UpdateGameDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Updating game: ${gameId}`);
    return this.gamesService.updateGame(gameId, updateGameDto, token);
  }

  @Delete(':gameId')
  @ApiOperation({ summary: 'Delete game' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Game deleted successfully' })
  async deleteGame(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Headers('authorization') authorization: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Deleting game: ${gameId}`);
    return this.gamesService.deleteGame(gameId, token);
  }

  // ============================================
  // Weekly Schedule Management
  // ============================================
  @Get(':gameId/weekly-schedules')
  @ApiOperation({ summary: 'Get weekly schedules for game' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Weekly schedules retrieved successfully' })
  async getWeeklySchedules(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Fetching weekly schedules for game: ${gameId}`);
    return this.gamesService.getWeeklySchedules(gameId, token);
  }

  @Get(':gameId/weekly-schedules/:scheduleId')
  @ApiOperation({ summary: 'Get weekly schedule by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Weekly schedule retrieved successfully' })
  async getWeeklyScheduleById(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Fetching weekly schedule: ${scheduleId}`);
    return this.gamesService.getWeeklyScheduleById(scheduleId, token);
  }

  @Post(':gameId/weekly-schedules')
  @ApiOperation({ summary: 'Create weekly schedule' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Weekly schedule created successfully' })
  async createWeeklySchedule(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() createDto: CreateGameWeeklyScheduleDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Creating weekly schedule for game: ${gameId}`);
    const data = { ...createDto, gameId };
    return this.gamesService.createWeeklySchedule(data, token);
  }

  @Patch(':gameId/weekly-schedules/:scheduleId')
  @ApiOperation({ summary: 'Update weekly schedule' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Weekly schedule updated successfully' })
  async updateWeeklySchedule(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Body() updateDto: UpdateGameWeeklyScheduleDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Updating weekly schedule: ${scheduleId}`);
    return this.gamesService.updateWeeklySchedule(scheduleId, updateDto, token);
  }

  @Delete(':gameId/weekly-schedules/:scheduleId')
  @ApiOperation({ summary: 'Delete weekly schedule' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Weekly schedule deleted successfully' })
  async deleteWeeklySchedule(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Headers('authorization') authorization: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Deleting weekly schedule: ${scheduleId}`);
    return this.gamesService.deleteWeeklySchedule(scheduleId, token);
  }

  // ============================================
  // Time Slot Management
  // ============================================
  @Get(':gameId/time-slots')
  @ApiOperation({ summary: 'Get time slots for game' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter end date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Time slots retrieved successfully' })
  async getTimeSlotsByGame(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);
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
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Time slot retrieved successfully' })
  async getTimeSlotById(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Param('timeSlotId', ParseIntPipe) timeSlotId: number,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Fetching time slot: ${timeSlotId}`);
    return this.gamesService.getTimeSlotById(timeSlotId, token);
  }

  @Post(':gameId/time-slots')
  @ApiOperation({ summary: 'Create time slot' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Time slot created successfully' })
  async createTimeSlot(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() createDto: CreateGameTimeSlotDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Creating time slot for game: ${gameId}`);
    return this.gamesService.createTimeSlot(gameId, createDto, token);
  }

  @Post(':gameId/time-slots/bulk')
  @ApiOperation({ summary: 'Create bulk time slots' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Bulk time slots created successfully' })
  async bulkCreateTimeSlots(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() bulkDto: BulkCreateGameTimeSlotDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Creating bulk time slots for game: ${gameId}`);
    const results = await this.gamesService.bulkCreateTimeSlots(gameId, bulkDto.timeSlots, token);
    return { success: true, data: results };
  }

  @Post(':gameId/time-slots/generate')
  @ApiOperation({ summary: 'Generate time slots from weekly schedule' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Time slots generated successfully' })
  async generateTimeSlots(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() generateDto: GenerateTimeSlotsDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Generating time slots for game: ${gameId}`);
    return this.gamesService.generateTimeSlots(gameId, generateDto.startDate, generateDto.endDate, token);
  }

  @Patch(':gameId/time-slots/:timeSlotId')
  @ApiOperation({ summary: 'Update time slot' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Time slot updated successfully' })
  async updateTimeSlot(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Param('timeSlotId', ParseIntPipe) timeSlotId: number,
    @Body() updateDto: UpdateGameTimeSlotDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Updating time slot: ${timeSlotId}`);
    return this.gamesService.updateTimeSlot(timeSlotId, updateDto, token);
  }

  @Delete(':gameId/time-slots/:timeSlotId')
  @ApiOperation({ summary: 'Delete time slot' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Time slot deleted successfully' })
  async deleteTimeSlot(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Param('timeSlotId', ParseIntPipe) timeSlotId: number,
    @Headers('authorization') authorization: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Deleting time slot: ${timeSlotId}`);
    return this.gamesService.deleteTimeSlot(timeSlotId, token);
  }

  private extractToken(authorization?: string): string {
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
}
