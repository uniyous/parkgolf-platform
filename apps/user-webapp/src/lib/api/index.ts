export { apiClient, ApiError } from './client';
export type { ApiResponse } from './client';
export type { BffApiResponse } from '@/types/common';

export { authApi } from './authApi';
export type { User, LoginRequest, RegisterRequest, AuthResponse } from './authApi';

export { gameApi } from './gameApi';
export type {
  Game,
  GameCourse,
  GameTimeSlot,
  GamesResponse,
} from './gameApi';

export { bookingApi } from './bookingApi';
export type {
  TimeSlot,
  CreateBookingRequest,
  BookingResponse,
  UpdateBookingRequest,
  SearchBookingParams,
} from './bookingApi';
