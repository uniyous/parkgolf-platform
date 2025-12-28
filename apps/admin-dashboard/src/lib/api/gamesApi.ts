/**
 * Games API - BFF 통합 클라이언트
 *
 * BFF: /api/admin/games
 * - Games (게임/라운드)
 * - Weekly Schedules (주간 스케줄)
 * - Time Slots (타임슬롯)
 */

import { apiClient } from './client';

// ============================================
// Types
// ============================================

export interface Game {
  id: number;
  clubId: number;
  clubName?: string;
  name: string;
  code?: string;
  description?: string;
  // Course references
  courseIds?: number[];
  frontNineCourseId?: number;
  frontNineCourseName?: string;
  backNineCourseId?: number;
  backNineCourseName?: string;
  totalHoles?: number;
  // Time & Players
  maxPlayers: number;
  duration: number; // 분 (estimatedDuration에서 매핑)
  estimatedDuration?: number;
  breakDuration?: number;
  // Pricing
  price: number; // basePrice에서 매핑
  basePrice?: number;
  weekendPrice?: number;
  holidayPrice?: number;
  // Status
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameDto {
  clubId: number;
  name: string;
  description?: string;
  courseIds: number[];
  maxPlayers: number;
  duration: number;
  price: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

export interface UpdateGameDto {
  name?: string;
  description?: string;
  courseIds?: number[];
  maxPlayers?: number;
  duration?: number;
  price?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

export interface GameFilter {
  clubId?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export interface GameWeeklySchedule {
  id: number;
  gameId: number;
  gameName?: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  dayName?: string; // 요일 이름
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  interval?: number; // 분
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameWeeklyScheduleDto {
  gameId?: number; // URL 파라미터에서 제공되므로 optional
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  interval?: number;
  isActive?: boolean;
}

export interface UpdateGameWeeklyScheduleDto {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  interval?: number;
  isActive?: boolean;
}

export interface GameTimeSlot {
  id: number;
  gameId: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  maxBookings: number;
  currentBookings: number;
  status: 'AVAILABLE' | 'FULLY_BOOKED' | 'CLOSED' | 'MAINTENANCE';
  price?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameTimeSlotDto {
  date: string;
  startTime: string;
  endTime: string;
  maxBookings: number;
  status?: 'AVAILABLE' | 'FULLY_BOOKED' | 'CLOSED' | 'MAINTENANCE';
  price?: number;
}

export interface UpdateGameTimeSlotDto {
  date?: string;
  startTime?: string;
  endTime?: string;
  maxBookings?: number;
  status?: 'AVAILABLE' | 'FULLY_BOOKED' | 'CLOSED' | 'MAINTENANCE';
  price?: number;
}

export interface GameTimeSlotFilter {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Helper: Normalize Game Response
// ============================================

function normalizeGame(game: any): Game {
  if (!game) return game;
  return {
    ...game,
    // Map alternative field names
    duration: game.duration ?? game.estimatedDuration ?? 0,
    price: game.price ?? game.basePrice ?? 0,
    courseIds: game.courseIds ?? [game.frontNineCourseId, game.backNineCourseId].filter(Boolean),
  };
}

// ============================================
// Games API
// ============================================

export const gamesApi = {
  // ============================================
  // Game Management
  // ============================================

  /**
   * 게임 목록 조회
   */
  async getGames(filters: GameFilter = {}): Promise<PaginatedResponse<Game>> {
    const response = await apiClient.get<any>('/admin/games', filters);

    // API 응답 구조 처리 (courseApi.getClubs 패턴 적용)
    const responseData = response.data;

    let games: Game[] = [];
    let total = 0;
    let page = 1;
    let limit = 20;
    let totalPages = 1;

    if (responseData) {
      // { success: true, data: { games: [...] }, total, page, limit, totalPages } 형식
      if (responseData.data?.games) {
        games = responseData.data.games;
        total = responseData.total || games.length;
        page = responseData.page || 1;
        limit = responseData.limit || 20;
        totalPages = responseData.totalPages || 1;
      }
      // { success: true, data: [...] } 형식
      else if (Array.isArray(responseData.data)) {
        games = responseData.data;
        total = responseData.total || games.length;
        page = responseData.page || 1;
        limit = responseData.limit || 20;
        totalPages = responseData.totalPages || 1;
      }
      // { data: [...], total, page, ... } 형식 (직접 응답)
      else if (Array.isArray(responseData)) {
        games = responseData;
        total = games.length;
      }
      // 기타 형식
      else {
        games = responseData.games || responseData.data || [];
        total = responseData.total || games.length;
        page = responseData.page || 1;
        limit = responseData.limit || 20;
        totalPages = responseData.totalPages || 1;
      }
    }

    return {
      data: games.map(normalizeGame),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  /**
   * 골프장별 게임 목록
   */
  async getGamesByClub(clubId: number): Promise<Game[]> {
    const response = await apiClient.get<any>(`/admin/games/club/${clubId}`);
    const responseData = response.data;

    let games: any[] = [];

    if (Array.isArray(responseData)) {
      games = responseData;
    } else if (responseData?.data?.games) {
      games = responseData.data.games;
    } else if (Array.isArray(responseData?.data)) {
      games = responseData.data;
    } else {
      games = responseData?.games || [];
    }

    return games.map(normalizeGame);
  },

  /**
   * 게임 상세 조회
   */
  async getGameById(gameId: number): Promise<Game> {
    const response = await apiClient.get<any>(`/admin/games/${gameId}`);
    const responseData = response.data;

    console.log('[gamesApi.getGameById] Response:', responseData);

    if (!responseData) {
      throw new Error('Game not found');
    }

    let game: any = null;

    // { success: true, data: { game: {...} } } 형식
    if (responseData.data?.game) {
      game = responseData.data.game;
    }
    // { success: true, data: {...} } 형식 (data가 객체)
    else if (responseData.data && typeof responseData.data === 'object' && !Array.isArray(responseData.data)) {
      game = responseData.data;
    }
    // { success: true, game: {...} } 형식
    else if (responseData.game) {
      game = responseData.game;
    }
    // 직접 game 객체
    else if (responseData.id && responseData.name) {
      game = responseData;
    }

    if (!game) {
      throw new Error('Invalid game response structure');
    }

    return normalizeGame(game);
  },

  /**
   * 게임 생성
   */
  async createGame(data: CreateGameDto): Promise<Game> {
    const response = await apiClient.post<{ success: boolean; data: Game }>('/admin/games', data);
    return response.data?.data;
  },

  /**
   * 게임 수정
   */
  async updateGame(gameId: number, data: UpdateGameDto): Promise<Game> {
    const response = await apiClient.patch<{ success: boolean; data: Game }>(`/admin/games/${gameId}`, data);
    return response.data?.data;
  },

  /**
   * 게임 삭제
   */
  async deleteGame(gameId: number): Promise<void> {
    await apiClient.delete(`/admin/games/${gameId}`);
  },

  // ============================================
  // Weekly Schedule Management
  // ============================================

  /**
   * 게임의 주간 스케줄 조회
   */
  async getWeeklySchedules(gameId: number): Promise<GameWeeklySchedule[]> {
    const response = await apiClient.get<any>(`/admin/games/${gameId}/weekly-schedules`);
    const responseData = response.data;

    console.log('[gamesApi.getWeeklySchedules] Response:', responseData);

    if (Array.isArray(responseData)) {
      return responseData;
    }
    // { success: true, data: { schedules: [...] } } 형식
    if (responseData?.data?.schedules && Array.isArray(responseData.data.schedules)) {
      return responseData.data.schedules;
    }
    // { success: true, data: [...] } 형식
    if (Array.isArray(responseData?.data)) {
      return responseData.data;
    }
    // { schedules: [...] } 또는 { weeklySchedules: [...] } 형식
    return responseData?.schedules || responseData?.weeklySchedules || [];
  },

  /**
   * 주간 스케줄 상세 조회
   */
  async getWeeklyScheduleById(gameId: number, scheduleId: number): Promise<GameWeeklySchedule> {
    const response = await apiClient.get<{ success: boolean; data: GameWeeklySchedule }>(
      `/admin/games/${gameId}/weekly-schedules/${scheduleId}`
    );
    return response.data?.data;
  },

  /**
   * 주간 스케줄 생성
   */
  async createWeeklySchedule(gameId: number, data: CreateGameWeeklyScheduleDto): Promise<GameWeeklySchedule> {
    const response = await apiClient.post<{ success: boolean; data: GameWeeklySchedule }>(
      `/admin/games/${gameId}/weekly-schedules`,
      data
    );
    return response.data?.data;
  },

  /**
   * 주간 스케줄 수정
   */
  async updateWeeklySchedule(
    gameId: number,
    scheduleId: number,
    data: UpdateGameWeeklyScheduleDto
  ): Promise<GameWeeklySchedule> {
    const response = await apiClient.patch<{ success: boolean; data: GameWeeklySchedule }>(
      `/admin/games/${gameId}/weekly-schedules/${scheduleId}`,
      data
    );
    return response.data?.data;
  },

  /**
   * 주간 스케줄 삭제
   */
  async deleteWeeklySchedule(gameId: number, scheduleId: number): Promise<void> {
    await apiClient.delete(`/admin/games/${gameId}/weekly-schedules/${scheduleId}`);
  },

  // ============================================
  // Time Slot Management
  // ============================================

  /**
   * 게임의 타임슬롯 조회
   */
  async getTimeSlots(gameId: number, filter?: GameTimeSlotFilter): Promise<PaginatedResponse<GameTimeSlot>> {
    console.log('[gamesApi.getTimeSlots] gameId:', gameId, 'filter:', filter);
    const params: Record<string, unknown> = {};
    if (filter?.date) params.date = filter.date;
    if (filter?.startDate) params.startDate = filter.startDate;
    if (filter?.endDate) params.endDate = filter.endDate;
    if (filter?.status) params.status = filter.status;
    if (filter?.page) params.page = filter.page;
    if (filter?.limit) params.limit = filter.limit;

    console.log('[gamesApi.getTimeSlots] API params:', params);
    const response = await apiClient.get<any>(`/admin/games/${gameId}/time-slots`, params);
    console.log('[gamesApi.getTimeSlots] API response:', response.data);
    const responseData = response.data;

    let timeSlots: GameTimeSlot[] = [];
    let total = 0;
    let page = 1;
    let totalPages = 1;

    if (responseData) {
      // { success: true, data: { timeSlots: [...], ... } } 형식
      if (responseData.data?.timeSlots) {
        timeSlots = responseData.data.timeSlots;
        total = responseData.data.totalCount || timeSlots.length;
        page = responseData.data.page || 1;
        totalPages = responseData.data.totalPages || 1;
      }
      // { timeSlots: [...], totalCount, page, totalPages } 형식
      else if (responseData.timeSlots) {
        timeSlots = responseData.timeSlots;
        total = responseData.totalCount || timeSlots.length;
        page = responseData.page || 1;
        totalPages = responseData.totalPages || 1;
      }
      // { data: [...] } 형식
      else if (Array.isArray(responseData.data)) {
        timeSlots = responseData.data;
        total = responseData.total || timeSlots.length;
        page = responseData.page || 1;
        totalPages = responseData.totalPages || 1;
      }
      // 배열 직접 반환
      else if (Array.isArray(responseData)) {
        timeSlots = responseData;
        total = timeSlots.length;
      }
    }

    return {
      data: timeSlots,
      pagination: {
        page,
        limit: filter?.limit || 20,
        total,
        totalPages,
      },
    };
  },

  /**
   * 타임슬롯 상세 조회
   */
  async getTimeSlotById(gameId: number, timeSlotId: number): Promise<GameTimeSlot> {
    const response = await apiClient.get<{ success: boolean; data: GameTimeSlot }>(
      `/admin/games/${gameId}/time-slots/${timeSlotId}`
    );
    return response.data?.data;
  },

  /**
   * 타임슬롯 생성
   */
  async createTimeSlot(gameId: number, data: CreateGameTimeSlotDto): Promise<GameTimeSlot> {
    const response = await apiClient.post<{ success: boolean; data: GameTimeSlot }>(
      `/admin/games/${gameId}/time-slots`,
      data
    );
    return response.data?.data;
  },

  /**
   * 타임슬롯 일괄 생성
   */
  async bulkCreateTimeSlots(gameId: number, timeSlots: CreateGameTimeSlotDto[]): Promise<GameTimeSlot[]> {
    const response = await apiClient.post<{ success: boolean; data: GameTimeSlot[] }>(
      `/admin/games/${gameId}/time-slots/bulk`,
      { timeSlots }
    );
    return response.data?.data || [];
  },

  /**
   * 주간 스케줄 기반 타임슬롯 자동 생성
   */
  async generateTimeSlots(gameId: number, startDate: string, endDate: string): Promise<GameTimeSlot[]> {
    const response = await apiClient.post<{ success: boolean; data: GameTimeSlot[] }>(
      `/admin/games/${gameId}/time-slots/generate`,
      { startDate, endDate }
    );
    return response.data?.data || [];
  },

  /**
   * 타임슬롯 수정
   */
  async updateTimeSlot(gameId: number, timeSlotId: number, data: UpdateGameTimeSlotDto): Promise<GameTimeSlot> {
    const response = await apiClient.patch<{ success: boolean; data: GameTimeSlot }>(
      `/admin/games/${gameId}/time-slots/${timeSlotId}`,
      data
    );
    return response.data?.data;
  },

  /**
   * 타임슬롯 삭제
   */
  async deleteTimeSlot(gameId: number, timeSlotId: number): Promise<void> {
    await apiClient.delete(`/admin/games/${gameId}/time-slots/${timeSlotId}`);
  },

  // ============================================
  // Statistics
  // ============================================

  /**
   * 타임슬롯 통계
   */
  async getTimeSlotStats(filter?: GameTimeSlotFilter): Promise<{
    totalSlots: number;
    availableSlots: number;
    bookedSlots: number;
    utilizationRate: number;
  }> {
    const response = await apiClient.get<any>('/admin/games/time-slots/stats', filter || {});
    const responseData = response.data;

    // 기본값
    const defaultStats = {
      totalSlots: 0,
      availableSlots: 0,
      bookedSlots: 0,
      utilizationRate: 0,
    };

    if (!responseData) return defaultStats;

    // { success: true, data: {...} } 형식
    if (responseData.data && typeof responseData.data === 'object') {
      return { ...defaultStats, ...responseData.data };
    }

    // 직접 stats 객체
    return { ...defaultStats, ...responseData };
  },
} as const;

// ============================================
// Legacy Exports (기존 코드 호환)
// ============================================

// courseApi의 time slot 관련 함수들은 gamesApi로 이동
// 기존 코드에서 courseApi.getTimeSlots 등을 사용하는 경우를 위한 adapter

export const timeSlotAdapter = {
  /**
   * courseId를 gameId로 매핑하여 타임슬롯 조회
   * (기존 courseApi.getTimeSlots 호환)
   */
  async getTimeSlots(
    courseId: number,
    filter?: { dateFrom?: string; dateTo?: string; page?: number; limit?: number }
  ) {
    // courseId를 gameId로 사용 (같은 ID를 가정하거나 별도 매핑 필요)
    return gamesApi.getTimeSlots(courseId, {
      startDate: filter?.dateFrom,
      endDate: filter?.dateTo,
      page: filter?.page,
      limit: filter?.limit,
    });
  },

  async createTimeSlot(courseId: number, data: CreateGameTimeSlotDto) {
    return gamesApi.createTimeSlot(courseId, data);
  },

  async updateTimeSlot(courseId: number, timeSlotId: number, data: UpdateGameTimeSlotDto) {
    return gamesApi.updateTimeSlot(courseId, timeSlotId, data);
  },

  async deleteTimeSlot(courseId: number, timeSlotId: number) {
    return gamesApi.deleteTimeSlot(courseId, timeSlotId);
  },

  async createBulkTimeSlots(courseId: number, timeSlots: CreateGameTimeSlotDto[]) {
    return gamesApi.bulkCreateTimeSlots(courseId, timeSlots);
  },
};
