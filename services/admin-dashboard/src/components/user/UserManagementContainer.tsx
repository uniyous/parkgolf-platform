import React, { useState, useEffect } from 'react';
import { EnhancedUserList } from './EnhancedUserList';
import { UserForm } from './UserForm';
import { UserPermissionModal } from './UserPermissionModal';
// import { UserSearchFilters } from './UserSearchFilters';
// import { UserStats } from './UserStats';
import type { User, UserMembershipTier, UserStatus, UserFilters } from '../../types';

// Mock user data for development
const mockUsers: User[] = [
  {
    id: 1,
    username: 'john_doe',
    email: 'john.doe@example.com',
    name: '김민수',
    phoneNumber: '010-1234-5678',
    membershipTier: 'REGULAR',
    status: 'ACTIVE',
    lastLoginAt: new Date('2024-07-07T10:30:00'),
    createdAt: new Date('2024-01-15T09:00:00'),
    isActive: true,
    membershipStartDate: new Date('2024-01-15T09:00:00'),
    membershipEndDate: new Date('2024-12-31T23:59:59'),
    totalBookings: 15,
    totalSpent: 450000,
    loyaltyPoints: 1250
  },
  {
    id: 2,
    username: 'jane_premium',
    email: 'jane.premium@example.com',
    name: '박지영',
    phoneNumber: '010-9876-5432',
    membershipTier: 'PREMIUM',
    status: 'ACTIVE',
    lastLoginAt: new Date('2024-07-07T14:20:00'),
    createdAt: new Date('2024-01-10T08:30:00'),
    isActive: true,
    membershipStartDate: new Date('2024-01-10T08:30:00'),
    membershipEndDate: new Date('2025-01-09T23:59:59'),
    totalBookings: 38,
    totalSpent: 1200000,
    loyaltyPoints: 3800
  },
  {
    id: 3,
    username: 'mike_regular',
    email: 'mike.regular@example.com',
    name: '이성호',
    phoneNumber: '010-5555-7777',
    membershipTier: 'REGULAR',
    status: 'ACTIVE',
    lastLoginAt: new Date('2024-07-06T16:45:00'),
    createdAt: new Date('2024-02-01T10:00:00'),
    isActive: true,
    membershipStartDate: new Date('2024-02-01T10:00:00'),
    membershipEndDate: new Date('2024-07-31T23:59:59'),
    totalBookings: 22,
    totalSpent: 660000,
    loyaltyPoints: 2200
  },
  {
    id: 4,
    username: 'susan_guest',
    email: 'susan.guest@example.com',
    name: '최수진',
    phoneNumber: '010-3333-4444',
    membershipTier: 'GUEST',
    status: 'INACTIVE',
    lastLoginAt: new Date('2024-06-15T11:20:00'),
    createdAt: new Date('2024-03-01T14:30:00'),
    isActive: false,
    totalBookings: 3,
    totalSpent: 120000,
    loyaltyPoints: 120
  },
  {
    id: 5,
    username: 'tom_suspended',
    email: 'tom.suspended@example.com',
    name: '정민철',
    phoneNumber: '010-2222-3333',
    membershipTier: 'GUEST',
    status: 'SUSPENDED',
    lastLoginAt: new Date('2024-05-20T09:15:00'),
    createdAt: new Date('2024-04-01T12:00:00'),
    isActive: false,
    totalBookings: 1,
    totalSpent: 30000,
    loyaltyPoints: 30
  }
];

type ViewMode = 'list' | 'create' | 'edit' | 'permissions';

export const UserManagementContainer: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [users, setUsers] = useState<User[]>(mockUsers);
  // const [filteredUsers, setFilteredUsers] = useState<User[]>(mockUsers);"
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionUser, setPermissionUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    membershipTier: undefined,
    status: undefined,
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Filtering and search is now handled within EnhancedUserList

  // User selection handlers
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
  };

  const handleSelectionChange = (users: User[]) => {
    setSelectedUsers(users);
  };

  const handleRefresh = () => {
    // In real implementation, this would refetch from API
    setUsers([...mockUsers]);
    setSelectedUser(null);
    setSelectedUsers([]);
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setViewMode('create');
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setViewMode('edit');
  };

  const handleManagePermissions = (user: User) => {
    setPermissionUser(user);
    setViewMode('permissions');
  };

  const handleDeleteUser = async (user: User) => {
    const confirmed = window.confirm(
      `${user.name}(${user.username}) 사용자를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
    );

    if (confirmed) {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setUsers(prev => prev.filter(u => u.id !== user.id));
        
        if (selectedUser?.id === user.id) {
          setSelectedUser(null);
        }
        
        alert('사용자가 성공적으로 삭제되었습니다.');
      } catch (error) {
        alert('사용자 삭제 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUpdateUserStatus = async (user: User, status: UserStatus) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, status, isActive: status === 'ACTIVE' } : u
      ));
      
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...user, status, isActive: status === 'ACTIVE' });
      }
      
      alert(`사용자 상태가 ${status === 'ACTIVE' ? '활성' : status === 'INACTIVE' ? '비활성' : '정지'}으로 변경되었습니다.`);
    } catch (error) {
      alert('상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMembershipTier = async (user: User, membershipTier: UserMembershipTier) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, membershipTier } : u
      ));
      
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...user, membershipTier });
      }
      
      const tierLabels = {
        PREMIUM: '프리미엄 멤버',
        REGULAR: '일반 멤버',
        GUEST: '비회원'
      };
      
      alert(`사용자 멤버십 등급이 ${tierLabels[membershipTier]}로 변경되었습니다.`);
    } catch (error) {
      alert('멤버십 등급 변경 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Form handlers
  const handleFormSuccess = (userData: Partial<User>) => {
    if (viewMode === 'create') {
      const newUser: User = {
        id: Math.max(...users.map(u => u.id)) + 1,
        username: userData.username!,
        email: userData.email!,
        name: userData.name!,
        phoneNumber: userData.phoneNumber || '',
        membershipTier: userData.membershipTier!,
        status: userData.status!,
        lastLoginAt: null,
        createdAt: new Date(),
        isActive: userData.status === 'ACTIVE',
        membershipStartDate: userData.membershipTier !== 'GUEST' ? new Date() : undefined,
        membershipEndDate: userData.membershipTier === 'PREMIUM' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : 
                         userData.membershipTier === 'REGULAR' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined,
        totalBookings: 0,
        totalSpent: 0,
        loyaltyPoints: 0
      };
      
      setUsers(prev => [...prev, newUser]);
      setSelectedUser(newUser);
      alert('새 사용자가 성공적으로 생성되었습니다.');
    } else if (viewMode === 'edit' && editingUser) {
      setUsers(prev => prev.map(u => 
        u.id === editingUser.id ? { ...u, ...userData } : u
      ));
      
      const updatedUser = { ...editingUser, ...userData };
      setSelectedUser(updatedUser);
      alert('사용자 정보가 성공적으로 수정되었습니다.');
    }
    
    setViewMode('list');
    setEditingUser(null);
  };

  const handleFormCancel = () => {
    setViewMode('list');
    setEditingUser(null);
  };

  // Permission handlers
  const handlePermissionUpdate = (updatedUser: User) => {
    setUsers(prev => prev.map(u => 
      u.id === updatedUser.id ? updatedUser : u
    ));
    
    setSelectedUser(updatedUser);
    setViewMode('list');
    setPermissionUser(null);
    alert('사용자 권한이 성공적으로 업데이트되었습니다.');
  };

  const handlePermissionCancel = () => {
    setViewMode('list');
    setPermissionUser(null);
  };

  // Navigation handlers
  const handleBack = () => {
    setViewMode('list');
    setEditingUser(null);
    setPermissionUser(null);
  };

  // const handleFiltersChange = (newFilters: UserFilters) => {
  //   setFilters(newFilters);
  // };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {viewMode !== 'list' && (
            <button
              onClick={handleBack}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              뒤로가기
            </button>
          )}
          
        </div>

        {/* Selected user info (list view only) */}
        {viewMode === 'list' && selectedUser && (
          <div className="bg-blue-50 px-4 py-3 rounded-lg max-w-sm">
            <div className="text-sm font-medium text-blue-900">선택된 사용자</div>
            <div className="text-sm text-blue-700">
              {selectedUser.name} ({selectedUser.username})
            </div>
            <div className="text-xs text-blue-600">
              {selectedUser.membershipTier} • {selectedUser.status}
            </div>
            <div className="mt-2 space-x-2">
              <button
                onClick={() => handleEditUser(selectedUser)}
                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
              >
                정보 수정
              </button>
              <button
                onClick={() => handleManagePermissions(selectedUser)}
                className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200"
              >
                권한 관리
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced filtering and search is now handled within EnhancedUserList */}

      {/* Main Content */}
      <div>
        {viewMode === 'list' && (
          <EnhancedUserList
            users={users}
            isLoading={isLoading}
            onSelectUser={handleSelectUser}
            onCreateUser={handleCreateUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            onUpdateStatus={handleUpdateUserStatus}
            onUpdateMembershipTier={handleUpdateMembershipTier}
            onManagePermissions={handleManagePermissions}
            selectedUsers={selectedUsers}
            onSelectionChange={handleSelectionChange}
            onRefresh={handleRefresh}
          />
        )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <UserForm
            user={editingUser}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            isLoading={isLoading}
          />
        )}

        {viewMode === 'permissions' && permissionUser && (
          <UserPermissionModal
            user={permissionUser}
            onUpdate={handlePermissionUpdate}
            onClose={handlePermissionCancel}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};