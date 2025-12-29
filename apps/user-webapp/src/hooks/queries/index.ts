// Query Keys
export * from './keys';

// Auth Queries & Mutations
export {
  useProfileQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
} from './auth';

// Game Queries
export {
  useGamesQuery,
  useSearchGamesQuery,
  useGamesByClubQuery,
  useGameQuery,
  useGameTimeSlotsQuery,
  useAvailableTimeSlotsQuery,
} from './game';

// Booking Queries & Mutations
export {
  useTimeSlotsQuery,
  useTimeSlotAvailabilityQuery,
  useMyBookingsQuery,
  useSearchBookingsQuery,
  useBookingByNumberQuery,
  useBookingQuery,
  useCreateBookingMutation,
  useUpdateBookingMutation,
  useCancelBookingMutation,
} from './booking';
