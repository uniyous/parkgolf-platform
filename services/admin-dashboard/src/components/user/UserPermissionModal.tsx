import React, { useState, useEffect } from 'react';
import type { User, UserRole } from '../../types';

interface UserPermissionModalProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
  onClose: () => void;
  isLoading: boolean;
}

interface PermissionGroup {
  name: string;
  description: string;
  permissions: {
    key: string;
    name: string;
    description: string;
  }[];
}

export const UserPermissionModal: React.FC<UserPermissionModalProps> = ({
  user,
  onUpdate,
  onClose,
  isLoading
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(user.permissions || []);

  // Permission groups with detailed descriptions
  const permissionGroups: PermissionGroup[] = [
    {
      name: '시스템 관리',
      description: '시스템 전반의 관리 권한',
      permissions: [
        {
          key: 'ALL_PERMISSIONS',
          name: '모든 권한',
          description: '시스템의 모든 기능에 대한 완전한 접근 권한'
        },
        {
          key: 'SYSTEM_SETTINGS',
          name: '시스템 설정',
          description: '시스템 전반 설정 변경 권한'
        },
        {
          key: 'MANAGE_USERS',
          name: '사용자 관리',
          description: '사용자 생성, 수정, 삭제 권한'
        }
      ]
    },
    {
      name: '골프장 관리',
      description: '골프장 및 코스 관련 관리 권한',
      permissions: [
        {
          key: 'MANAGE_COURSES',
          name: '코스 관리',
          description: '골프장 코스 생성, 수정, 삭제 권한'
        },
        {
          key: 'VIEW_COURSE_ANALYTICS',
          name: '코스 분석 조회',
          description: '골프장 이용 통계 및 분석 데이터 조회'
        }
      ]
    },
    {
      name: '예약 관리',
      description: '예약 시스템 관련 권한',
      permissions: [
        {
          key: 'MANAGE_BOOKINGS',
          name: '예약 관리',
          description: '예약 생성, 수정, 취소 권한'
        },
        {
          key: 'VIEW_BOOKINGS',
          name: '예약 조회',
          description: '예약 내역 조회 권한'
        },
        {
          key: 'BOOK_COURSE',
          name: '코스 예약',
          description: '골프장 코스 예약 권한'
        }
      ]
    },
    {
      name: '알림 관리',
      description: '알림 및 메시지 관련 권한',
      permissions: [
        {
          key: 'MANAGE_NOTIFICATIONS',
          name: '알림 관리',
          description: '알림 발송 및 관리 권한'
        },
        {
          key: 'SEND_MESSAGES',
          name: '메시지 발송',
          description: '사용자에게 메시지 발송 권한'
        }
      ]
    },
    {
      name: '보고서 및 분석',
      description: '데이터 분석 및 보고서 관련 권한',
      permissions: [
        {
          key: 'VIEW_REPORTS',
          name: '보고서 조회',
          description: '각종 보고서 및 통계 조회 권한'
        },
        {
          key: 'EXPORT_DATA',
          name: '데이터 내보내기',
          description: '시스템 데이터 내보내기 권한'
        }
      ]
    },
    {
      name: '개인 정보',
      description: '개인 프로필 관련 권한',
      permissions: [
        {
          key: 'READ_PROFILE',
          name: '프로필 조회',
          description: '자신의 프로필 정보 조회 권한'
        },
        {
          key: 'UPDATE_PROFILE',
          name: '프로필 수정',
          description: '자신의 프로필 정보 수정 권한'
        }
      ]
    }
  ];

  // Role-based permission presets
  const rolePermissions: Record<UserRole, string[]> = {
    ADMIN: [
      'ALL_PERMISSIONS',
      'SYSTEM_SETTINGS',
      'MANAGE_USERS',
      'MANAGE_COURSES',
      'MANAGE_BOOKINGS',
      'MANAGE_NOTIFICATIONS',
      'VIEW_REPORTS',
      'EXPORT_DATA',
      'VIEW_COURSE_ANALYTICS',
      'SEND_MESSAGES',
      'READ_PROFILE',
      'UPDATE_PROFILE'
    ],
    MANAGER: [
      'MANAGE_COURSES',
      'MANAGE_BOOKINGS',
      'MANAGE_NOTIFICATIONS',
      'VIEW_REPORTS',
      'VIEW_COURSE_ANALYTICS',
      'SEND_MESSAGES',
      'VIEW_BOOKINGS',
      'READ_PROFILE',
      'UPDATE_PROFILE'
    ],
    USER: [
      'BOOK_COURSE',
      'VIEW_BOOKINGS',
      'READ_PROFILE',
      'UPDATE_PROFILE'
    ]
  };

  // Update permissions when role changes
  const handleRoleChange = (newRole: UserRole) => {
    setSelectedRole(newRole);
    setSelectedPermissions(rolePermissions[newRole]);
  };

  // Toggle individual permission
  const handlePermissionToggle = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  // Apply role preset
  const applyRolePreset = () => {
    setSelectedPermissions(rolePermissions[selectedRole]);
  };

  // Clear all permissions
  const clearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  // Handle save
  const handleSave = () => {
    const updatedUser: User = {
      ...user,
      role: selectedRole,
      permissions: selectedPermissions
    };
    
    onUpdate(updatedUser);
  };

  // Check if permission is available for current role
  const isPermissionAllowed = (permission: string): boolean => {
    return rolePermissions[selectedRole].includes(permission);
  };

  // Get all available permissions
  const allPermissions = permissionGroups.flatMap(group => group.permissions.map(p => p.key));
  const selectedCount = selectedPermissions.length;
  const totalCount = allPermissions.length;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                사용자 권한 관리
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {user.name} ({user.username})의 역할과 권한을 설정합니다.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Role Selection */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">역할 선택</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['USER', 'MANAGER', 'ADMIN'] as UserRole[]).map((role) => (
                  <label key={role} className="relative">
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={selectedRole === role}
                      onChange={() => handleRoleChange(role)}
                      className="sr-only"
                    />
                    <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedRole === role
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}>
                      <div className="text-sm font-medium text-gray-900">
                        {role === 'ADMIN' ? '관리자' : role === 'MANAGER' ? '매니저' : '사용자'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {role === 'ADMIN' && '시스템 전체 관리 권한'}
                        {role === 'MANAGER' && '골프장 운영 관리 권한'}
                        {role === 'USER' && '기본 사용자 권한'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {rolePermissions[role].length}개 권한
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Permission Management */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-medium text-gray-900">세부 권한 설정</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {selectedCount}/{totalCount} 권한 선택됨
                  </span>
                  <button
                    onClick={applyRolePreset}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    역할 기본값 적용
                  </button>
                  <button
                    onClick={clearAllPermissions}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    모두 해제
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {permissionGroups.map((group) => (
                  <div key={group.name} className="border border-gray-200 rounded-lg p-4">
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-900">{group.name}</h5>
                      <p className="text-xs text-gray-500 mt-1">{group.description}</p>
                    </div>
                    
                    <div className="space-y-3">
                      {group.permissions.map((permission) => {
                        const isAllowed = isPermissionAllowed(permission.key);
                        const isSelected = selectedPermissions.includes(permission.key);
                        
                        return (
                          <label
                            key={permission.key}
                            className={`flex items-start p-3 rounded-md border transition-colors ${
                              !isAllowed
                                ? 'bg-gray-50 border-gray-200 opacity-50'
                                : isSelected
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                            } ${isAllowed ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => isAllowed && handlePermissionToggle(permission.key)}
                              disabled={!isAllowed}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                            />
                            <div className="ml-3 flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {permission.name}
                                {!isAllowed && (
                                  <span className="ml-2 text-xs text-gray-400">
                                    (현재 역할에서 사용 불가)
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {permission.description}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Permissions Summary */}
            {selectedPermissions.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="text-sm font-medium text-blue-900 mb-2">선택된 권한 요약</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedPermissions.map((permission) => {
                    const permDetail = permissionGroups
                      .flatMap(g => g.permissions)
                      .find(p => p.key === permission);
                    
                    return (
                      <span
                        key={permission}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        title={permDetail?.description}
                      >
                        {permDetail?.name || permission}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                저장 중...
              </div>
            ) : (
              '저장'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};