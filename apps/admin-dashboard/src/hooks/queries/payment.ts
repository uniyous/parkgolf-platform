import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '@/lib/api/bookingApi';
import { paymentKeys, bookingKeys } from './keys';
import { showSuccessToast } from '@/lib/errors';
import { useActiveCompanyId } from '@/hooks/useActiveCompany';
import type { PaymentFilters } from '@/types';

// ============================================
// Queries
// ============================================

export const usePaymentsQuery = (filters?: PaymentFilters, page = 1, limit = 20) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: paymentKeys.list(companyId, { ...filters, page, limit } as Record<string, unknown>),
    queryFn: () => bookingApi.getPayments(filters || {}, page, limit),
    meta: { globalLoading: false },
  });
};

export const usePaymentDetailQuery = (paymentId: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: paymentKeys.detail(companyId, paymentId),
    queryFn: () => bookingApi.getPaymentById(paymentId),
    enabled: !!paymentId,
    meta: { globalLoading: false },
  });
};

export const useRevenueStatsQuery = (dateRange: { startDate: string; endDate: string }) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: paymentKeys.revenue(companyId, dateRange),
    queryFn: () => bookingApi.getRevenueStats(dateRange),
    enabled: !!dateRange.startDate && !!dateRange.endDate,
    meta: { globalLoading: false },
  });
};

// ============================================
// Mutations
// ============================================

export const useRefundMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: ({
      bookingId,
      data,
    }: {
      bookingId: number;
      data: { cancelAmount?: number; cancelReason: string; adminNote?: string };
    }) => bookingApi.processRefund(bookingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.revenue(companyId) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists(companyId) });
      showSuccessToast('환불이 처리되었습니다.');
    },
    meta: { errorMessage: '환불 처리에 실패했습니다.' },
  });
};
