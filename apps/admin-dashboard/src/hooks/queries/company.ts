import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi, type CompanyFiltersQuery } from '@/lib/api/companyApi';
import { companyKeys } from './keys';
import type { CreateCompanyDto, UpdateCompanyDto, CompanyStatus } from '@/types/company';

// ============================================
// Queries
// ============================================

export const useCompanies = (filters?: CompanyFiltersQuery, page = 1, limit = 20) => {
  return useQuery({
    queryKey: companyKeys.list({ ...filters, page, limit }),
    queryFn: () => companyApi.getCompanies(filters, page, limit),
  });
};

export const useCompany = (id: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => companyApi.getCompanyById(id),
    enabled: options?.enabled ?? !!id,
  });
};

export const useCompanyStats = () => {
  return useQuery({
    queryKey: companyKeys.stats(),
    queryFn: () => companyApi.getCompanyStats(),
  });
};

// ============================================
// Mutations
// ============================================

export const useCreateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompanyDto) => companyApi.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() });
    },
  });
};

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCompanyDto }) =>
      companyApi.updateCompany(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() });
    },
  });
};

export const useDeleteCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => companyApi.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() });
    },
  });
};

export const useUpdateCompanyStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: CompanyStatus }) =>
      companyApi.updateCompanyStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() });
    },
  });
};

export const useBulkUpdateCompanyStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: CompanyStatus }) =>
      companyApi.bulkUpdateStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
};

export const useBulkDeleteCompanies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => companyApi.bulkDeleteCompanies(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
};
