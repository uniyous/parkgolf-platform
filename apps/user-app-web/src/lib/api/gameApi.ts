import { apiClient } from './client';
import { extractList, extractSingle, type BffResponse } from './bffParser';

/**
 * Game 응답 DTO - course-service의 GameResponseDto와 일치
 */
export interface Game {
  id: number;
  name: string;
  code: string;
  description?: string;
  // Course references
  frontNineCourseId: number;
  frontNineCourseName: string;
  backNineCourseId: number;
  backNineCourseName: string;
  totalHoles: number;
  // Time & Players
  estimatedDuration: number;
  breakDuration: number;
  maxPlayers: number;
  // Pricing
  basePrice: number;
  weekendPrice?: number;
  holidayPrice?: number;
  // Club info
  clubId: number;
  clubName: string;
  clubLocation?: string;
  // Status
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Legacy/convenience fields
  duration?: number;          // estimatedDuration alias
  pricePerPerson?: number;    // basePrice alias
  courses?: GameCourse[];     // deprecated, use frontNine/backNine instead
  // Time slots included in search response (when date is provided)
  timeSlots?: GameTimeSlot[];
}

export interface GameSearchParams {
  search?: string;
  date?: string;  // YYYY-MM-DD format - 해당 날짜에 예약 가능한 타임슬롯이 있는 게임만 필터링
  clubId?: number;
  minPrice?: number;
  maxPrice?: number;
  minPlayers?: number;
  sortBy?: 'price' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface GameCourse {
  id: number;
  courseId: number;
  courseName: string;
  sequence: number;
}

/**
 * GameTimeSlot 응답 DTO - course-service의 GameTimeSlotResponseDto와 일치
 */
export interface GameTimeSlot {
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
  // Legacy fields
  dayOfWeek?: number;
  isActive?: boolean;
  maxCapacity?: number;       // maxPlayers alias
  currentBookings?: number;   // bookedPlayers alias
  available?: boolean;        // isAvailable alias
}

export interface GamesResponse {
  data: Game[];
  total: number;
  page: number;
  limit: number;
}

// 백엔드 실제 응답 구조: { success, data, total, page, limit, totalPages }
export interface SearchGamesResponse {
  success: boolean;
  data: Game[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const gameApi = {
  /**
   * 게임 목록 조회
   */
  getGames: async (clubId?: number, page = 1, limit = 20): Promise<GamesResponse> => {
    const params: Record<string, string | number | undefined> = { page, limit };
    if (clubId) params.clubId = clubId;

    const response = await apiClient.get<BffResponse<Game[]>>('/api/user/games', params);
    const games = extractList<Game>(response.data);
    return {
      data: games,
      total: (response.data as GamesResponse).total || games.length,
      page: (response.data as GamesResponse).page || page,
      limit: (response.data as GamesResponse).limit || limit,
    };
  },

  /**
   * 게임 검색
   */
  searchGames: async (params: GameSearchParams): Promise<SearchGamesResponse> => {
    const queryParams: Record<string, string | number | undefined> = {};
    if (params.search) queryParams.search = params.search;
    if (params.date) queryParams.date = params.date;
    if (params.clubId) queryParams.clubId = params.clubId;
    if (params.minPrice !== undefined) queryParams.minPrice = params.minPrice;
    if (params.maxPrice !== undefined) queryParams.maxPrice = params.maxPrice;
    if (params.minPlayers !== undefined) queryParams.minPlayers = params.minPlayers;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;

    const response = await apiClient.get<SearchGamesResponse>('/api/user/games/search', queryParams);
    return response.data;
  },

  /**
   * 클럽별 게임 목록 조회
   */
  getGamesByClub: async (clubId: number): Promise<Game[]> => {
    const response = await apiClient.get<BffResponse<Game[]>>(`/api/user/games/club/${clubId}`);
    return extractList<Game>(response.data);
  },

  /**
   * 게임 상세 조회
   */
  getGameById: async (gameId: number): Promise<Game> => {
    const response = await apiClient.get<BffResponse<Game>>(`/api/user/games/${gameId}`);
    const game = extractSingle<Game>(response.data);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }
    return game;
  },

  /**
   * 타임슬롯 조회
   */
  getTimeSlots: async (gameId: number, date?: string): Promise<GameTimeSlot[]> => {
    const params: Record<string, string | undefined> = {};
    if (date) params.date = date;

    const response = await apiClient.get<BffResponse<GameTimeSlot[]>>(
      `/api/user/games/${gameId}/time-slots`,
      params
    );
    return extractList<GameTimeSlot>(response.data);
  },

  /**
   * 예약 가능한 타임슬롯 조회
   */
  getAvailableTimeSlots: async (gameId: number, date: string): Promise<GameTimeSlot[]> => {
    const response = await apiClient.get<BffResponse<GameTimeSlot[]>>(
      `/api/user/games/${gameId}/time-slots/available`,
      { date }
    );
    return extractList<GameTimeSlot>(response.data);
  },
};
