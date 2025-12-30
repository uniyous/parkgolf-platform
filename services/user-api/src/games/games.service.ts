import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { NatsSuccessResponse } from '../common/types';
import { SearchGamesDto } from './dto/search-games.dto';

/** Game 응답 DTO - course-service의 GameResponseDto와 일치 */
export interface GameResponseDto {
  id: number;
  name: string;
  code: string;
  description?: string;
  frontNineCourseId: number;
  frontNineCourseName: string;
  backNineCourseId: number;
  backNineCourseName: string;
  totalHoles: number;
  estimatedDuration: number;
  breakDuration: number;
  maxPlayers: number;
  basePrice: number;
  weekendPrice?: number;
  holidayPrice?: number;
  clubId: number;
  clubName: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Game 목록 응답 타입 */
export interface GameListResponse {
  data: GameResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** TimeSlot 응답 DTO */
export interface GameTimeSlotResponseDto {
  id: number;
  gameId: number;
  gameName: string;
  gameCode: string;
  frontNineCourseName: string;
  backNineCourseName: string;
  clubId?: number;
  clubName?: string;
  date: string;
  startTime: string;
  endTime: string;
  maxPlayers: number;
  bookedPlayers: number;
  availablePlayers: number;
  isAvailable: boolean;
  price: number;
  isPremium: boolean;
  status: string;
}

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async getGames(clubId?: number, page = 1, limit = 20): Promise<NatsSuccessResponse<GameListResponse>> {
    this.logger.log('Fetching games');
    const params: { page: number; limit: number; clubId?: number } = { page, limit };
    if (clubId) params.clubId = clubId;
    return this.natsClient.send('games.list', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  async searchGames(searchDto: SearchGamesDto): Promise<NatsSuccessResponse<GameListResponse>> {
    this.logger.log(`Searching games - search: ${searchDto.search || 'all'}`);
    return this.natsClient.send('games.search', searchDto, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getGameById(gameId: number): Promise<NatsSuccessResponse<GameResponseDto>> {
    this.logger.log(`Fetching game: ${gameId}`);
    return this.natsClient.send('games.findById', { gameId }, NATS_TIMEOUTS.QUICK);
  }

  async getGamesByClub(clubId: number): Promise<NatsSuccessResponse<GameResponseDto[]>> {
    this.logger.log(`Fetching games for club: ${clubId}`);
    return this.natsClient.send('games.findByClub', { clubId }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getTimeSlotsByGame(gameId: number, date?: string): Promise<NatsSuccessResponse<GameTimeSlotResponseDto[]>> {
    this.logger.log(`Fetching time slots for game: ${gameId}`);
    const params: { gameId: number; date?: string } = { gameId };
    if (date) params.date = date;
    return this.natsClient.send('gameTimeSlots.findByGame', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getAvailableTimeSlots(gameId: number, date: string): Promise<NatsSuccessResponse<GameTimeSlotResponseDto[]>> {
    this.logger.log(`Fetching available time slots for game: ${gameId} on ${date}`);
    return this.natsClient.send('gameTimeSlots.available', { gameId, date }, NATS_TIMEOUTS.QUICK);
  }
}
