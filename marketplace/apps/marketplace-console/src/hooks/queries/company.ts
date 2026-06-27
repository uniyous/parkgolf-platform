import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi, type CompanyFiltersQuery } from '@/lib/api/companyApi';
import { companyKeys } from './keys';
import { showSuccessToast } from '@/lib/errors';
import type { CreateCompanyDto, UpdateCompanyDto, CompanyStatus } from '@/types/company';

// ============================================
// Queries
// ============================================

export const useCompaniesQuery = (filters?: CompanyFiltersQuery, page = 1, limit = 20) => {
  return useQuery({
    queryKey: companyKeys.list({ ...filters, page, limit }),
    queryFn: () => companyApi.getCompanies(filters, page, limit),
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

export const useCompanyQuery = (id: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => companyApi.getCompanyById(id),
    enabled: options?.enabled ?? !!id,
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

export const useCompanyStatsQuery = () => {
  return useQuery({
    queryKey: companyKeys.stats(),
    queryFn: () => companyApi.getCompanyStats(),
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

// ============================================
// Mutations
// ============================================

export const useCreateCompanyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompanyDto) => companyApi.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() });
      showSuccessToast('회사가 생성되었습니다.');
    },
    meta: { errorMessage: '회사 생성에 실패했습니다.' },
  });
};

export const useUpdateCompanyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCompanyDto }) =>
      companyApi.updateCompany(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() });
      showSuccessToast('회사 정보가 수정되었습니다.');
    },
    meta: { errorMessage: '회사 정보 수정에 실패했습니다.' },
  });
};

export const useDeleteCompanyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => companyApi.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() });
      showSuccessToast('회사가 삭제되었습니다.');
    },
    meta: { errorMessage: '회사 삭제에 실패했습니다.' },
  });
};

export const useUpdateCompanyStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: CompanyStatus }) =>
      companyApi.updateCompanyStatus(id, status),
    onSuccess: (_, { id, status }) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() });
      showSuccessToast(`회사 상태가 ${status === 'ACTIVE' ? '활성' : '비활성'}으로 변경되었습니다.`);
    },
    meta: { errorMessage: '상태 변경에 실패했습니다.' },
  });
};

export const useBulkUpdateCompanyStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: CompanyStatus }) =>
      companyApi.bulkUpdateStatus(ids, status),
    onSuccess: (_, { ids, status }) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
      showSuccessToast(`${ids.length}개 회사가 ${status === 'ACTIVE' ? '활성화' : '비활성화'}되었습니다.`);
    },
    meta: { errorMessage: '일괄 상태 변경에 실패했습니다.' },
  });
};

export const useBulkDeleteCompaniesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => companyApi.bulkDeleteCompanies(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
      showSuccessToast(`${ids.length}개 회사가 삭제되었습니다.`);
    },
    meta: { errorMessage: '일괄 삭제에 실패했습니다.' },
  });
};
