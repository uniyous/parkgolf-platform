import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/adminApi';
import { companyMemberKeys } from './keys';
import { useAuthStore } from '@/stores/auth.store';
import { useSupportStore } from '@/stores/support.store';
import { showSuccessToast } from '@/lib/errors';
import type { CompanyMemberFilters, CreateCompanyMemberDto, UpdateCompanyMemberDto } from '@/types';

/**
 * 유효 companyId 반환
 * - 지원 모드: supportStore의 selectedCompany.id (X-Company-Id 헤더로 전송됨)
 * - 일반 모드: authStore의 companyId (JWT에서 추출)
 */
function useEffectiveCompanyId(): number | undefined {
  const supportCompanyId = useSupportStore((s) => s.isSupportMode ? s.selectedCompany?.id : undefined);
  const authCompanyId = useAuthStore((s) => s.currentAdmin?.companyId);
  return supportCompanyId ?? authCompanyId ?? undefined;
}

// ============================================
// Queries
// ============================================

export const useCompanyMembersQuery = (filters?: CompanyMemberFilters, page = 1, limit = 20) => {
  const companyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: companyMemberKeys.list(companyId, { ...filters, page, limit }),
    queryFn: () => adminApi.getCompanyMembers(filters, page, limit),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
    meta: { globalLoading: false },
  });
};

// ============================================
// Mutations
// ============================================

export const useCreateCompanyMemberMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useEffectiveCompanyId();

  return useMutation({
    mutationFn: (data: CreateCompanyMemberDto) => adminApi.createCompanyMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyMemberKeys.lists(companyId) });
      showSuccessToast('회원이 등록되었습니다.');
    },
    meta: { errorMessage: '회원 등록에 실패했습니다.' },
  });
};

export const useUpdateCompanyMemberMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useEffectiveCompanyId();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCompanyMemberDto }) =>
      adminApi.updateCompanyMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyMemberKeys.lists(companyId) });
      showSuccessToast('회원 정보가 수정되었습니다.');
    },
    meta: { errorMessage: '회원 정보 수정에 실패했습니다.' },
  });
};

export const useDeleteCompanyMemberMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useEffectiveCompanyId();

  return useMutation({
    mutationFn: (id: number) => adminApi.deleteCompanyMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyMemberKeys.lists(companyId) });
      showSuccessToast('회원이 제거되었습니다.');
    },
    meta: { errorMessage: '회원 제거에 실패했습니다.' },
  });
};
