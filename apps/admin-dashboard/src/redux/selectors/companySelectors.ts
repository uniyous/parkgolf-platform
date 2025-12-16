import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// 기본 셀렉터들
export const selectCompanies = (state: RootState) => state.company.companies;
export const selectFilteredCompanies = (state: RootState) => state.company.filteredCompanies;
export const selectSelectedCompany = (state: RootState) => state.company.selectedCompany;
export const selectSelectedCompanies = (state: RootState) => state.company.selectedCompanies;
export const selectViewMode = (state: RootState) => state.company.viewMode;
export const selectFilters = (state: RootState) => state.company.filters;
export const selectPagination = (state: RootState) => state.company.pagination;
export const selectStats = (state: RootState) => state.company.stats;
export const selectLastUpdated = (state: RootState) => state.company.lastUpdated;

// 로딩 상태 셀렉터들
export const selectCompanyLoading = (state: RootState) => state.company.loading;

// 에러 상태 셀렉터들
export const selectCompanyError = (state: RootState) => state.company.error;

// 복합 셀렉터들 (메모이제이션)
export const selectActiveCompanies = createSelector(
  [selectCompanies],
  (companies) => companies.filter(company => company.status === 'ACTIVE')
);

export const selectInactiveCompanies = createSelector(
  [selectCompanies],
  (companies) => companies.filter(company => company.status === 'INACTIVE')
);

export const selectMaintenanceCompanies = createSelector(
  [selectCompanies],
  (companies) => companies.filter(company => company.status === 'MAINTENANCE')
);

export const selectSelectedCompanyObjects = createSelector(
  [selectCompanies, selectSelectedCompanies],
  (companies, selectedIds) => 
    companies.filter(company => selectedIds.includes(company.id))
);

export const selectCompanyStats = createSelector(
  [selectCompanies],
  (companies): {
    totalCompanies: number;
    activeCompanies: number;
    inactiveCompanies: number;
    maintenanceCompanies: number;
    totalCourses: number;
    totalRevenue: number;
    averageRevenue: number;
  } => ({
    totalCompanies: companies.length,
    activeCompanies: companies.filter(c => c.status === 'ACTIVE').length,
    inactiveCompanies: companies.filter(c => c.status === 'INACTIVE').length,
    maintenanceCompanies: companies.filter(c => c.status === 'MAINTENANCE').length,
    totalCourses: companies.reduce((sum, c) => sum + (c.coursesCount || 0), 0),
    totalRevenue: companies.reduce((sum, c) => sum + (c.totalRevenue || 0), 0),
    averageRevenue: companies.length > 0 
      ? companies.reduce((sum, c) => sum + (c.totalRevenue || 0), 0) / companies.length 
      : 0
  })
);

export const selectIsAnyLoading = createSelector(
  [selectCompanyLoading],
  (loading) => Object.values(loading).some(Boolean)
);

export const selectHasAnyError = createSelector(
  [selectCompanyError],
  (error) => Object.values(error).some(Boolean)
);


// 검색 결과 통계
export const selectSearchStats = createSelector(
  [selectCompanies, selectFilteredCompanies, selectFilters],
  (allCompanies, filteredCompanies, filters) => ({
    totalResults: filteredCompanies.length,
    totalCompanies: allCompanies.length,
    isFiltered: Boolean(filters.search || filters.status || filters.showOnlyActive),
    filteredPercentage: allCompanies.length > 0 
      ? Math.round((filteredCompanies.length / allCompanies.length) * 100) 
      : 0
  })
);