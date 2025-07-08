import React from 'react';
import type { UserFilters, UserRole, UserStatus } from '../../types';

interface UserSearchFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  totalUsers: number;
  filteredUsers: number;
}

export const UserSearchFilters: React.FC<UserSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  totalUsers,
  filteredUsers
}) => {
  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleReset = () => {
    onFiltersChange({
      search: '',
      role: undefined,
      status: undefined,
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  const hasActiveFilters = filters.search || filters.role || filters.status;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* Search and Filters Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">검색 및 필터</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {filteredUsers}명 / 전체 {totalUsers}명
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
              placeholder="이름, 사용자명, 이메일로 검색..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Role Filter */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            역할
          </label>
          <select
            id="role"
            value={filters.role || ''}
            onChange={(e) => handleFilterChange('role', e.target.value || undefined)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">전체 역할</option>
            <option value="ADMIN">관리자</option>
            <option value="MANAGER">매니저</option>
            <option value="USER">사용자</option>
          </select>
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
            <option value="SUSPENDED">정지</option>
          </select>
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
            <option value="name">이름</option>
            <option value="username">사용자명</option>
            <option value="email">이메일</option>
            <option value="role">역할</option>
            <option value="status">상태</option>
            <option value="createdAt">가입일</option>
            <option value="lastLoginAt">마지막 로그인</option>
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
          
          {filters.role && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              역할: {filters.role === 'ADMIN' ? '관리자' : filters.role === 'MANAGER' ? '매니저' : '사용자'}
              <button
                onClick={() => handleFilterChange('role', undefined)}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-green-600 hover:bg-green-200"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.status && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              상태: {filters.status === 'ACTIVE' ? '활성' : filters.status === 'INACTIVE' ? '비활성' : '정지'}
              <button
                onClick={() => handleFilterChange('status', undefined)}
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
          활성 사용자만
        </button>
        
        <button
          onClick={() => onFiltersChange({ ...filters, role: 'ADMIN' })}
          className="inline-flex items-center px-3 py-1 text-xs bg-red-100 text-red-800 rounded-full hover:bg-red-200"
        >
          관리자만
        </button>
        
        <button
          onClick={() => onFiltersChange({ ...filters, status: 'SUSPENDED' })}
          className="inline-flex items-center px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200"
        >
          정지된 사용자
        </button>
        
        <button
          onClick={() => onFiltersChange({ ...filters, sortBy: 'lastLoginAt', sortOrder: 'desc' })}
          className="inline-flex items-center px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200"
        >
          최근 로그인순
        </button>
        
        <button
          onClick={() => onFiltersChange({ ...filters, sortBy: 'createdAt', sortOrder: 'desc' })}
          className="inline-flex items-center px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200"
        >
          최근 가입순
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
              {filteredUsers === totalUsers 
                ? `전체 ${totalUsers}명의 사용자를 표시하고 있습니다.`
                : `전체 ${totalUsers}명 중 ${filteredUsers}명의 사용자가 필터 조건과 일치합니다.`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};