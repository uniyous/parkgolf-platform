import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi, type BookingFilters } from '@/lib/api/bookingApi';
import { bookingKeys } from './keys';
import { showSuccessToast } from '@/lib/errors';
import type { CreateBookingDto, UpdateBookingDto } from '@/types';

// ============================================
// Queries
// ============================================

export const useBookingsQuery = (filters?: BookingFilters, page = 1, limit = 20) => {
  return useQuery({
    queryKey: bookingKeys.list({ ...filters, page, limit } as BookingFilters),
    queryFn: () => bookingApi.getBookings(filters || {}, page, limit),
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

export const useBookingQuery = (id: number) => {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => bookingApi.getBookingById(id),
    enabled: !!id,
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

export const useBookingStatsQuery = () => {
  return useQuery({
    queryKey: bookingKeys.stats(),
    queryFn: () => bookingApi.getBookingStats(),
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

export const useCalendarBookingsQuery = (courseId: number, month: string) => {
  return useQuery({
    queryKey: bookingKeys.calendar(month),
    queryFn: () => bookingApi.getCalendarData(courseId, month),
    enabled: !!courseId && !!month,
    meta: { globalLoading: false }, // 로컬 로딩 사용
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
      showSuccessToast('예약이 생성되었습니다.');
    },
    meta: { errorMessage: '예약 생성에 실패했습니다.' },
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
      showSuccessToast('예약 정보가 수정되었습니다.');
    },
    meta: { errorMessage: '예약 정보 수정에 실패했습니다.' },
  });
};

export const useCancelBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => bookingApi.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      showSuccessToast('예약이 취소되었습니다.');
    },
    meta: { errorMessage: '예약 취소에 실패했습니다.' },
  });
};

export const useConfirmBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => bookingApi.confirmBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      showSuccessToast('예약이 확정되었습니다.');
    },
    meta: { errorMessage: '예약 확정에 실패했습니다.' },
  });
};

export const useCompleteBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => bookingApi.completeBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      showSuccessToast('예약이 완료 처리되었습니다.');
    },
    meta: { errorMessage: '예약 완료 처리에 실패했습니다.' },
  });
};

export const useNoShowBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => bookingApi.markNoShow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      showSuccessToast('노쇼 처리되었습니다.');
    },
    meta: { errorMessage: '노쇼 처리에 실패했습니다.' },
  });
};
