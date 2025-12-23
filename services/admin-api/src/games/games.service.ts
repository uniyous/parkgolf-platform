import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // ============================================
  // Game Management
  // ============================================
  async getGames(filters: any = {}, adminToken?: string): Promise<any> {
    this.logger.log('Fetching games');
    const params: any = { ...filters };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('games.list', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getGameById(gameId: number, adminToken?: string): Promise<any> {
    this.logger.log(`Fetching game: ${gameId}`);
    const params: any = { gameId };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('games.findById', params, NATS_TIMEOUTS.QUICK);
  }

  async getGamesByClub(clubId: number, adminToken?: string): Promise<any> {
    this.logger.log(`Fetching games for club: ${clubId}`);
    const params: any = { clubId };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('games.findByClub', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  async createGame(gameData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating game');
    return this.natsClient.send('games.create', { data: gameData, token: adminToken });
  }

  async updateGame(gameId: number, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating game: ${gameId}`);
    return this.natsClient.send('games.update', { gameId, data: updateData, token: adminToken });
  }

  async deleteGame(gameId: number, adminToken: string): Promise<any> {
    this.logger.log(`Deleting game: ${gameId}`);
    return this.natsClient.send('games.delete', { gameId, token: adminToken });
  }

  // ============================================
  // Game Weekly Schedule Management
  // ============================================
  async getWeeklySchedules(gameId: number, adminToken?: string): Promise<any> {
    this.logger.log(`Fetching weekly schedules for game: ${gameId}`);
    const params: any = { gameId };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('gameWeeklySchedules.getByGame', params, NATS_TIMEOUTS.QUICK);
  }

  async getWeeklyScheduleById(scheduleId: number, adminToken?: string): Promise<any> {
    this.logger.log(`Fetching weekly schedule: ${scheduleId}`);
    const params: any = { scheduleId };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('gameWeeklySchedules.get', params, NATS_TIMEOUTS.QUICK);
  }

  async createWeeklySchedule(scheduleData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating weekly schedule');
    return this.natsClient.send('gameWeeklySchedules.create', { data: scheduleData, token: adminToken });
  }

  async updateWeeklySchedule(scheduleId: number, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating weekly schedule: ${scheduleId}`);
    return this.natsClient.send('gameWeeklySchedules.update', { scheduleId, data: updateData, token: adminToken });
  }

  async deleteWeeklySchedule(scheduleId: number, adminToken: string): Promise<any> {
    this.logger.log(`Deleting weekly schedule: ${scheduleId}`);
    return this.natsClient.send('gameWeeklySchedules.delete', { scheduleId, token: adminToken });
  }

  // ============================================
  // Game Time Slot Management
  // ============================================
  async getTimeSlots(filters: any = {}, adminToken?: string): Promise<any> {
    this.logger.log('Fetching game time slots');
    const params: any = { ...filters };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('gameTimeSlots.list', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getTimeSlotById(timeSlotId: number, adminToken?: string): Promise<any> {
    this.logger.log(`Fetching game time slot: ${timeSlotId}`);
    const params: any = { timeSlotId };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('gameTimeSlots.findById', params, NATS_TIMEOUTS.QUICK);
  }

  async getTimeSlotsByGame(gameId: number, date?: string, adminToken?: string): Promise<any> {
    this.logger.log(`Fetching time slots for game: ${gameId}`);
    const params: any = { gameId };
    if (date) params.date = date;
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('gameTimeSlots.getByGameAndDate', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  async createTimeSlot(gameId: number, timeSlotData: any, adminToken: string): Promise<any> {
    this.logger.log(`Creating time slot for game: ${gameId}`);
    return this.natsClient.send('gameTimeSlots.create', { data: { ...timeSlotData, gameId }, token: adminToken });
  }

  async bulkCreateTimeSlots(gameId: number, timeSlots: any[], adminToken: string): Promise<any[]> {
    this.logger.log(`Creating bulk time slots for game: ${gameId}`);
    const results = [];
    for (const timeSlotData of timeSlots) {
      try {
        const result = await this.createTimeSlot(gameId, timeSlotData, adminToken);
        results.push(result);
      } catch (error) {
        this.logger.warn(`Failed to create time slot:`, error);
      }
    }
    return results;
  }

  async updateTimeSlot(timeSlotId: number, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating time slot: ${timeSlotId}`);
    return this.natsClient.send('gameTimeSlots.update', { timeSlotId, data: updateData, token: adminToken });
  }

  async deleteTimeSlot(timeSlotId: number, adminToken: string): Promise<any> {
    this.logger.log(`Deleting time slot: ${timeSlotId}`);
    return this.natsClient.send('gameTimeSlots.delete', { timeSlotId, token: adminToken });
  }

  async generateTimeSlots(gameId: number, startDate: string, endDate: string, adminToken: string): Promise<any> {
    this.logger.log(`Generating time slots for game: ${gameId} from ${startDate} to ${endDate}`);
    return this.natsClient.send('gameTimeSlots.generate', {
      data: { gameId, dateFrom: startDate, dateTo: endDate },
      token: adminToken
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getTimeSlotStats(params: any, adminToken?: string): Promise<any> {
    this.logger.log('Fetching time slot statistics');
    const requestParams: any = { ...params };
    if (adminToken) requestParams.token = adminToken;

    try {
      return await this.natsClient.send('gameTimeSlots.stats', requestParams, NATS_TIMEOUTS.ANALYTICS);
    } catch {
      return {
        totalSlots: 0,
        activeSlots: 0,
        fullyBookedSlots: 0,
        totalRevenue: 0,
        averageUtilization: 0,
      };
    }
  }
}
