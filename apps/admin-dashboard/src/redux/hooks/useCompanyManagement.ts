import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useCompany } from './useCompany';
import { 
  fetchCompanies,
  fetchCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  updateCompanyStatus,
  bulkUpdateStatus,
  bulkDeleteCompanies,
  fetchCompanyStats,
  setViewMode,
  setSelectedCompany,
  setSelectedCompanies,
  setFilters,
  clearError,
  clearAllErrors,
  resetCompanyState
} from '../slices/companySlice';
import type { AppDispatch } from '../store';
import type { 
  CompanyViewMode,
  FetchCompaniesPayload
} from '../types/companyTypes';
import type { 
  Company, 
  CompanyFilters, 
  CompanyStatus, 
  CreateCompanyDto, 
  UpdateCompanyDto 
} from '../../types/company';

/**
 * 회사 관리 통합 훅
 * 회사 관련 모든 액션과 상태를 관리하는 메인 훅
 */
export const useCompanyManagement = () => {
  const dispatch = useDispatch<AppDispatch>();
  const companyState = useCompany();

  // =============================================================================
  // API 액션들
  // =============================================================================

  /**
   * 회사 목록 로드
   */
  const loadCompanies = useCallback((payload?: FetchCompaniesPayload) => {
    return dispatch(fetchCompanies(payload));
  }, [dispatch]);

  /**
   * 특정 회사 상세 정보 로드
   */
  const loadCompanyById = useCallback((id: number) => {
    return dispatch(fetchCompanyById(id));
  }, [dispatch]);

  /**
   * 새 회사 생성
   */
  const createNewCompany = useCallback((companyData: CreateCompanyDto) => {
    return dispatch(createCompany(companyData));
  }, [dispatch]);

  /**
   * 회사 정보 수정
   */
  const updateCompanyData = useCallback((id: number, data: UpdateCompanyDto) => {
    return dispatch(updateCompany({ id, data }));
  }, [dispatch]);

  /**
   * 회사 삭제
   */
  const deleteCompanyData = useCallback((id: number) => {
    return dispatch(deleteCompany(id));
  }, [dispatch]);

  /**
   * 회사 상태 변경
   */
  const changeCompanyStatus = useCallback((id: number, status: CompanyStatus) => {
    return dispatch(updateCompanyStatus({ id, status }));
  }, [dispatch]);

  /**
   * 대량 상태 변경
   */
  const bulkChangeStatus = useCallback((companyIds: number[], status: CompanyStatus) => {
    return dispatch(bulkUpdateStatus({ companyIds, status }));
  }, [dispatch]);

  /**
   * 대량 삭제
   */
  const bulkDelete = useCallback((companyIds: number[]) => {
    return dispatch(bulkDeleteCompanies({ companyIds }));
  }, [dispatch]);

  /**
   * 회사 통계 로드
   */
  const loadCompanyStats = useCallback(() => {
    return dispatch(fetchCompanyStats());
  }, [dispatch]);

  // =============================================================================
  // UI 상태 액션들
  // =============================================================================

  /**
   * 뷰 모드 변경
   */
  const changeViewMode = useCallback((mode: CompanyViewMode) => {
    dispatch(setViewMode(mode));
  }, [dispatch]);

  /**
   * 선택된 회사 설정
   */
  const selectCompany = useCallback((company: Company | null) => {
    dispatch(setSelectedCompany(company));
  }, [dispatch]);

  /**
   * 다중 선택된 회사들 설정
   */
  const selectCompanies = useCallback((companyIds: number[]) => {
    dispatch(setSelectedCompanies(companyIds));
  }, [dispatch]);

  /**
   * 에러 클리어
   */
  const clearSpecificError = useCallback((errorType: keyof typeof companyState.error) => {
    dispatch(clearError(errorType));
  }, [dispatch]);

  /**
   * 모든 에러 클리어
   */
  const clearErrors = useCallback(() => {
    dispatch(clearAllErrors());
  }, [dispatch]);

  /**
   * 상태 리셋
   */
  const resetState = useCallback(() => {
    dispatch(resetCompanyState());
  }, [dispatch]);

  // =============================================================================
  // 고수준 비즈니스 로직들
  // =============================================================================

  /**
   * 회사 생성 플로우
   */
  const handleCreateCompany = useCallback(async (companyData: CreateCompanyDto) => {
    try {
      await dispatch(createCompany(companyData)).unwrap();
      dispatch(setViewMode('list'));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [dispatch]);

  /**
   * 회사 수정 플로우
   */
  const handleUpdateCompany = useCallback(async (id: number, data: UpdateCompanyDto) => {
    try {
      await dispatch(updateCompany({ id, data })).unwrap();
      dispatch(setViewMode('list'));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [dispatch]);

  /**
   * 회사 삭제 플로우 (확인 포함)
   */
  const handleDeleteCompany = useCallback(async (company: Company) => {
    const confirmed = window.confirm(
      `${company.name}을(를) 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 관련된 모든 코스와 예약 정보도 함께 삭제됩니다.`
    );

    if (!confirmed) {
      return { success: false, cancelled: true };
    }

    try {
      await dispatch(deleteCompany(company.id)).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [dispatch]);

  /**
   * 대량 작업 플로우
   */
  const handleBulkAction = useCallback(async (action: string, companyIds: number[]) => {
    if (companyIds.length === 0) {
      return { success: false, error: '선택된 회사가 없습니다.' };
    }

    try {
      switch (action) {
        case 'activate':
          await dispatch(bulkUpdateStatus({ companyIds, status: 'ACTIVE' })).unwrap();
          break;
        case 'deactivate':
          await dispatch(bulkUpdateStatus({ companyIds, status: 'INACTIVE' })).unwrap();
          break;
        case 'maintenance':
          await dispatch(bulkUpdateStatus({ companyIds, status: 'MAINTENANCE' })).unwrap();
          break;
        case 'delete':
          const confirmed = window.confirm(`선택된 ${companyIds.length}개 회사를 삭제하시겠습니까?`);
          if (!confirmed) {
            return { success: false, cancelled: true };
          }
          await dispatch(bulkDeleteCompanies({ companyIds })).unwrap();
          break;
        default:
          throw new Error('알 수 없는 작업입니다.');
      }

      dispatch(setSelectedCompanies([]));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [dispatch]);

  /**
   * 회사 상세 보기로 이동
   */
  const viewCompanyDetail = useCallback((company: Company) => {
    dispatch(setSelectedCompany(company));
    dispatch(setViewMode('detail'));
  }, [dispatch]);

  /**
   * 회사 편집 모드로 이동
   */
  const editCompany = useCallback((company: Company) => {
    dispatch(setSelectedCompany(company));
    dispatch(setViewMode('edit'));
  }, [dispatch]);

  /**
   * 회사 생성 모드로 이동
   */
  const createCompanyMode = useCallback(() => {
    dispatch(setSelectedCompany(null));
    dispatch(setViewMode('create'));
  }, [dispatch]);

  /**
   * 목록으로 돌아가기
   */
  const backToList = useCallback(() => {
    dispatch(setViewMode('list'));
    dispatch(setSelectedCompany(null));
  }, [dispatch]);

  /**
   * 필터 기반 검색
   */
  const searchCompanies = useCallback((searchTerm: string) => {
    const newFilters = {
      ...companyState.filters,
      search: searchTerm
    };
    dispatch(setFilters(newFilters));
  }, [dispatch, companyState.filters]);

  // =============================================================================
  // 반환 객체
  // =============================================================================

  return {
    // 상태 (useCompany에서 가져옴)
    ...companyState,

    // API 액션들
    actions: {
      loadCompanies,
      loadCompanyById,
      createNewCompany,
      updateCompanyData,
      deleteCompanyData,
      changeCompanyStatus,
      bulkChangeStatus,
      bulkDelete,
      loadCompanyStats,
      
      // UI 상태 액션들
      changeViewMode,
      selectCompany,
      selectCompanies,
      clearSpecificError,
      clearErrors,
      resetState,
      
      // 고수준 비즈니스 로직들
      handleCreateCompany,
      handleUpdateCompany,
      handleDeleteCompany,
      handleBulkAction,
      viewCompanyDetail,
      editCompany,
      createCompanyMode,
      backToList,
      searchCompanies
    }
  };
};

