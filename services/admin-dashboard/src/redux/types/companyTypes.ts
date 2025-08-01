import type { Company, CompanyFilters, CompanyStatus } from '../../types/company';

// Redux 전용 타입 정의
export interface CompanyStats {
  totalCompanies: number;
  activeCompanies: number;
  inactiveCompanies: number;
  maintenanceCompanies: number;
  totalCourses: number;
  totalRevenue: number;
  averageRevenue: number;
}

export interface CompanyLoadingState {
  list: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  bulkAction: boolean;
  stats: boolean;
}

export interface CompanyErrorState {
  list: string | null;
  create: string | null;
  update: string | null;
  delete: string | null;
  bulkAction: string | null;
  stats: string | null;
}

export interface CompanyPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type CompanyViewMode = 'list' | 'detail' | 'create' | 'edit';

export interface CompanyState {
  // 기본 데이터
  companies: Company[];
  selectedCompany: Company | null;
  
  // UI 상태
  viewMode: CompanyViewMode;
  selectedCompanies: number[];
  
  // 필터링
  filters: CompanyFilters;
  filteredCompanies: Company[];
  
  // API 상태
  loading: CompanyLoadingState;
  error: CompanyErrorState;
  
  // 통계
  stats: CompanyStats | null;
  
  // 캐시 및 메타데이터
  lastUpdated: string | null;
  pagination: CompanyPagination;
}

// API 관련 타입
export interface FetchCompaniesPayload {
  filters?: CompanyFilters;
  page?: number;
  limit?: number;
}

export interface UpdateCompanyStatusPayload {
  id: number;
  status: CompanyStatus;
}

export interface BulkUpdateStatusPayload {
  companyIds: number[];
  status: CompanyStatus;
}

export interface BulkDeletePayload {
  companyIds: number[];
}

