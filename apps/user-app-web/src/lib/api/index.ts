/**
 * API Module - BFF (user-api) 통합 클라이언트
 *
 * 모든 API 호출은 BFF를 통해 이루어집니다.
 * 직접 서비스 연결은 금지됩니다.
 */

// Core client
export { apiClient, ApiError } from './client';
export type { ApiResponse, PaginatedResponse, ClientResponse } from './client';

// BFF Parser utilities
export {
  bffParser,
  unwrapResponse,
  extractList,
  extractSingle,
  extractPaginatedList,
  extractPagination,
  isSuccess,
  extractError,
} from './bffParser';
export type { BffResponse, PaginatedResult } from './bffParser';

// Domain APIs
export { authApi } from './authApi';
export { gameApi } from './gameApi';
export { bookingApi } from './bookingApi';

// Types - Auth
export type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from './authApi';

// Types - Game
export type {
  Game,
  GameCourse,
  GameTimeSlot,
  GameSearchParams,
  GamesResponse,
  SearchGamesResponse,
} from './gameApi';

// Types - Booking
export type {
  TimeSlot,
  CreateBookingRequest,
  BookingResponse,
  BookingWithCancel,
  BookingStatus,
  UpdateBookingRequest,
  SearchBookingParams,
  SearchBookingsResponse,
} from './bookingApi';
