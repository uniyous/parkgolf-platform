import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  bookingApi,
  type CreateBookingRequest,
  type UpdateBookingRequest,
  type SearchBookingParams,
} from '@/lib/api/bookingApi';
import { bookingKeys } from './keys';

// Get Time Slot Availability Query
export const useTimeSlotAvailabilityQuery = (gameId: number, date: string) => {
  return useQuery({
    queryKey: bookingKeys.timeSlotAvailability(gameId, date),
    queryFn: () => bookingApi.getTimeSlotAvailability(gameId, date),
    enabled: !!gameId && !!date,
    staleTime: 1000 * 60 * 2, // 2 minutes (time slots change frequently)
    gcTime: 1000 * 60 * 10, // 10 minutes cache
  });
};

// Alias for backward compatibility
export const useTimeSlotsQuery = useTimeSlotAvailabilityQuery;

// Get My Bookings Query
export const useMyBookingsQuery = () => {
  return useQuery({
    queryKey: bookingKeys.list(),
    queryFn: () => bookingApi.getMyBookings(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

// Search Bookings Query
export const useSearchBookingsQuery = (params: SearchBookingParams) => {
  return useQuery({
    queryKey: bookingKeys.search(params),
    queryFn: () => bookingApi.searchBookings(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    placeholderData: keepPreviousData,
  });
};

// Get Booking By Number Query
export const useBookingByNumberQuery = (bookingNumber: string) => {
  return useQuery({
    queryKey: bookingKeys.byNumber(bookingNumber),
    queryFn: () => bookingApi.getBookingByNumber(bookingNumber),
    enabled: !!bookingNumber,
    staleTime: 1000 * 60 * 5,
  });
};

// Get Booking By ID Query
export const useBookingQuery = (id: number) => {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => bookingApi.getBookingById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

// Create Booking Mutation
export const useCreateBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingData: CreateBookingRequest) => bookingApi.createBooking(bookingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
};

// Update Booking Mutation
export const useUpdateBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UpdateBookingRequest }) =>
      bookingApi.updateBooking(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
};

// Cancel Booking Mutation
export const useCancelBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      bookingApi.cancelBooking(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
};
