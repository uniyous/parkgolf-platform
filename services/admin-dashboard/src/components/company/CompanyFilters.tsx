import React from 'react';
import type { CompanyFilters as CompanyFiltersType, CompanyStatus } from '../../types/company';

interface CompanyFiltersProps {
  filters: CompanyFiltersType;
  onFiltersChange: (filters: CompanyFiltersType) => void;
  totalCompanies: number;
  filteredCompanies: number;
}

export const CompanyFilters: React.FC<CompanyFiltersProps> = ({
  filters,
  onFiltersChange,
  totalCompanies,
  filteredCompanies
}) => {
  const handleFilterChange = (key: keyof CompanyFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleReset = () => {
    onFiltersChange({
      search: '',
      status: undefined,
      sortBy: 'name',
      sortOrder: 'asc',
      showOnlyActive: false
    });
  };

  const hasActiveFilters = filters.search || filters.status || filters.showOnlyActive;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* Search and Filters Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">검색 및 필터</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {filteredCompanies}개 / 전체 {totalCompanies}개
          </span>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="lg:col-span-2">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            검색
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              placeholder="회사명, 사업자번호, 주소로 검색..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            상태
          </label>
          <select
            id="status"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">전체 상태</option>
            <option value="ACTIVE">활성</option>
            <option value="INACTIVE">비활성</option>
            <option value="MAINTENANCE">점검 중</option>
          </select>
        </div>

        {/* Active Only Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            필터 옵션
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.showOnlyActive}
              onChange={(e) => handleFilterChange('showOnlyActive', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">활성 회사만 표시</span>
          </label>
        </div>
      </div>

      {/* Sort Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Sort By */}
        <div>
          <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
            정렬 기준
          </label>
          <select
            id="sortBy"
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="name">회사명</option>
            <option value="establishedDate">설립일</option>
            <option value="totalRevenue">총 매출</option>
            <option value="monthlyRevenue">월 매출</option>
            <option value="coursesCount">코스 수</option>
            <option value="totalBookings">예약 수</option>
            <option value="averageRating">평점</option>
            <option value="createdAt">등록일</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
            정렬 순서
          </label>
          <select
            id="sortOrder"
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="asc">오름차순</option>
            <option value="desc">내림차순</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700">활성 필터:</span>
          
          {filters.search && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              검색: "{filters.search}"
              <button
                onClick={() => handleFilterChange('search', '')}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-600 hover:bg-blue-200"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.status && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              상태: {filters.status === 'ACTIVE' ? '활성' : filters.status === 'INACTIVE' ? '비활성' : '점검 중'}
              <button
                onClick={() => handleFilterChange('status', undefined)}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-green-600 hover:bg-green-200"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.showOnlyActive && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              활성 회사만
              <button
                onClick={() => handleFilterChange('showOnlyActive', false)}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-purple-600 hover:bg-purple-200"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}

      {/* Quick Filter Buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700">빠른 필터:</span>
        
        <button
          onClick={() => onFiltersChange({ ...filters, status: 'ACTIVE' })}
          className="inline-flex items-center px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200"
        >
          활성 회사만
        </button>
        
        <button
          onClick={() => onFiltersChange({ ...filters, sortBy: 'totalRevenue', sortOrder: 'desc' })}
          className="inline-flex items-center px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200"
        >
          매출 높은순
        </button>
        
        <button
          onClick={() => onFiltersChange({ ...filters, sortBy: 'coursesCount', sortOrder: 'desc' })}
          className="inline-flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
        >
          코스 많은순
        </button>
        
        <button
          onClick={() => onFiltersChange({ ...filters, sortBy: 'establishedDate', sortOrder: 'desc' })}
          className="inline-flex items-center px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200"
        >
          최근 설립순
        </button>
        
        <button
          onClick={() => onFiltersChange({ ...filters, sortBy: 'averageRating', sortOrder: 'desc' })}
          className="inline-flex items-center px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200"
        >
          평점 높은순
        </button>
      </div>

      {/* Results Summary */}
      {hasActiveFilters && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <div className="flex items-center">
            <svg className="h-4 w-4 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-blue-700">
              {filteredCompanies === totalCompanies 
                ? `전체 ${totalCompanies}개 회사를 표시하고 있습니다.`
                : `전체 ${totalCompanies}개 중 ${filteredCompanies}개 회사가 필터 조건과 일치합니다.`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};