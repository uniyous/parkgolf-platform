import { useState, useCallback } from 'react';
import { useCompaniesQuery, useCompanyQuery, useCreateCompanyMutation, useUpdateCompanyMutation, useDeleteCompanyMutation } from './queries';
import type { Company, CompanyStatus, CreateCompanyDto, UpdateCompanyDto } from '@/types/company';

type ViewMode = 'list' | 'detail' | 'create' | 'edit';

export const useCompanyManagement = () => {
  // State
  const [selectedCompanyState, setSelectedCompanyState] = useState<Company | null>(null);
  const [viewModeState, setViewModeState] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Queries
  const companiesQuery = useCompaniesQuery({}, page, limit);
  const selectedCompanyQuery = useCompanyQuery(selectedCompanyState?.id ?? 0, {
    enabled: !!selectedCompanyState?.id
  });

  // Mutations
  const createCompanyMutation = useCreateCompanyMutation();
  const updateCompanyMutation = useUpdateCompanyMutation();
  const deleteCompanyMutation = useDeleteCompanyMutation();

  // Derived data
  const companies = companiesQuery.data?.data ?? [];
  const selectedCompany = selectedCompanyQuery.data ?? selectedCompanyState;

  // Loading & Error
  const loading = {
    list: companiesQuery.isLoading,
    create: createCompanyMutation.isPending,
    update: updateCompanyMutation.isPending,
    delete: deleteCompanyMutation.isPending,
  };

  const error = {
    list: companiesQuery.error?.message ?? null,
    create: createCompanyMutation.error?.message ?? null,
    update: updateCompanyMutation.error?.message ?? null,
    delete: deleteCompanyMutation.error?.message ?? null,
  };

  // Actions
  const loadCompanies = useCallback(() => {
    companiesQuery.refetch();
  }, [companiesQuery]);

  const selectCompany = useCallback((company: Company | null) => {
    setSelectedCompanyState(company);
    if (company) {
      setViewModeState('detail');
    } else {
      setViewModeState('list');
    }
  }, []);

  const clearSelectedCompany = useCallback(() => {
    setSelectedCompanyState(null);
    setViewModeState('list');
  }, []);

  const createCompany = useCallback(async (companyData: CreateCompanyDto) => {
    const result = await createCompanyMutation.mutateAsync(companyData);
    setViewModeState('list');
    return result;
  }, [createCompanyMutation]);

  const updateCompany = useCallback(async (id: number, data: UpdateCompanyDto) => {
    const result = await updateCompanyMutation.mutateAsync({ id, data });
    setViewModeState('list');
    return result;
  }, [updateCompanyMutation]);

  const handleDeleteCompany = useCallback(async (company: Company) => {
    if (!window.confirm(`"${company.name}" 회사를 정말 삭제하시겠습니까?`)) {
      return { cancelled: true };
    }
    try {
      await deleteCompanyMutation.mutateAsync(company.id);
      setSelectedCompanyState(null);
      setViewModeState('list');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || '삭제에 실패했습니다.' };
    }
  }, [deleteCompanyMutation]);

  const changeCompanyStatus = useCallback(async (companyId: number, status: CompanyStatus) => {
    return updateCompanyMutation.mutateAsync({ id: companyId, data: { status } });
  }, [updateCompanyMutation]);

  // View mode actions
  const backToList = useCallback(() => {
    setViewModeState('list');
    setSelectedCompanyState(null);
  }, []);

  const createCompanyMode = useCallback(() => {
    setSelectedCompanyState(null);
    setViewModeState('create');
  }, []);

  const viewCompanyDetail = useCallback((company: Company) => {
    setSelectedCompanyState(company);
    setViewModeState('detail');
  }, []);

  const editCompany = useCallback((company: Company) => {
    setSelectedCompanyState(company);
    setViewModeState('edit');
  }, []);

  return {
    // State
    companies,
    selectedCompany,
    viewMode: viewModeState,
    loading,
    error,

    // Actions
    actions: {
      loadCompanies,
      selectCompany,
      clearSelectedCompany,
      createCompany,
      updateCompany,
      handleDeleteCompany,
      changeCompanyStatus,
      backToList,
      createCompanyMode,
      viewCompanyDetail,
      editCompany,
    },
  };
};
