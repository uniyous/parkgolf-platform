import React, { useState, useEffect } from 'react';
import { UserList } from './UserList';
import { UserForm } from './UserForm';
import { UserPermissionModal } from './UserPermissionModal';
import { UserSearchFilters } from './UserSearchFilters';
import { UserStats } from './UserStats';
import type { User, UserRole, UserStatus, UserFilters } from '../../types';

// Mock user data for development
const mockUsers: User[] = [
  {
    id: 1,
    username: 'john_doe',
    email: 'john.doe@example.com',
    name: '김민수',
    phoneNumber: '010-1234-5678',
    role: 'USER',
    status: 'ACTIVE',
    permissions: ['READ_PROFILE', 'BOOK_COURSE'],
    lastLoginAt: new Date('2024-07-07T10:30:00'),
    createdAt: new Date('2024-01-15T09:00:00'),
    isActive: true
  },
  {
    id: 2,
    username: 'jane_admin',
    email: 'jane.admin@parkgolf.com',
    name: '박지영',
    phoneNumber: '010-9876-5432',
    role: 'ADMIN',
    status: 'ACTIVE',
    permissions: ['ALL_PERMISSIONS'],
    lastLoginAt: new Date('2024-07-07T14:20:00'),
    createdAt: new Date('2024-01-10T08:30:00'),
    isActive: true
  },
  {
    id: 3,
    username: 'mike_manager',
    email: 'mike.manager@parkgolf.com',
    name: '이성호',
    phoneNumber: '010-5555-7777',
    role: 'MANAGER',
    status: 'ACTIVE',
    permissions: ['MANAGE_COURSES', 'MANAGE_BOOKINGS', 'VIEW_REPORTS'],
    lastLoginAt: new Date('2024-07-06T16:45:00'),
    createdAt: new Date('2024-02-01T10:00:00'),
    isActive: true
  },
  {
    id: 4,
    username: 'susan_user',
    email: 'susan.user@example.com',
    name: '최수진',
    phoneNumber: '010-3333-4444',
    role: 'USER',
    status: 'INACTIVE',
    permissions: ['READ_PROFILE'],
    lastLoginAt: new Date('2024-06-15T11:20:00'),
    createdAt: new Date('2024-03-01T14:30:00'),
    isActive: false
  },
  {
    id: 5,
    username: 'tom_suspended',
    email: 'tom.suspended@example.com',
    name: '정민철',
    phoneNumber: '010-2222-3333',
    role: 'USER',
    status: 'SUSPENDED',
    permissions: [],
    lastLoginAt: new Date('2024-05-20T09:15:00'),
    createdAt: new Date('2024-04-01T12:00:00'),
    isActive: false
  }
];

type ViewMode = 'list' | 'create' | 'edit' | 'permissions';

export const UserManagementContainer: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [filteredUsers, setFilteredUsers] = useState<User[]>(mockUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionUser, setPermissionUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: undefined,
    status: undefined,
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Apply filters and search
  useEffect(() => {
    let filtered = [...users];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    // Role filter
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(user => user.status === filters.status);
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[filters.sortBy as keyof User] as string;
      const bValue = b[filters.sortBy as keyof User] as string;
      
      if (filters.sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    setFilteredUsers(filtered);
  }, [users, filters]);

  // User selection handlers
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
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

  const handleUpdateUserRole = async (user: User, role: UserRole) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, role } : u
      ));
      
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...user, role });
      }
      
      alert(`사용자 역할이 ${role}로 변경되었습니다.`);
    } catch (error) {
      alert('역할 변경 중 오류가 발생했습니다.');
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
        role: userData.role!,
        status: userData.status!,
        permissions: userData.permissions || [],
        lastLoginAt: null,
        createdAt: new Date(),
        isActive: userData.status === 'ACTIVE'
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

  const handleFiltersChange = (newFilters: UserFilters) => {
    setFilters(newFilters);
  };

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
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {viewMode === 'list' && '사용자 관리'}
              {viewMode === 'create' && '새 사용자 추가'}
              {viewMode === 'edit' && '사용자 정보 수정'}
              {viewMode === 'permissions' && '사용자 권한 관리'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {viewMode === 'list' && '시스템 사용자들을 관리합니다.'}
              {viewMode === 'create' && '새로운 사용자를 시스템에 추가합니다.'}
              {viewMode === 'edit' && '사용자의 기본 정보를 수정합니다.'}
              {viewMode === 'permissions' && '사용자의 역할과 세부 권한을 설정합니다.'}
            </p>
          </div>
        </div>

        {/* Selected user info (list view only) */}
        {viewMode === 'list' && selectedUser && (
          <div className="bg-blue-50 px-4 py-3 rounded-lg max-w-sm">
            <div className="text-sm font-medium text-blue-900">선택된 사용자</div>
            <div className="text-sm text-blue-700">
              {selectedUser.name} ({selectedUser.username})
            </div>
            <div className="text-xs text-blue-600">
              {selectedUser.role} • {selectedUser.status}
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

      {/* Statistics (list view only) */}
      {viewMode === 'list' && (
        <UserStats users={users} />
      )}

      {/* Search and Filters (list view only) */}
      {viewMode === 'list' && (
        <UserSearchFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          totalUsers={users.length}
          filteredUsers={filteredUsers.length}
        />
      )}

      {/* Main Content */}
      <div>
        {viewMode === 'list' && (
          <UserList
            users={filteredUsers}
            selectedUser={selectedUser}
            isLoading={isLoading}
            onSelectUser={handleSelectUser}
            onCreateUser={handleCreateUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            onUpdateStatus={handleUpdateUserStatus}
            onUpdateRole={handleUpdateUserRole}
            onManagePermissions={handleManagePermissions}
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