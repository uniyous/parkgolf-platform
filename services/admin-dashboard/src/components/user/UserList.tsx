import React from 'react';
import type { User, UserMembershipTier, UserStatus } from '../../types';

interface UserListProps {
  users: User[];
  selectedUser: User | null;
  isLoading: boolean;
  onSelectUser: (user: User) => void;
  onCreateUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onUpdateStatus: (user: User, status: UserStatus) => void;
  onUpdateRole: (user: User, role: UserRole) => void;
  onManagePermissions: (user: User) => void;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  selectedUser,
  isLoading,
  onSelectUser,
  onCreateUser,
  onEditUser,
  onDeleteUser,
  onUpdateStatus,
  onUpdateRole,
  onManagePermissions
}) => {
  // Role badge colors
  const getRoleBadgeColor = (role: UserRole): string => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'MANAGER': return 'bg-blue-100 text-blue-800';
      case 'USER': return 'bg-green-100 text-green-800';
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
  const formatDate = (date: Date | null): string => {
    if (!date) return '없음';
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Format relative time
  const formatRelativeTime = (date: Date | null): string => {
    if (!date) return '로그인 기록 없음';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    return `${Math.floor(diffDays / 30)}개월 전`;
  };

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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">사용자 목록</h2>
          <p className="mt-1 text-sm text-gray-500">
            총 {users.length}명의 사용자가 등록되어 있습니다.
          </p>
        </div>
        <button
          onClick={onCreateUser}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 사용자 추가
        </button>
      </div>

      {/* User Grid */}
      {users.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 사용자가 없습니다</h3>
          <p className="text-gray-500 mb-4">새 사용자 추가 버튼을 클릭하여 첫 번째 사용자를 추가하세요.</p>
          <button
            onClick={onCreateUser}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
          >
            새 사용자 추가
          </button>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {users.map((user) => (
              <li key={user.id}>
                <div 
                  className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
                    selectedUser?.id === user.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => onSelectUser(user)}
                >
                  <div className="flex items-center justify-between">
                    {/* User Info */}
                    <div className="flex items-center space-x-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Basic Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900">
                            {user.name}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.membershipTier)}`}>
                            {getMembershipTierLabel(user.membershipTier)}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.status)}`}>
                            {getStatusLabel(user.status)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-sm text-gray-500">
                            @{user.username}
                          </p>
                          <p className="text-sm text-gray-500">
                            {user.email}
                          </p>
                          {user.phoneNumber && (
                            <p className="text-sm text-gray-500">
                              {user.phoneNumber}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-xs text-gray-400">
                            마지막 로그인: {formatRelativeTime(user.lastLoginAt)}
                          </p>
                          <p className="text-xs text-gray-400">
                            가입일: {formatDate(user.createdAt)}
                          </p>
                          <p className="text-xs text-gray-400">
                            총 {user.totalBookings || 0}회 예약
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {/* Quick Status Actions */}
                      <div className="flex items-center space-x-1">
                        {user.status !== 'ACTIVE' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(user, 'ACTIVE');
                            }}
                            className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                            title="활성화"
                          >
                            활성화
                          </button>
                        )}
                        {user.status === 'ACTIVE' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(user, 'INACTIVE');
                            }}
                            className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                            title="비활성화"
                          >
                            비활성화
                          </button>
                        )}
                        {user.status !== 'SUSPENDED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(user, 'SUSPENDED');
                            }}
                            className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                            title="정지"
                          >
                            정지
                          </button>
                        )}
                      </div>

                      {/* Menu Button */}
                      <div className="relative">
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        
                        {/* Quick Actions Dropdown - simplified for now */}
                        <div className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                          <div className="py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditUser(user);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              정보 수정
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onManagePermissions(user);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              권한 관리
                            </button>
                            {(
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteUser(user);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Direct Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditUser(user);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          수정
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onManagePermissions(user);
                          }}
                          className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                        >
                          권한
                        </button>
                        {(
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteUser(user);
                            }}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};