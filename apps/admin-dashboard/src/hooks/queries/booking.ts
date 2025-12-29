import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi, type BookingFilters } from '@/lib/api/bookingApi';
import { bookingKeys } from './keys';
import type { CreateBookingDto, UpdateBookingDto } from '@/types';

// ============================================
// Queries
// ============================================

export const useBookingsQuery = (filters?: BookingFilters, page = 1, limit = 20) => {
  return useQuery({
    queryKey: bookingKeys.list({ ...filters, page, limit } as BookingFilters),
    queryFn: () => bookingApi.getBookings(filters || {}, page, limit),
  });
};

export const useBookingQuery = (id: number) => {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => bookingApi.getBookingById(id),
    enabled: !!id,
  });
};

export const useBookingStatsQuery = () => {
  return useQuery({
    queryKey: bookingKeys.stats(),
    queryFn: () => bookingApi.getBookingStats(),
  });
};

export const useCalendarBookingsQuery = (courseId: number, month: string) => {
  return useQuery({
    queryKey: bookingKeys.calendar(month),
    queryFn: () => bookingApi.getCalendarData(courseId, month),
    enabled: !!courseId && !!month,
  });
};

// ============================================
// Mutations
// ============================================

export const useCreateBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingDto) => bookingApi.createBooking(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.stats() });
    },
  });
};

export const useUpdateBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBookingDto }) =>
      bookingApi.updateBooking(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
    },
  });
};

export const useCancelBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => bookingApi.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
};

export const useConfirmBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => bookingApi.confirmBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
};
