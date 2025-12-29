import type { SearchBookingParams } from '@/lib/api/bookingApi';
import type { GameSearchParams } from '@/lib/api/gameApi';

// Auth Keys
export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
};

// Game Keys
export const gameKeys = {
  all: ['games'] as const,
  lists: () => [...gameKeys.all, 'list'] as const,
  list: (clubId?: number) => [...gameKeys.lists(), clubId] as const,
  search: (params: GameSearchParams) => [...gameKeys.all, 'search', params] as const,
  byClub: (clubId: number) => [...gameKeys.all, 'club', clubId] as const,
  details: () => [...gameKeys.all, 'detail'] as const,
  detail: (id: number) => [...gameKeys.details(), id] as const,
  timeSlots: (gameId: number, date?: string) =>
    [...gameKeys.all, 'timeSlots', gameId, date] as const,
  availableTimeSlots: (gameId: number, date: string) =>
    [...gameKeys.all, 'availableTimeSlots', gameId, date] as const,
};

// Booking Keys
export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: () => [...bookingKeys.lists()] as const,
  search: (params?: SearchBookingParams) => [...bookingKeys.all, 'search', params] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: number) => [...bookingKeys.details(), id] as const,
  byNumber: (bookingNumber: string) => [...bookingKeys.all, 'number', bookingNumber] as const,
  timeSlotAvailability: (gameId: number, date: string) =>
    [...bookingKeys.all, 'timeSlotAvailability', gameId, date] as const,
};
