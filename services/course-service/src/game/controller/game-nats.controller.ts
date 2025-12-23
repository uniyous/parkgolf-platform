import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GameService } from '../service/game.service';
import { GameTimeSlotService } from '../service/game-time-slot.service';
import { GameWeeklyScheduleService } from '../service/game-weekly-schedule.service';
import {
  successResponse,
  errorResponse,
  paginationMeta,
} from '../../common/utils/response.util';

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
  async createGame(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Creating game: ${data.name}`);
      const game = await this.gameService.create(data);
      return successResponse(this.mapGameToResponse(game));
    } catch (error) {
      this.logger.error('NATS: Failed to create game', error);
      return errorResponse('GAME_CREATE_FAILED', error.message);
    }
  }

  @MessagePattern('games.list')
  async getGames(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting games for club ${data.clubId || 'all'}`);
      const { data: games, total, page, limit } = await this.gameService.findAll(data);
      return successResponse(
        { games: games.map(g => this.mapGameToResponse(g)) },
        paginationMeta(total, page, limit)
      );
    } catch (error) {
      this.logger.error('NATS: Failed to get games', error);
      return errorResponse('GAMES_LIST_FAILED', error.message);
    }
  }

  @MessagePattern('games.get')
  async getGame(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting game ${data.gameId}`);
      const game = await this.gameService.findOne(Number(data.gameId));
      return successResponse(this.mapGameToResponse(game));
    } catch (error) {
      this.logger.error('NATS: Failed to get game', error);
      return errorResponse('GAME_GET_FAILED', error.message);
    }
  }

  @MessagePattern('games.getByClub')
  async getGamesByClub(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting games for club ${data.clubId}`);
      const games = await this.gameService.findByClub(Number(data.clubId));
      return successResponse({ games: games.map(g => this.mapGameToResponse(g)) });
    } catch (error) {
      this.logger.error('NATS: Failed to get games by club', error);
      return errorResponse('GAMES_BY_CLUB_FAILED', error.message);
    }
  }

  @MessagePattern('games.update')
  async updateGame(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Updating game ${data.gameId}`);
      const game = await this.gameService.update(Number(data.gameId), data.data);
      return successResponse(this.mapGameToResponse(game));
    } catch (error) {
      this.logger.error('NATS: Failed to update game', error);
      return errorResponse('GAME_UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('games.delete')
  async deleteGame(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Deleting game ${data.gameId}`);
      await this.gameService.remove(Number(data.gameId));
      return successResponse({ deleted: true });
    } catch (error) {
      this.logger.error('NATS: Failed to delete game', error);
      return errorResponse('GAME_DELETE_FAILED', error.message);
    }
  }

  // =====================================================
  // GameTimeSlot
  // =====================================================

  @MessagePattern('gameTimeSlots.create')
  async createGameTimeSlot(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Creating time slot for game ${data.gameId}`);
      const slot = await this.gameTimeSlotService.create(data);
      return successResponse(this.mapTimeSlotToResponse(slot));
    } catch (error) {
      this.logger.error('NATS: Failed to create game time slot', error);
      return errorResponse('GAME_TIMESLOT_CREATE_FAILED', error.message);
    }
  }

  @MessagePattern('gameTimeSlots.list')
  async getGameTimeSlots(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting time slots for game ${data.gameId || 'all'}`);
      const { data: slots, total, page, limit } = await this.gameTimeSlotService.findAll(data);
      return successResponse(
        { timeSlots: slots.map(s => this.mapTimeSlotToResponse(s)) },
        paginationMeta(total, page, limit)
      );
    } catch (error) {
      this.logger.error('NATS: Failed to get game time slots', error);
      return errorResponse('GAME_TIMESLOTS_LIST_FAILED', error.message);
    }
  }

  @MessagePattern('gameTimeSlots.get')
  async getGameTimeSlot(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting time slot ${data.timeSlotId}`);
      const slot = await this.gameTimeSlotService.findOne(Number(data.timeSlotId));
      return successResponse(this.mapTimeSlotToResponse(slot));
    } catch (error) {
      this.logger.error('NATS: Failed to get game time slot', error);
      return errorResponse('GAME_TIMESLOT_GET_FAILED', error.message);
    }
  }

  @MessagePattern('gameTimeSlots.getByGameAndDate')
  async getGameTimeSlotsByGameAndDate(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting time slots for game ${data.gameId} on ${data.date}`);
      const slots = await this.gameTimeSlotService.findByGameAndDate(
        Number(data.gameId),
        data.date
      );
      return successResponse({ timeSlots: slots.map(s => this.mapTimeSlotToResponse(s)) });
    } catch (error) {
      this.logger.error('NATS: Failed to get game time slots by game and date', error);
      return errorResponse('GAME_TIMESLOTS_BY_DATE_FAILED', error.message);
    }
  }

  @MessagePattern('gameTimeSlots.update')
  async updateGameTimeSlot(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Updating time slot ${data.timeSlotId}`);
      const slot = await this.gameTimeSlotService.update(Number(data.timeSlotId), data.data);
      return successResponse(this.mapTimeSlotToResponse(slot));
    } catch (error) {
      this.logger.error('NATS: Failed to update game time slot', error);
      return errorResponse('GAME_TIMESLOT_UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('gameTimeSlots.delete')
  async deleteGameTimeSlot(@Payload() data: any) {
    try {
      this.logger.log(`N Deleting time slot ${data.timeSlotId}`);
      await this.gameTimeSlotService.remove(Number(data.timeSlotId));
      return successResponse({ deleted: true });
    } catch (error) {
      this.logger.error('NATS: Failed to delete game time slot', error);
      return errorResponse('GAME_TIMESLOT_DELETE_FAILED', error.message);
    }
  }

  @MessagePattern('gameTimeSlots.generate')
  async generateGameTimeSlots(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Generating time slots for game ${data.gameId}`);
      const result = await this.gameTimeSlotService.generateTimeSlots(data);
      return successResponse(result);
    } catch (error) {
      this.logger.error('NATS: Failed to generate game time slots', error);
      return errorResponse('GAME_TIMESLOTS_GENERATE_FAILED', error.message);
    }
  }

  @MessagePattern('gameTimeSlots.book')
  async bookGameTimeSlot(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Booking time slot ${data.timeSlotId} for ${data.playerCount} players`);
      const slot = await this.gameTimeSlotService.bookSlot(
        Number(data.timeSlotId),
        Number(data.playerCount)
      );
      return successResponse(this.mapTimeSlotToResponse(slot));
    } catch (error) {
      this.logger.error('NATS: Failed to book game time slot', error);
      return errorResponse('GAME_TIMESLOT_BOOK_FAILED', error.message);
    }
  }

  @MessagePattern('gameTimeSlots.release')
  async releaseGameTimeSlot(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Releasing time slot ${data.timeSlotId} for ${data.playerCount} players`);
      const slot = await this.gameTimeSlotService.releaseSlot(
        Number(data.timeSlotId),
        Number(data.playerCount)
      );
      return successResponse(this.mapTimeSlotToResponse(slot));
    } catch (error) {
      this.logger.error('NATS: Failed to release game time slot', error);
      return errorResponse('GAME_TIMESLOT_RELEASE_FAILED', error.message);
    }
  }

  // =====================================================
  // GameWeeklySchedule
  // =====================================================

  @MessagePattern('gameWeeklySchedules.create')
  async createGameWeeklySchedule(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Creating weekly schedule for game ${data.gameId}`);
      const schedule = await this.gameWeeklyScheduleService.create(data);
      return successResponse(this.mapScheduleToResponse(schedule));
    } catch (error) {
      this.logger.error('NATS: Failed to create game weekly schedule', error);
      return errorResponse('GAME_SCHEDULE_CREATE_FAILED', error.message);
    }
  }

  @MessagePattern('gameWeeklySchedules.list')
  async getGameWeeklySchedules(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting weekly schedules for game ${data.gameId || 'all'}`);
      const schedules = await this.gameWeeklyScheduleService.findAll(data);
      return successResponse({ schedules: schedules.map(s => this.mapScheduleToResponse(s)) });
    } catch (error) {
      this.logger.error('NATS: Failed to get game weekly schedules', error);
      return errorResponse('GAME_SCHEDULES_LIST_FAILED', error.message);
    }
  }

  @MessagePattern('gameWeeklySchedules.getByGame')
  async getGameWeeklySchedulesByGame(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting weekly schedules for game ${data.gameId}`);
      const schedules = await this.gameWeeklyScheduleService.findByGame(Number(data.gameId));
      return successResponse({ schedules: schedules.map(s => this.mapScheduleToResponse(s)) });
    } catch (error) {
      this.logger.error('NATS: Failed to get game weekly schedules by game', error);
      return errorResponse('GAME_SCHEDULES_BY_GAME_FAILED', error.message);
    }
  }

  @MessagePattern('gameWeeklySchedules.update')
  async updateGameWeeklySchedule(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Updating weekly schedule ${data.scheduleId}`);
      const schedule = await this.gameWeeklyScheduleService.update(
        Number(data.scheduleId),
        data.data
      );
      return successResponse(this.mapScheduleToResponse(schedule));
    } catch (error) {
      this.logger.error('NATS: Failed to update game weekly schedule', error);
      return errorResponse('GAME_SCHEDULE_UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('gameWeeklySchedules.delete')
  async deleteGameWeeklySchedule(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Deleting weekly schedule ${data.scheduleId}`);
      await this.gameWeeklyScheduleService.remove(Number(data.scheduleId));
      return successResponse({ deleted: true });
    } catch (error) {
      this.logger.error('NATS: Failed to delete game weekly schedule', error);
      return errorResponse('GAME_SCHEDULE_DELETE_FAILED', error.message);
    }
  }

  @MessagePattern('gameWeeklySchedules.bulkCreate')
  async bulkCreateGameWeeklySchedules(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Bulk creating weekly schedules for game ${data.gameId}`);
      const result = await this.gameWeeklyScheduleService.bulkCreate(data);
      return successResponse(result);
    } catch (error) {
      this.logger.error('NATS: Failed to bulk create game weekly schedules', error);
      return errorResponse('GAME_SCHEDULES_BULK_CREATE_FAILED', error.message);
    }
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
      status: game.status,
      isActive: game.isActive,
      createdAt: game.createdAt?.toISOString(),
      updatedAt: game.updatedAt?.toISOString(),
    };
  }

  private mapTimeSlotToResponse(slot: any) {
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
      maxPlayers: slot.maxPlayers,
      bookedPlayers: slot.bookedPlayers,
      availablePlayers: slot.maxPlayers - slot.bookedPlayers,
      price: Number(slot.price),
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
