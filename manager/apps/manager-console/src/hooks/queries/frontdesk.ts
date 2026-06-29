import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  frontdeskApi,
  type FrontdeskBookingFilters,
  type CreateBookingBody,
  type QuoteBody,
  type PayBody,
} from '@/lib/api/frontdeskApi';
import { frontdeskKeys } from './keys';
import { showSuccessToast } from '@/lib/errors';

// ── Queries ──
export const useFrontdeskBookingsQuery = (filters?: FrontdeskBookingFilters, page = 1, limit = 20) =>
  useQuery({
    queryKey: frontdeskKeys.list(filters, page, limit),
    queryFn: () => frontdeskApi.listBookings(filters || {}, page, limit),
    meta: { globalLoading: false },
  });

export const useFrontdeskBookingQuery = (id: number) =>
  useQuery({
    queryKey: frontdeskKeys.detail(id),
    queryFn: () => frontdeskApi.getBooking(id),
    enabled: !!id,
    meta: { globalLoading: false },
  });

export const useCheckoutStatusQuery = (bookingId: number) =>
  useQuery({
    queryKey: frontdeskKeys.checkout(bookingId),
    queryFn: () => frontdeskApi.checkoutStatus(bookingId),
    enabled: !!bookingId,
    meta: { globalLoading: false },
  });

// ── Mutations ──
export const useQuoteMutation = () => useMutation({ mutationFn: (body: QuoteBody) => frontdeskApi.quote(body) });

export const useCreateBookingMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBookingBody) => frontdeskApi.createBooking(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: frontdeskKeys.lists() });
      showSuccessToast('데스크 예약이 생성되었습니다');
    },
  });
};

export const useCheckinMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { bookingId: number; bookingPlayerIds?: number[] }) => frontdeskApi.checkin(body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: frontdeskKeys.detail(v.bookingId) });
      qc.invalidateQueries({ queryKey: frontdeskKeys.checkout(v.bookingId) });
      showSuccessToast('체크인 완료');
    },
  });
};

export const usePayMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PayBody) => frontdeskApi.pay(body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: frontdeskKeys.detail(v.bookingId) });
      qc.invalidateQueries({ queryKey: frontdeskKeys.checkout(v.bookingId) });
      qc.invalidateQueries({ queryKey: frontdeskKeys.lists() });
      showSuccessToast('수납 완료');
    },
  });
};
