import { useSelector } from 'react-redux';
import { 
  selectCompanies,
  selectFilteredCompanies,
  selectSelectedCompany,
  selectSelectedCompanies,
  selectViewMode,
  selectFilters,
  selectPagination,
  selectStats,
  selectLastUpdated,
  selectCompanyLoading,
  selectCompanyError,
  selectActiveCompanies,
  selectInactiveCompanies,
  selectMaintenanceCompanies,
  selectSelectedCompanyObjects,
  selectCompanyStats,
  selectIsAnyLoading,
  selectHasAnyError,
  selectSearchStats
} from '../selectors/companySelectors';

/**
 * 회사 관리 기본 상태 접근 훅
 * Redux store에서 회사 관련 상태를 가져오는 읽기 전용 훅
 * @internal useCompanyManagement 내부에서만 사용
 */
export const useCompany = () => {
  // 기본 데이터
  const companies = useSelector(selectCompanies);
  const filteredCompanies = useSelector(selectFilteredCompanies);
  const selectedCompany = useSelector(selectSelectedCompany);
  const selectedCompanies = useSelector(selectSelectedCompanies);
  const viewMode = useSelector(selectViewMode);
  const filters = useSelector(selectFilters);
  const pagination = useSelector(selectPagination);
  const stats = useSelector(selectStats);
  const lastUpdated = useSelector(selectLastUpdated);

  // 상태
  const loading = useSelector(selectCompanyLoading);
  const error = useSelector(selectCompanyError);

  // 계산된 데이터
  const activeCompanies = useSelector(selectActiveCompanies);
  const inactiveCompanies = useSelector(selectInactiveCompanies);
  const maintenanceCompanies = useSelector(selectMaintenanceCompanies);
  const selectedCompanyObjects = useSelector(selectSelectedCompanyObjects);
  const companyStats = useSelector(selectCompanyStats);
  const searchStats = useSelector(selectSearchStats);

  // 유틸리티
  const isAnyLoading = useSelector(selectIsAnyLoading);
  const hasAnyError = useSelector(selectHasAnyError);

  return {
    // 기본 데이터
    companies,
    filteredCompanies,
    selectedCompany,
    selectedCompanies,
    viewMode,
    filters,
    pagination,
    stats,
    lastUpdated,

    // 상태
    loading,
    error,

    // 계산된 데이터
    activeCompanies,
    inactiveCompanies,
    maintenanceCompanies,
    selectedCompanyObjects,
    companyStats,
    searchStats,

    // 유틸리티
    isAnyLoading,
    hasAnyError,

    // 편의 속성들
    totalCompanies: companies.length,
    hasCompanies: companies.length > 0,
    hasSelectedCompanies: selectedCompanies.length > 0,
    isListView: viewMode === 'list',
    isDetailView: viewMode === 'detail',
    isCreateView: viewMode === 'create',
    isEditView: viewMode === 'edit',
    hasFilters: Boolean(filters.search || filters.status || filters.showOnlyActive)
  };
};
