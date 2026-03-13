import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerApi } from '@/lib/api/partnerApi';
import { partnerKeys } from './keys';
import { useActiveCompanyId } from '@/hooks/useActiveCompany';
import { showSuccessToast } from '@/lib/errors';

// ── Queries ──

export const useMyPartnerConfigQuery = (clubId: number, options?: { enabled?: boolean }) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: partnerKeys.config(companyId, clubId),
    queryFn: () => partnerApi.getMyPartnerConfig(clubId),
    enabled: options?.enabled ?? !!clubId,
    meta: { globalLoading: false },
  });
};

export const useSyncLogsQuery = (clubId: number, options?: { enabled?: boolean }) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: partnerKeys.syncLogs(companyId, clubId),
    queryFn: () => partnerApi.getSyncLogs(clubId),
    enabled: options?.enabled ?? !!clubId,
    meta: { globalLoading: false },
  });
};

export const useBookingMappingsQuery = (clubId: number, options?: { enabled?: boolean }) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: partnerKeys.bookingMappings(companyId, clubId),
    queryFn: () => partnerApi.getBookingMappings(clubId),
    enabled: options?.enabled ?? !!clubId,
    meta: { globalLoading: false },
  });
};

// ── Mutations ──

export const useManualSyncMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();
  return useMutation({
    mutationFn: (clubId: number) => partnerApi.manualSync(clubId),
    onSuccess: (_, clubId) => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.syncLogs(companyId, clubId) });
      queryClient.invalidateQueries({ queryKey: partnerKeys.config(companyId, clubId) });
      showSuccessToast('수동 동기화가 시작되었습니다.');
    },
    meta: { errorMessage: '수동 동기화에 실패했습니다.' },
  });
};

export const useResolveConflictMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();
  return useMutation({
    mutationFn: ({ bookingMappingId, resolution, clubId }: {
      bookingMappingId: number;
      resolution: Record<string, unknown>;
      clubId: number;
    }) => partnerApi.resolveConflict(bookingMappingId, resolution),
    onSuccess: (_, { clubId }) => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.bookingMappings(companyId, clubId) });
      showSuccessToast('충돌이 해결되었습니다.');
    },
    meta: { errorMessage: '충돌 해결에 실패했습니다.' },
  });
};
