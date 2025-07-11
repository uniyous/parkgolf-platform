import React, { useState, useMemo } from 'react';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import type { User, UserMembershipTier, UserStatus } from '../../types';

interface EnhancedUserListProps {
  users: User[];
  isLoading: boolean;
  onSelectUser: (user: User) => void;
  onCreateUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onUpdateStatus: (user: User, status: UserStatus) => void;
  onUpdateMembershipTier: (user: User, tier: UserMembershipTier) => void;
  onManagePermissions: (user: User) => void;
  selectedUsers: User[];
  onSelectionChange: (users: User[]) => void;
  onRefresh: () => void;
}

type SortField = 'name' | 'email' | 'username' | 'membershipTier' | 'status' | 'createdAt' | 'lastLoginAt';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  search: string;
  membershipTier: UserMembershipTier | 'ALL';
  status: UserStatus | 'ALL';
}

export const EnhancedUserList: React.FC<EnhancedUserListProps> = ({
  users,
  isLoading,
  onSelectUser,
  onCreateUser,
  onEditUser,
  onDeleteUser,
  onUpdateStatus,
  onUpdateMembershipTier,
  onManagePermissions,
  selectedUsers,
  onSelectionChange,
  onRefresh,
}) => {
  const { showConfirmation } = useConfirmation();
  const { currentAdmin, hasPermission } = useAdminAuth();

  // 필터 및 정렬 상태
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    membershipTier: 'ALL',
    status: 'ALL',
  });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // 필터링 및 정렬된 사용자 목록
  const filteredAndSortedUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) {
      return [];
    }
    
    let filtered = users.filter(user => {
      // 검색 필터
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.username.toLowerCase().includes(searchLower) ||
          (user.phoneNumber && user.phoneNumber.includes(filters.search))
        );
      }
      return true;
    }).filter(user => {
      // 멤버십 등급 필터
      if (filters.membershipTier !== 'ALL') {
        return user.membershipTier === filters.membershipTier;
      }
      return true;
    }).filter(user => {
      // 상태 필터
      if (filters.status !== 'ALL') {
        return user.status === filters.status;
      }
      return true;
    }).filter(user => {
      // 권한 기반 필터 - 현재는 모든 관리자가 모든 고객을 볼 수 있지만
      // 실제 환경에서는 예약 내역을 통해 해당 골프장 이용 고객만 필터링
      if (!currentAdmin) return false;
      
      // 플랫폼 관리자는 모든 고객 조회 가능
      if (currentAdmin.scope === 'PLATFORM') {
        return true;
      }
      
      // 회사/코스 관리자는 모든 고객 조회 가능 (실제로는 자신의 골프장 이용 고객만)
      // TODO: 실제 환경에서는 booking 테이블을 조인하여 해당 골프장 이용 고객만 필터링
      if (currentAdmin.scope === 'COMPANY' || currentAdmin.scope === 'COURSE') {
        return true;
      }
      
      return false;
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
        case 'username':
          aValue = a.username.toLowerCase();
          bValue = b.username.toLowerCase();
          break;
        case 'membershipTier':
          aValue = a.membershipTier;
          bValue = b.membershipTier;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'lastLoginAt':
          aValue = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          bValue = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, filters, sortField, sortDirection]);

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
      onSelectionChange(filteredAndSortedUsers);
    } else {
      onSelectionChange([]);
    }
  };

  // 개별 선택/해제
  const handleSelectUser = (user: User, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedUsers, user]);
    } else {
      onSelectionChange(selectedUsers.filter(u => u.id !== user.id));
    }
  };

  // 필터 초기화
  const resetFilters = () => {
    setFilters({
      search: '',
      membershipTier: 'ALL',
      status: 'ALL',
    });
  };

  // 삭제 확인
  const handleDeleteUser = async (user: User) => {
    const confirmed = await showConfirmation({
      title: '사용자 삭제',
      message: `${user.name}(${user.username}) 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      cancelText: '취소',
      type: 'danger',
    });

    if (confirmed) {
      onDeleteUser(user);
    }
  };

  // 상태 변경 확인
  const handleStatusChange = async (user: User, newStatus: UserStatus) => {
    const statusLabels = {
      ACTIVE: '활성',
      INACTIVE: '비활성',
      SUSPENDED: '정지'
    };

    const confirmed = await showConfirmation({
      title: '상태 변경',
      message: `${user.name}(${user.username}) 사용자의 상태를 '${statusLabels[newStatus]}'로 변경하시겠습니까?`,
      confirmText: '변경',
      cancelText: '취소',
      type: newStatus === 'SUSPENDED' ? 'danger' : 'info',
    });

    if (confirmed) {
      onUpdateStatus(user, newStatus);
    }
  };

  // Membership tier badge colors
  const getMembershipTierBadgeColor = (tier: UserMembershipTier): string => {
    switch (tier) {
      case 'PREMIUM': return 'bg-purple-100 text-purple-800';
      case 'REGULAR': return 'bg-blue-100 text-blue-800';
      case 'GUEST': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Status badge colors
  const getStatusBadgeColor = (status: UserStatus): string => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Membership tier labels
  const getMembershipTierLabel = (tier: UserMembershipTier): string => {
    switch (tier) {
      case 'PREMIUM': return '프리미엄 멤버';
      case 'REGULAR': return '일반 멤버';
      case 'GUEST': return '비회원';
      default: return tier;
    }
  };

  // Status labels
  const getStatusLabel = (status: UserStatus): string => {
    switch (status) {
      case 'ACTIVE': return '활성';
      case 'INACTIVE': return '비활성';
      case 'SUSPENDED': return '정지';
      default: return status;
    }
  };

  // Format date
  const formatDate = (dateString: string | Date | null): string => {
    if (!dateString) return '없음';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string | Date | null): string => {
    if (!dateString) return '로그인 기록 없음';
    
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    return `${Math.floor(diffDays / 30)}개월 전`;
  };

  const isAllSelected = filteredAndSortedUsers.length > 0 && 
    filteredAndSortedUsers.every(user => selectedUsers.some(selected => selected.id === user.id));
  const isSomeSelected = selectedUsers.length > 0 && !isAllSelected;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">사용자 목록을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">사용자 관리</h2>
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
            <span>전체 {users.length}명</span>
            <span>•</span>
            <span>프리미엄 {users.filter(u => u.membershipTier === 'PREMIUM').length}명</span>
            <span>•</span>
            <span>일반 {users.filter(u => u.membershipTier === 'REGULAR').length}명</span>
            <span>•</span>
            <span>비회원 {users.filter(u => u.membershipTier === 'GUEST').length}명</span>
            {filteredAndSortedUsers.length !== users.length && (
              <>
                <span>•</span>
                <span className="text-blue-600 font-medium">필터링됨 {filteredAndSortedUsers.length}명</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            새로고침
          </button>
          {hasPermission('MANAGE_USERS') && (
            <button
              onClick={onCreateUser}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              새 사용자
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 검색 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
            <div className="relative">
              <input
                type="text"
                placeholder="이름, 이메일, 사용자명 검색..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 멤버십 등급 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">멤버십 등급</label>
            <select
              value={filters.membershipTier}
              onChange={(e) => setFilters(prev => ({ ...prev, membershipTier: e.target.value as UserMembershipTier | 'ALL' }))}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">전체 등급</option>
              <option value="PREMIUM">프리미엄 멤버</option>
              <option value="REGULAR">일반 멤버</option>
              <option value="GUEST">비회원</option>
            </select>
          </div>

          {/* 상태 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as UserStatus | 'ALL' }))}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">전체 상태</option>
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
              <option value="SUSPENDED">정지</option>
            </select>
          </div>

          {/* 필터 초기화 및 보기 모드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">옵션</label>
            <div className="flex space-x-2">
              <button
                onClick={resetFilters}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                필터 초기화
              </button>
              <div className="flex border border-gray-300 rounded-md">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 text-sm ${viewMode === 'table' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                  } rounded-l-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 text-sm ${viewMode === 'grid' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                  } rounded-r-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users List/Grid */}
      {filteredAndSortedUsers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filters.search || filters.membershipTier !== 'ALL' || filters.status !== 'ALL' 
              ? '조건에 맞는 사용자가 없습니다' 
              : '등록된 사용자가 없습니다'
            }
          </h3>
          <p className="text-gray-500 mb-4">
            {filters.search || filters.membershipTier !== 'ALL' || filters.status !== 'ALL'
              ? '필터 조건을 변경하거나 초기화해보세요.'
              : '새 사용자 추가 버튼을 클릭하여 첫 번째 사용자를 추가하세요.'
            }
          </p>
          <div className="flex justify-center space-x-3">
            {(filters.search || filters.membershipTier !== 'ALL' || filters.status !== 'ALL') && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                필터 초기화
              </button>
            )}
            {hasPermission('MANAGE_USERS') && (
              <button
                onClick={onCreateUser}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
              >
                새 사용자 추가
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={input => {
                  if (input) input.indeterminate = isSomeSelected;
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-4 flex-1 grid grid-cols-6 gap-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>이름</span>
                  {sortField === 'name' && (
                    <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleSort('email')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>이메일</span>
                  {sortField === 'email' && (
                    <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleSort('membershipTier')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>멤버십 등급</span>
                  {sortField === 'membershipTier' && (
                    <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>상태</span>
                  {sortField === 'status' && (
                    <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleSort('lastLoginAt')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>마지막 로그인</span>
                  {sortField === 'lastLoginAt' && (
                    <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                <span>작업</span>
              </div>
            </div>
          </div>
          <ul className="divide-y divide-gray-200">
            {filteredAndSortedUsers.map((user) => (
              <li key={user.id} className="hover:bg-gray-50">
                <div className="px-4 py-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedUsers.some(selected => selected.id === user.id)}
                      onChange={(e) => handleSelectUser(user, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-4 flex-1 grid grid-cols-6 gap-4 items-center">
                      {/* 이름 */}
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                      </div>

                      {/* 이메일 */}
                      <div>
                        <p className="text-sm text-gray-900">{user.email}</p>
                        {user.phoneNumber && (
                          <p className="text-sm text-gray-500">{user.phoneNumber}</p>
                        )}
                      </div>

                      {/* 멤버십 등급 */}
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMembershipTierBadgeColor(user.membershipTier)}`}>
                          {getMembershipTierLabel(user.membershipTier)}
                        </span>
                        {user.membershipEndDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(user.membershipEndDate) > new Date() ? '만료일: ' : '만료됨: '}
                            {new Date(user.membershipEndDate).toLocaleDateString('ko-KR')}
                          </p>
                        )}
                      </div>

                      {/* 상태 */}
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.status)}`}>
                          {getStatusLabel(user.status)}
                        </span>
                      </div>

                      {/* 마지막 로그인 */}
                      <div>
                        <p className="text-sm text-gray-900">{formatRelativeTime(user.lastLoginAt)}</p>
                        <p className="text-sm text-gray-500">{formatDate(user.createdAt)} 가입</p>
                      </div>

                      {/* 작업 */}
                      <div className="flex items-center space-x-2">
                        {/* 상태 변경 버튼들 */}
                        <div className="flex items-center space-x-1">
                          {user.status !== 'ACTIVE' && (
                            <button
                              onClick={() => handleStatusChange(user, 'ACTIVE')}
                              className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                              title="활성화"
                            >
                              활성화
                            </button>
                          )}
                          {user.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleStatusChange(user, 'INACTIVE')}
                              className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                              title="비활성화"
                            >
                              비활성화
                            </button>
                          )}
                          {user.status !== 'SUSPENDED' && (
                            <button
                              onClick={() => handleStatusChange(user, 'SUSPENDED')}
                              className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                              title="정지"
                            >
                              정지
                            </button>
                          )}
                        </div>

                        {/* 기본 작업 버튼들 */}
                        <div className="flex items-center space-x-2">
                          {hasPermission('MANAGE_USERS') && (
                            <button
                              onClick={() => onEditUser(user)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              수정
                            </button>
                          )}
                          {hasPermission('MANAGE_USERS') && (
                            <button
                              onClick={() => onManagePermissions(user)}
                              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                            >
                              권한
                            </button>
                          )}
                          {hasPermission('MANAGE_USERS') && currentAdmin?.scope === 'PLATFORM' && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 cursor-pointer"
              onClick={() => onSelectUser(user)}
            >
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={selectedUsers.some(selected => selected.id === user.id)}
                  onChange={(e) => handleSelectUser(user, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-lg font-medium text-gray-700">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-medium text-gray-900 truncate">{user.name}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMembershipTierBadgeColor(user.membershipTier)}`}>
                      {getMembershipTierLabel(user.membershipTier)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  {user.totalBookings && (
                    <p className="text-xs text-gray-400">총 {user.totalBookings}회 예약 • {user.loyaltyPoints || 0}P</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.status)}`}>
                    {getStatusLabel(user.status)}
                  </span>
                  <p className="text-xs text-gray-400">
                    {formatRelativeTime(user.lastLoginAt)}
                  </p>
                </div>
                
                <div className="mt-3 flex justify-between items-center">
                  <div className="flex space-x-2">
                    {hasPermission('MANAGE_USERS') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditUser(user);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        수정
                      </button>
                    )}
                    {hasPermission('MANAGE_USERS') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onManagePermissions(user);
                        }}
                        className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                      >
                        권한
                      </button>
                    )}
                  </div>
                  {hasPermission('MANAGE_USERS') && currentAdmin?.scope === 'PLATFORM' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUser(user);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};