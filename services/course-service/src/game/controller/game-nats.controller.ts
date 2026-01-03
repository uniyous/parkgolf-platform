import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GameService } from '../service/game.service';
import { GameTimeSlotService } from '../service/game-time-slot.service';
import { GameWeeklyScheduleService } from '../service/game-weekly-schedule.service';

@Controller()
export class GameNatsController {
  private readonly logger = new Logger(GameNatsController.name);

  constructor(
    private readonly gameService: GameService,
    private readonly gameTimeSlotService: GameTimeSlotService,
    private readonly gameWeeklyScheduleService: GameWeeklyScheduleService,
  ) {}

  // =====================================================
  // Game CRUD
  // =====================================================

  @MessagePattern('games.create')
  async createGame(@Payload() payload: any) {
    const data = payload.data || payload;
    this.logger.log(`NATS: Creating game: ${data.name}`);
    const game = await this.gameService.create(data);
    return { success: true, data: this.mapGameToResponse(game) };
  }

  @MessagePattern('games.list')
  async getGames(@Payload() data: any) {
    this.logger.log(`NATS: Getting games for club ${data.clubId || 'all'}`);
    const { data: games, total, page, limit } = await this.gameService.findAll(data);
    return {
      success: true,
      data: games.map(g => this.mapGameToResponse(g)),
      total,
      page,
      limit,
    };
  }

  @MessagePattern('games.get')
  async getGame(@Payload() data: any) {
    this.logger.log(`NATS: Getting game ${data.gameId}`);
    const game = await this.gameService.findOne(Number(data.gameId));
    return { success: true, data: this.mapGameToResponse(game) };
  }

  @MessagePattern('games.getByClub')
  async getGamesByClub(@Payload() data: any) {
    this.logger.log(`NATS: Getting games for club ${data.clubId}`);
    const games = await this.gameService.findByClub(Number(data.clubId));
    return { success: true, data: games.map(g => this.mapGameToResponse(g)) };
  }

  @MessagePattern('games.update')
  async updateGame(@Payload() data: any) {
    this.logger.log(`NATS: Updating game ${data.gameId}`);
    const game = await this.gameService.update(Number(data.gameId), data.data);
    return { success: true, data: this.mapGameToResponse(game) };
  }

  @MessagePattern('games.delete')
  async deleteGame(@Payload() data: any) {
    this.logger.log(`NATS: Deleting game ${data.gameId}`);
    await this.gameService.remove(Number(data.gameId));
    return { success: true, data: { deleted: true } };
  }

  @MessagePattern('games.search')
  async searchGames(@Payload() data: any) {
    this.logger.log(`NATS: Searching games - search: ${data.search || 'all'}, date: ${data.date || 'none'}`);
    const { data: games, total, page, limit } = await this.gameService.searchGames(data);
    return {
      success: true,
      data: games.map(g => this.mapGameToResponse(g)),
      total,
      page,
      limit,
    };
  }

  // =====================================================
  // GameTimeSlot
  // =====================================================

  @MessagePattern('gameTimeSlots.create')
  async createGameTimeSlot(@Payload() payload: any) {
    const data = payload.data || payload;
    this.logger.log(`NATS: Creating time slot for game ${data.gameId}`);
    const slot = await this.gameTimeSlotService.create(data);
    return { success: true, data: this.mapTimeSlotToResponse(slot) };
  }

  @MessagePattern('gameTimeSlots.list')
  async getGameTimeSlots(@Payload() data: any) {
    this.logger.log(`NATS: Getting time slots for game ${data.gameId || 'all'}`);
    const { data: slots, total, page, limit } = await this.gameTimeSlotService.findAll(data);
    return {
      success: true,
      data: slots.map(s => this.mapTimeSlotToResponse(s)),
      total,
      page,
      limit,
    };
  }

  @MessagePattern('gameTimeSlots.get')
  async getGameTimeSlot(@Payload() data: any) {
    this.logger.log(`NATS: Getting time slot ${data.timeSlotId}`);
    const slot = await this.gameTimeSlotService.findOne(Number(data.timeSlotId));
    return { success: true, data: this.mapTimeSlotToResponse(slot) };
  }

  @MessagePattern('gameTimeSlots.getByGameAndDate')
  async getGameTimeSlotsByGameAndDate(@Payload() data: any) {
    this.logger.log(`NATS: Getting time slots for game ${data.gameId} on ${data.date}`);
    const slots = await this.gameTimeSlotService.findByGameAndDate(
      Number(data.gameId),
      data.date
    );
    return { success: true, data: slots.map(s => this.mapTimeSlotToResponse(s)) };
  }

  @MessagePattern('gameTimeSlots.available')
  async getAvailableGameTimeSlots(@Payload() data: any) {
    this.logger.log(`NATS: Getting available time slots for game ${data.gameId} on ${data.date}`);
    const slots = await this.gameTimeSlotService.findByGameAndDate(
      Number(data.gameId),
      data.date
    );

    // Filter for available slots and map to response format
    const availableSlots = slots
      .filter(slot => slot.bookedPlayers < slot.maxPlayers)
      .map(slot => ({
        id: slot.id,
        gameId: slot.gameId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        dayOfWeek: new Date(slot.date).getDay(),
        isActive: slot.isActive,
        maxCapacity: slot.maxPlayers,
        currentBookings: slot.bookedPlayers,
        available: slot.bookedPlayers < slot.maxPlayers,
        price: Number(slot.price),
        isPremium: slot.isPremium,
      }));

    return { success: true, data: availableSlots };
  }

  @MessagePattern('gameTimeSlots.findByGame')
  async findGameTimeSlotsByGame(@Payload() data: any) {
    this.logger.log(`NATS: Finding time slots for game ${data.gameId}`);
    const slots = await this.gameTimeSlotService.findByGameAndDate(
      Number(data.gameId),
      data.date || new Date().toISOString().split('T')[0]
    );
    return { success: true, data: slots.map(s => this.mapTimeSlotToResponse(s)) };
  }

  @MessagePattern('gameTimeSlots.update')
  async updateGameTimeSlot(@Payload() data: any) {
    this.logger.log(`NATS: Updating time slot ${data.timeSlotId}`);
    const slot = await this.gameTimeSlotService.update(Number(data.timeSlotId), data.data);
    return { success: true, data: this.mapTimeSlotToResponse(slot) };
  }

  @MessagePattern('gameTimeSlots.delete')
  async deleteGameTimeSlot(@Payload() data: any) {
    this.logger.log(`NATS: Deleting time slot ${data.timeSlotId}`);
    await this.gameTimeSlotService.remove(Number(data.timeSlotId));
    return { success: true, data: { deleted: true } };
  }

  @MessagePattern('gameTimeSlots.generate')
  async generateGameTimeSlots(@Payload() payload: any) {
    const data = payload.data || payload;
    this.logger.log(`NATS: Generating time slots for game ${data.gameId}`);
    const result = await this.gameTimeSlotService.generateTimeSlots(data);
    return { success: true, data: result };
  }

  @MessagePattern('gameTimeSlots.book')
  async bookGameTimeSlot(@Payload() data: any) {
    this.logger.log(`NATS: Booking time slot ${data.timeSlotId} for ${data.playerCount} players`);
    const slot = await this.gameTimeSlotService.bookSlot(
      Number(data.timeSlotId),
      Number(data.playerCount)
    );
    return { success: true, data: this.mapTimeSlotToResponse(slot) };
  }

  @MessagePattern('gameTimeSlots.release')
  async releaseGameTimeSlot(@Payload() data: any) {
    this.logger.log(`NATS: Releasing time slot ${data.timeSlotId} for ${data.playerCount} players`);
    const slot = await this.gameTimeSlotService.releaseSlot(
      Number(data.timeSlotId),
      Number(data.playerCount)
    );
    return { success: true, data: this.mapTimeSlotToResponse(slot) };
  }

  @MessagePattern('gameTimeSlots.stats')
  async getGameTimeSlotStats(@Payload() data: any) {
    this.logger.log(`NATS: Getting time slot stats for game ${data.gameId || 'all'}`);
    const stats = await this.gameTimeSlotService.getStats({
      gameId: data.gameId ? Number(data.gameId) : undefined,
      startDate: data.startDate,
      endDate: data.endDate,
    });
    return { success: true, data: stats };
  }

  // =====================================================
  // GameWeeklySchedule
  // =====================================================

  @MessagePattern('gameWeeklySchedules.create')
  async createGameWeeklySchedule(@Payload() payload: any) {
    const data = payload.data || payload;
    this.logger.log(`NATS: Creating weekly schedule for game ${data.gameId}`);
    const schedule = await this.gameWeeklyScheduleService.create(data);
    return { success: true, data: this.mapScheduleToResponse(schedule) };
  }

  @MessagePattern('gameWeeklySchedules.list')
  async getGameWeeklySchedules(@Payload() data: any) {
    this.logger.log(`NATS: Getting weekly schedules for game ${data.gameId || 'all'}`);
    const schedules = await this.gameWeeklyScheduleService.findAll(data);
    return { success: true, data: schedules.map(s => this.mapScheduleToResponse(s)) };
  }

  @MessagePattern('gameWeeklySchedules.get')
  async getGameWeeklySchedule(@Payload() data: any) {
    this.logger.log(`NATS: Getting weekly schedule ${data.scheduleId}`);
    const schedule = await this.gameWeeklyScheduleService.findOne(Number(data.scheduleId));
    return { success: true, data: this.mapScheduleToResponse(schedule) };
  }

  @MessagePattern('gameWeeklySchedules.getByGame')
  async getGameWeeklySchedulesByGame(@Payload() data: any) {
    this.logger.log(`NATS: Getting weekly schedules for game ${data.gameId}`);
    const schedules = await this.gameWeeklyScheduleService.findByGame(Number(data.gameId));
    return { success: true, data: schedules.map(s => this.mapScheduleToResponse(s)) };
  }

  @MessagePattern('gameWeeklySchedules.update')
  async updateGameWeeklySchedule(@Payload() data: any) {
    this.logger.log(`NATS: Updating weekly schedule ${data.scheduleId}`);
    const schedule = await this.gameWeeklyScheduleService.update(
      Number(data.scheduleId),
      data.data
    );
    return { success: true, data: this.mapScheduleToResponse(schedule) };
  }

  @MessagePattern('gameWeeklySchedules.delete')
  async deleteGameWeeklySchedule(@Payload() data: any) {
    this.logger.log(`NATS: Deleting weekly schedule ${data.scheduleId}`);
    await this.gameWeeklyScheduleService.remove(Number(data.scheduleId));
    return { success: true, data: { deleted: true } };
  }

  @MessagePattern('gameWeeklySchedules.bulkCreate')
  async bulkCreateGameWeeklySchedules(@Payload() payload: any) {
    const data = payload.data || payload;
    this.logger.log(`NATS: Bulk creating weekly schedules for game ${data.gameId}`);
    const result = await this.gameWeeklyScheduleService.bulkCreate(data);
    return { success: true, data: result };
  }

  // =====================================================
  // Response Mappers
  // =====================================================

  private mapGameToResponse(game: any) {
    return {
      id: game.id,
      name: game.name,
      code: game.code,
      description: game.description,
      frontNineCourseId: game.frontNineCourseId,
      frontNineCourseName: game.frontNineCourse?.name,
      backNineCourseId: game.backNineCourseId,
      backNineCourseName: game.backNineCourse?.name,
      totalHoles: game.totalHoles,
      estimatedDuration: game.estimatedDuration,
      breakDuration: game.breakDuration,
      maxPlayers: game.maxPlayers,
      basePrice: Number(game.basePrice),
      weekendPrice: game.weekendPrice ? Number(game.weekendPrice) : null,
      holidayPrice: game.holidayPrice ? Number(game.holidayPrice) : null,
      clubId: game.clubId,
      clubName: game.club?.name,
      clubLocation: game.club?.location,
      status: game.status,
      isActive: game.isActive,
      createdAt: game.createdAt?.toISOString(),
      updatedAt: game.updatedAt?.toISOString(),
    };
  }

  private mapTimeSlotToResponse(slot: any) {
    const maxPlayers = slot.maxPlayers ?? 0;
    const bookedPlayers = slot.bookedPlayers ?? 0;

    return {
      id: slot.id,
      gameId: slot.gameId,
      gameName: slot.game?.name,
      gameCode: slot.game?.code,
      frontNineCourseName: slot.game?.frontNineCourse?.name,
      backNineCourseName: slot.game?.backNineCourse?.name,
      clubName: slot.game?.club?.name,
      date: slot.date instanceof Date ? slot.date.toISOString().split('T')[0] : slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxPlayers,
      bookedPlayers,
      availablePlayers: maxPlayers - bookedPlayers,
      // 프론트엔드 호환용 별칭
      maxBookings: maxPlayers,
      currentBookings: bookedPlayers,
      price: Number(slot.price) || 0,
      isPremium: slot.isPremium,
      status: slot.status,
      isActive: slot.isActive,
      createdAt: slot.createdAt?.toISOString(),
      updatedAt: slot.updatedAt?.toISOString(),
    };
  }

  private mapScheduleToResponse(schedule: any) {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return {
      id: schedule.id,
      gameId: schedule.gameId,
      gameName: schedule.game?.name,
      dayOfWeek: schedule.dayOfWeek,
      dayName: dayNames[schedule.dayOfWeek],
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      interval: schedule.interval,
      isActive: schedule.isActive,
      createdAt: schedule.createdAt?.toISOString(),
      updatedAt: schedule.updatedAt?.toISOString(),
    };
  }
}
