import { apiClient } from './client';

export interface Game {
  id: number;
  name: string;
  clubId: number;
  clubName: string;
  clubLocation?: string;
  description?: string;
  duration: number;
  maxPlayers: number;
  pricePerPerson: number;
  basePrice?: number;
  weekendPrice?: number;
  holidayPrice?: number;
  isActive: boolean;
  courses: GameCourse[];
}

export interface GameSearchParams {
  search?: string;
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

export interface GameTimeSlot {
  id: number;
  gameId: number;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  isActive: boolean;
  maxCapacity: number;
  currentBookings: number;
  available: boolean;
  price: number;
  isPremium?: boolean;
}

export interface GamesResponse {
  data: Game[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchGamesResponse {
  success: boolean;
  data: {
    games: Game[];
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export const gameApi = {
  getGames: async (clubId?: number, page = 1, limit = 20) => {
    const params: Record<string, string | number | undefined> = { page, limit };
    if (clubId) params.clubId = clubId;

    const response = await apiClient.get<GamesResponse>('/api/user/games', params);
    return response.data;
  },

  searchGames: async (params: GameSearchParams) => {
    const queryParams: Record<string, string | number | undefined> = {};
    if (params.search) queryParams.search = params.search;
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

  getGamesByClub: async (clubId: number) => {
    const response = await apiClient.get<Game[]>(`/api/user/games/club/${clubId}`);
    return response.data;
  },

  getGameById: async (gameId: number) => {
    const response = await apiClient.get<Game>(`/api/user/games/${gameId}`);
    return response.data;
  },

  getTimeSlots: async (gameId: number, date?: string) => {
    const params: Record<string, string | undefined> = {};
    if (date) params.date = date;

    const response = await apiClient.get<GameTimeSlot[]>(
      `/api/user/games/${gameId}/time-slots`,
      params
    );
    return response.data;
  },

  getAvailableTimeSlots: async (gameId: number, date: string): Promise<GameTimeSlot[]> => {
    const response = await apiClient.get<{ success: boolean; data: GameTimeSlot[] } | GameTimeSlot[]>(
      `/api/user/games/${gameId}/time-slots/available`,
      { date }
    );
    // Handle wrapped response format { success: true, data: [...] }
    const data = response.data;
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
      return data.data;
    }
    return Array.isArray(data) ? data : [];
  },
};
