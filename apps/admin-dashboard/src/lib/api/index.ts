/**
 * API Module - BFF (admin-api) 통합 클라이언트
 *
 * 모든 API 호출은 BFF를 통해 이루어집니다.
 * 직접 서비스 연결은 금지됩니다.
 */

// Core client
export { apiClient, ApiError, type ApiResponse, type BffApiResponse } from './client';

// Domain APIs
export { authApi } from './authApi';
export { adminApi } from './adminApi';
export { bookingApi } from './bookingApi';
export { companyApi } from './companyApi';
export { dashboardApi } from './dashboardApi';
export { holeApi } from './holeApi';
export { notificationApi } from './notificationApi';

// Course/Club Management (신규 구조)
export { courseApi, golfCourseApi } from './courses';

// Game-based Scheduling (게임 기반 스케줄링)
export { gamesApi, timeSlotAdapter } from './gamesApi';
export { timeSlotApi } from './timeSlotApi';

// Legacy Course API (마이그레이션 예정)
// 11개 컴포넌트에서 사용 중 - 점진적 마이그레이션 필요
export { courseApi as legacyCourseApi } from './courseApi';

// Types - Course/Club
export type {
  Club,
  CreateClubDto,
  UpdateClubDto,
  ClubFilters,
  CourseFilters,
  PaginatedResponse,
  CourseStats,
} from './courses';

// Types - Game-based Scheduling
export type {
  Game,
  CreateGameDto,
  UpdateGameDto,
  GameFilter,
  GameWeeklySchedule,
  CreateGameWeeklyScheduleDto,
  UpdateGameWeeklyScheduleDto,
  GameTimeSlot,
  CreateGameTimeSlotDto,
  UpdateGameTimeSlotDto,
  GameTimeSlotFilter,
} from './gamesApi';
