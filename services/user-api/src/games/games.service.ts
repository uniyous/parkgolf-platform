import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { SearchGamesDto } from './dto/search-games.dto';

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async getGames(clubId?: number, page = 1, limit = 20): Promise<any> {
    this.logger.log('Fetching games');
    const params: any = { page, limit };
    if (clubId) params.clubId = clubId;
    return this.natsClient.send('games.list', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  async searchGames(searchDto: SearchGamesDto): Promise<any> {
    this.logger.log(`Searching games - search: ${searchDto.search || 'all'}`);
    return this.natsClient.send('games.search', searchDto, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getGameById(gameId: number): Promise<any> {
    this.logger.log(`Fetching game: ${gameId}`);
    return this.natsClient.send('games.findById', { gameId }, NATS_TIMEOUTS.QUICK);
  }

  async getGamesByClub(clubId: number): Promise<any> {
    this.logger.log(`Fetching games for club: ${clubId}`);
    return this.natsClient.send('games.findByClub', { clubId }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getTimeSlotsByGame(gameId: number, date?: string): Promise<any> {
    this.logger.log(`Fetching time slots for game: ${gameId}`);
    const params: any = { gameId };
    if (date) params.date = date;
    return this.natsClient.send('gameTimeSlots.findByGame', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getAvailableTimeSlots(gameId: number, date: string): Promise<any> {
    this.logger.log(`Fetching available time slots for game: ${gameId} on ${date}`);
    return this.natsClient.send('gameTimeSlots.available', { gameId, date }, NATS_TIMEOUTS.QUICK);
  }
}
