import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerApi } from '@/lib/api/partnerApi';
import { partnerKeys } from './keys';
import { showSuccessToast } from '@/lib/errors';
import type {
  CreatePartnerConfigDto,
  UpdatePartnerConfigDto,
  PartnerConfigFilters,
  CreateCourseMappingDto,
  UpdateCourseMappingDto,
} from '@/types/partner';

// ── Queries ──

export const usePartnersQuery = (filters?: PartnerConfigFilters, page = 1, limit = 20) => {
  return useQuery({
    queryKey: partnerKeys.list({ ...filters, page, limit }),
    queryFn: () => partnerApi.getPartners(filters, page, limit),
    meta: { globalLoading: false },
  });
};

export const usePartnerQuery = (id: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: partnerKeys.detail(id),
    queryFn: () => partnerApi.getPartnerById(id),
    enabled: options?.enabled ?? !!id,
    meta: { globalLoading: false },
  });
};

export const useCourseMappingsQuery = (partnerId: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: partnerKeys.courseMappings(partnerId),
    queryFn: () => partnerApi.getCourseMappings(partnerId),
    enabled: options?.enabled ?? !!partnerId,
    meta: { globalLoading: false },
  });
};

export const useSyncLogsQuery = (partnerId: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: partnerKeys.syncLogs(partnerId),
    queryFn: () => partnerApi.getSyncLogs(partnerId),
    enabled: options?.enabled ?? !!partnerId,
    meta: { globalLoading: false },
  });
};

// ── Mutations ──

export const useCreatePartnerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePartnerConfigDto) => partnerApi.createPartner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.lists() });
      showSuccessToast('파트너 설정이 등록되었습니다.');
    },
    meta: { errorMessage: '파트너 등록에 실패했습니다.' },
  });
};

export const useUpdatePartnerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePartnerConfigDto }) =>
      partnerApi.updatePartner(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: partnerKeys.detail(id) });
      showSuccessToast('파트너 설정이 수정되었습니다.');
    },
    meta: { errorMessage: '파트너 수정에 실패했습니다.' },
  });
};

export const useDeletePartnerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => partnerApi.deletePartner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.lists() });
      showSuccessToast('파트너 설정이 삭제되었습니다.');
    },
    meta: { errorMessage: '파트너 삭제에 실패했습니다.' },
  });
};

export const useTestConnectionMutation = () => {
  return useMutation({
    mutationFn: (id: number) => partnerApi.testConnection(id),
    meta: { errorMessage: '연결 테스트에 실패했습니다.' },
  });
};

export const useCreateCourseMappingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCourseMappingDto) => partnerApi.createCourseMapping(data),
    onSuccess: (_, { partnerId }) => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.courseMappings(partnerId) });
      showSuccessToast('코스 매핑이 등록되었습니다.');
    },
    meta: { errorMessage: '코스 매핑 등록에 실패했습니다.' },
  });
};

export const useUpdateCourseMappingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, partnerId, data }: { id: number; partnerId: number; data: UpdateCourseMappingDto }) =>
      partnerApi.updateCourseMapping(id, data),
    onSuccess: (_, { partnerId }) => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.courseMappings(partnerId) });
      showSuccessToast('코스 매핑이 수정되었습니다.');
    },
    meta: { errorMessage: '코스 매핑 수정에 실패했습니다.' },
  });
};

export const useDeleteCourseMappingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, partnerId }: { id: number; partnerId: number }) =>
      partnerApi.deleteCourseMapping(id),
    onSuccess: (_, { partnerId }) => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.courseMappings(partnerId) });
      showSuccessToast('코스 매핑이 삭제되었습니다.');
    },
    meta: { errorMessage: '코스 매핑 삭제에 실패했습니다.' },
  });
};

export const useManualSyncMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (partnerId: number) => partnerApi.manualSync(partnerId),
    onSuccess: (_, partnerId) => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.syncLogs(partnerId) });
      showSuccessToast('수동 동기화가 시작되었습니다.');
    },
    meta: { errorMessage: '수동 동기화에 실패했습니다.' },
  });
};
