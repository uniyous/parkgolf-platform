import React, { useState, useMemo, useEffect } from 'react';
import { useAdminActions } from '../../hooks/useAdminActions';
import { useRolePermission } from '../../hooks/useRolePermission';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useAuthStore, useCurrentAdmin } from '@/stores';
import type { Admin, AdminRole, AdminScope } from '../../types';
import {
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_COLORS,
  isPlatformAdmin,
  isCompanyAdmin,
  canManageAdmin,
  ADMIN_HIERARCHY
} from '@/utils';

interface EnhancedAdminListProps {
  onSelectAdmin: (admin: Admin) => void;
  onCreateAdmin: () => void;
  onEditAdmin: (admin: Admin) => void;
  onDeleteAdmin: (admin: Admin) => void;
  onManagePermissions: (admin: Admin) => void;
  selectedAdmins: Admin[];
  onSelectionChange: (admins: Admin[]) => void;
}

type SortField = 'name' | 'email' | 'role' | 'scope' | 'hierarchy' | 'createdAt' | 'lastLoginAt';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  search: string;
  role: AdminRole | 'ALL';
  scope: AdminScope | 'ALL';
  status: 'ALL' | 'ACTIVE' | 'INACTIVE';
}

export const EnhancedAdminList: React.FC<EnhancedAdminListProps> = ({
  onSelectAdmin,
  onCreateAdmin,
  onEditAdmin,
  onDeleteAdmin,
  onManagePermissions,
  selectedAdmins,
  onSelectionChange,
}) => {
  const { admins, isLoading, fetchAdmins } = useAdminActions();
  const { hasPermission } = useRolePermission();
  const { showConfirmation } = useConfirmation();
  const currentAdmin = useCurrentAdmin();
  const hasManageAdmins = useAuthStore((state) => state.hasPermission('ADMINS'));

  // 필터 및 정렬 상태
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    role: 'ALL',
    scope: 'ALL',
    status: 'ALL',
  });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // 초기 데이터 로드 (컴포넌트 마운트 시에만 실행)
  useEffect(() => {
    console.log('🔄 Fetching admins on component mount...');
    fetchAdmins();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 필터링 및 정렬된 관리자 목록
  const filteredAndSortedAdmins = useMemo(() => {
    if (!admins || !Array.isArray(admins)) {
      return [];
    }
    
    let filtered = admins.filter(admin => {
      // 검색 필터
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          admin.name.toLowerCase().includes(searchLower) ||
          admin.email.toLowerCase().includes(searchLower) ||
          admin.username.toLowerCase().includes(searchLower)
        );
      }
      return true;
    }).filter(admin => {
      // 역할 필터
      if (filters.role !== 'ALL') {
        return admin.role === filters.role;
      }
      return true;
    }).filter(admin => {
      // 범위 필터
      if (filters.scope !== 'ALL') {
        return admin.scope === filters.scope;
      }
      return true;
    }).filter(admin => {
      // 상태 필터
      if (filters.status === 'ACTIVE') {
        return admin.isActive;
      } else if (filters.status === 'INACTIVE') {
        return !admin.isActive;
      }
      return true;
    }).filter(admin => {
      // 권한 기반 필터 - 현재 로그인한 관리자가 관리할 수 있는 관리자만 표시
      if (!currentAdmin) return false;

      // 시스템 관리자 (ADMIN, SUPPORT)는 모든 관리자 볼 수 있음
      if (currentAdmin.role === 'ADMIN' || currentAdmin.role === 'SUPPORT') {
        return true;
      }

      // 운영 관리자 (MANAGER)는 하위 직급만 볼 수 있음
      if (currentAdmin.role === 'MANAGER') {
        // 자기 자신은 항상 포함
        if (admin.id === currentAdmin.id) return true;
        // STAFF, VIEWER만 관리 가능
        return admin.role === 'STAFF' || admin.role === 'VIEWER';
      }

      // STAFF, VIEWER는 자신만 볼 수 있음
      return admin.id === currentAdmin.id;
    });

    // 정렬
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'scope':
          aValue = a.scope;
          bValue = b.scope;
          break;
        case 'hierarchy':
          aValue = ADMIN_HIERARCHY[a.role] || 0;
          bValue = ADMIN_HIERARCHY[b.role] || 0;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || '');
          bValue = new Date(b.createdAt || '');
          break;
        case 'lastLoginAt':
          aValue = new Date(a.lastLoginAt || '');
          bValue = new Date(b.lastLoginAt || '');
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [admins, filters, sortField, sortDirection]);

  // 정렬 핸들러
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredAndSortedAdmins);
    } else {
      onSelectionChange([]);
    }
  };

  // 개별 선택/해제
  const handleSelectAdmin = (admin: Admin, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedAdmins, admin]);
    } else {
      onSelectionChange(selectedAdmins.filter(a => a.id !== admin.id));
    }
  };

  // 삭제 확인
  const handleDeleteConfirm = async (admin: Admin) => {
    const confirmed = await showConfirmation({
      title: '관리자 삭제',
      message: `${admin.name}(${admin.username}) 관리자를 삭제하시겠습니까?`,
      confirmText: '삭제',
      cancelText: '취소',
      type: 'danger',
    });

    if (confirmed) {
      onDeleteAdmin(admin);
    }
  };

  // 필터 초기화
  const resetFilters = () => {
    setFilters({
      search: '',
      role: 'ALL',
      scope: 'ALL',
      status: 'ALL',
    });
  };

  // 역할별 배지 스타일 (새로운 유틸리티 함수 사용)
  const getRoleBadgeStyle = (role: AdminRole) => {
    return ADMIN_ROLE_COLORS[role] || 'bg-gray-100 text-gray-800';
  };

  // 역할명 한글 변환 (새로운 유틸리티 함수 사용)
  const getRoleLabel = (role: AdminRole) => {
    return ADMIN_ROLE_LABELS[role] || role;
  };

  // 범위별 배지 스타일
  const getScopeBadgeStyle = (scope: AdminScope) => {
    switch (scope) {
      case 'SYSTEM': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'OPERATION': return 'bg-green-50 text-green-700 border-green-200';
      case 'VIEW': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // 범위명 한글 변환
  const getScopeLabel = (scope: AdminScope) => {
    const scopeLabels = {
      'SYSTEM': '시스템',
      'OPERATION': '운영',
      'VIEW': '조회',
    };
    return scopeLabels[scope] || scope;
  };

  // 통계 계산
  const stats = useMemo(() => {
    const adminsList = admins || [];
    return {
      total: adminsList.length,
      active: adminsList.filter(a => a.isActive).length,
      inactive: adminsList.filter(a => !a.isActive).length,
      byScope: {
        SYSTEM: adminsList.filter(a => a.role === 'ADMIN' || a.role === 'SUPPORT').length,
        OPERATION: adminsList.filter(a => a.role === 'MANAGER' || a.role === 'STAFF').length,
        VIEW: adminsList.filter(a => a.role === 'VIEWER').length,
      },
      byRole: {
        ADMIN: adminsList.filter(a => a.role === 'ADMIN').length,
        SUPPORT: adminsList.filter(a => a.role === 'SUPPORT').length,
        MANAGER: adminsList.filter(a => a.role === 'MANAGER').length,
        STAFF: adminsList.filter(a => a.role === 'STAFF').length,
        VIEWER: adminsList.filter(a => a.role === 'VIEWER').length,
      },
    };
  }, [admins]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">관리자 목록을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 및 통계 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">관리자 관리</h2>
            <p className="mt-1 text-sm text-gray-500">
              시스템 관리자들의 계정과 권한을 관리합니다
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* 뷰 모드 전환 */}
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                  viewMode === 'table'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                📋 표
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                  viewMode === 'grid'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                ⊞ 격자
              </button>
            </div>

            {/* 새 관리자 추가 버튼 */}
            {hasManageAdmins && currentAdmin && (
              currentAdmin.scope === 'SYSTEM' ||
              (currentAdmin.scope === 'OPERATION' && ['MANAGER'].includes(currentAdmin.role))
            ) && (
              <button
                onClick={onCreateAdmin}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                새 관리자 추가
              </button>
            )}
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-600">전체 관리자</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-green-600">활성 관리자</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.byScope.SYSTEM}</div>
            <div className="text-sm text-purple-600">시스템 관리자</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.byScope.OPERATION}</div>
            <div className="text-sm text-green-600">운영 관리자</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.byScope.VIEW}</div>
            <div className="text-sm text-yellow-600">조회 전용</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
            <div className="text-sm text-gray-600">비활성</div>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 검색 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="이름, 이메일, 사용자명으로 검색..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 관리 범위 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              관리 범위
            </label>
            <select
              value={filters.scope}
              onChange={(e) => setFilters({ ...filters, scope: e.target.value as AdminScope | 'ALL' })}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">모든 범위</option>
              <option value="SYSTEM">시스템</option>
              <option value="OPERATION">운영</option>
              <option value="VIEW">조회</option>
            </select>
          </div>

          {/* 역할 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              역할
            </label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value as AdminRole | 'ALL' })}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">모든 역할</option>
              <option value="ADMIN">시스템 관리자</option>
              <option value="SUPPORT">고객지원</option>
              <option value="MANAGER">운영 관리자</option>
              <option value="STAFF">현장 직원</option>
              <option value="VIEWER">조회 전용</option>
            </select>
          </div>

          {/* 상태 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상태
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE' })}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">모든 상태</option>
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
            </select>
          </div>
        </div>

        {/* 필터 초기화 */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={resetFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            필터 초기화
          </button>
        </div>

        {/* 선택된 관리자 정보 */}
        {selectedAdmins.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-blue-900">
                  {selectedAdmins.length}명의 관리자가 선택되었습니다
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onSelectionChange([])}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  선택 해제
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 관리자 목록 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredAndSortedAdmins.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">관리자가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.role !== 'ALL' || filters.status !== 'ALL' 
                ? '검색 조건에 맞는 관리자가 없습니다.' 
                : '등록된 관리자가 없습니다.'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* 테이블 뷰 */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedAdmins.length === filteredAndSortedAdmins.length && filteredAndSortedAdmins.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th 
                    onClick={() => handleSort('name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-1">
                      <span>관리자 정보</span>
                      {sortField === 'name' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('role')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-1">
                      <span>역할</span>
                      {sortField === 'role' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th 
                    onClick={() => handleSort('lastLoginAt')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-1">
                      <span>마지막 로그인</span>
                      {sortField === 'lastLoginAt' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedAdmins.map((admin) => (
                  <tr
                    key={admin.id}
                    onClick={() => onSelectAdmin(admin)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedAdmins.some(a => a.id === admin.id)}
                        onChange={(e) => handleSelectAdmin(admin, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {admin.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {admin.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {admin.email}
                          </div>
                          <div className="text-xs text-gray-400">
                            @{admin.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeStyle(admin.role)}`}>
                        {getRoleLabel(admin.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        admin.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.isActive ? '✅ 활성' : '❌ 비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {admin.lastLoginAt 
                        ? new Date(admin.lastLoginAt).toLocaleDateString('ko-KR') 
                        : '없음'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex space-x-2">
                        {hasManageAdmins && canManageAdmin(currentAdmin?.role || 'ADMIN', admin.role) && (
                          <button
                            onClick={() => onEditAdmin(admin)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="정보 수정"
                          >
                            ✏️
                          </button>
                        )}
                        {canManageAdmin(currentAdmin?.role || 'ADMIN', admin.role) && (
                          <button
                            onClick={() => onManagePermissions(admin)}
                            className="text-purple-600 hover:text-purple-900 transition-colors"
                            title="권한 관리"
                          >
                            🔐
                          </button>
                        )}
                        {hasManageAdmins && canManageAdmin(currentAdmin?.role || 'ADMIN', admin.role) && admin.id !== currentAdmin?.id && (
                          <button
                            onClick={() => handleDeleteConfirm(admin)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="삭제"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* 그리드 뷰 */
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedAdmins.map((admin) => (
                <div
                  key={admin.id}
                  onClick={() => onSelectAdmin(admin)}
                  className={`relative bg-white border rounded-lg p-6 cursor-pointer transition-all hover:shadow-md ${
                    selectedAdmins.some(a => a.id === admin.id) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200'
                  }`}
                >
                  {/* 선택 체크박스 */}
                  <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedAdmins.some(a => a.id === admin.id)}
                      onChange={(e) => handleSelectAdmin(admin, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center space-x-4 mb-4">
                    <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-lg font-medium text-gray-700">
                        {admin.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{admin.name}</h3>
                      <p className="text-sm text-gray-500">@{admin.username}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-gray-600">{admin.email}</div>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeStyle(admin.role)}`}>
                        {getRoleLabel(admin.role)}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        admin.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.isActive ? '활성' : '비활성'}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                    {hasManageAdmins && canManageAdmin(currentAdmin?.role || 'ADMIN', admin.role) && (
                      <button
                        onClick={() => onEditAdmin(admin)}
                        className="flex-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                      >
                        ✏️ 수정
                      </button>
                    )}
                    {canManageAdmin(currentAdmin?.role || 'ADMIN', admin.role) && (
                      <button
                        onClick={() => onManagePermissions(admin)}
                        className="flex-1 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
                      >
                        🔐 권한
                      </button>
                    )}
                    {hasManageAdmins && canManageAdmin(currentAdmin?.role || 'ADMIN', admin.role) && admin.id !== currentAdmin?.id && (
                      <button
                        onClick={() => handleDeleteConfirm(admin)}
                        className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 결과 요약 */}
      <div className="text-center text-sm text-gray-500">
        총 {admins.length}명 중 {filteredAndSortedAdmins.length}명 표시
        {selectedAdmins.length > 0 && ` · ${selectedAdmins.length}명 선택됨`}
      </div>
    </div>
  );
};