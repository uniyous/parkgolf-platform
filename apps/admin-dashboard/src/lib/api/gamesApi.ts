/**
 * Games API - BFF 통합 클라이언트
 *
 * BFF: /api/admin/games
 * - Games (게임/라운드)
 * - Weekly Schedules (주간 스케줄)
 * - Time Slots (타임슬롯)
 */

import { apiClient } from './client';
import { extractPaginatedList, extractList, extractSingle, type PaginatedResult } from './bffParser';

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

export interface GameFilter extends Record<string, string | number | boolean | undefined> {
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

export interface GameTimeSlotFilter extends Record<string, string | number | boolean | undefined> {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/** @deprecated PaginatedResult 사용 권장 (import from './bffParser') */
export type PaginatedResponse<T> = PaginatedResult<T>;

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
  async getGames(filters: GameFilter = {}): Promise<PaginatedResult<Game>> {
    const response = await apiClient.get<unknown>('/admin/games', filters);
    const result = extractPaginatedList<Game>(response.data, 'games', {
      page: filters.page,
      limit: filters.limit,
    });
    return {
      data: result.data.map(normalizeGame),
      pagination: result.pagination,
    };
  },

  /**
   * 골프장별 게임 목록
   */
  async getGamesByClub(clubId: number): Promise<Game[]> {
    const response = await apiClient.get<unknown>(`/admin/games/club/${clubId}`);
    const games = extractList<Game>(response.data, 'games');
    return games.map(normalizeGame);
  },

  /**
   * 게임 상세 조회
   */
  async getGameById(gameId: number): Promise<Game> {
    const response = await apiClient.get<unknown>(`/admin/games/${gameId}`);
    const game = extractSingle<Game>(response.data, 'game');
    if (!game) throw new Error('Game not found');
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
    const response = await apiClient.get<unknown>(`/admin/games/${gameId}/weekly-schedules`);
    // schedules 또는 weeklySchedules 키로 추출 시도
    let schedules = extractList<GameWeeklySchedule>(response.data, 'schedules');
    if (schedules.length === 0) {
      schedules = extractList<GameWeeklySchedule>(response.data, 'weeklySchedules');
    }
    return schedules;
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
  async getTimeSlots(gameId: number, filter?: GameTimeSlotFilter): Promise<PaginatedResult<GameTimeSlot>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filter?.date) params.date = filter.date;
    if (filter?.startDate) params.startDate = filter.startDate;
    if (filter?.endDate) params.endDate = filter.endDate;
    if (filter?.status) params.status = filter.status;
    if (filter?.page) params.page = filter.page;
    if (filter?.limit) params.limit = filter.limit;

    const response = await apiClient.get<unknown>(`/admin/games/${gameId}/time-slots`, params);
    return extractPaginatedList<GameTimeSlot>(response.data, 'timeSlots', {
      page: filter?.page,
      limit: filter?.limit,
    });
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
