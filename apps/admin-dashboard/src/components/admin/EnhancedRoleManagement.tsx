import React, { useState, useMemo } from 'react';
import { useAdminActions } from '../../hooks/useAdminActions';
import { useConfirmation } from '../../hooks/useConfirmation';
import type { Admin, AdminRole, Permission } from '../../types';

interface EnhancedRoleManagementProps {
  admin: Admin;
  onUpdate: (admin: Admin) => void;
  onClose: () => void;
}

interface PermissionInfo {
  id: Permission;
  name: string;
  description: string;
  category: string;
  icon: string;
  level: 'low' | 'medium' | 'high' | 'critical';
}

interface PermissionCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  permissions: PermissionInfo[];
}

export const EnhancedRoleManagement: React.FC<EnhancedRoleManagementProps> = ({
  admin,
  onUpdate,
  onClose,
}) => {
  const { updateAdmin } = useAdminActions();
  const { showConfirmation } = useConfirmation();
  const [selectedRole, setSelectedRole] = useState<AdminRole>(admin.role);
  const [customPermissions, setCustomPermissions] = useState<Permission[]>(admin.permissions || []);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['platform-management']);

  // v3 권한 시스템 정의 (18 permissions)
  const permissionCategories: PermissionCategory[] = [
    {
      id: 'admin-permissions',
      name: '관리자 권한',
      description: '관리자 기능 접근 권한',
      icon: '🔐',
      permissions: [
        { id: 'ALL', name: '전체 권한', description: '모든 기능 접근', category: 'admin-permissions', icon: '👑', level: 'critical' },
        { id: 'COMPANIES', name: '회사 관리', description: '회사 관리 기능', category: 'admin-permissions', icon: '🏢', level: 'high' },
        { id: 'COURSES', name: '코스 관리', description: '코스 관리 기능', category: 'admin-permissions', icon: '⛳', level: 'high' },
        { id: 'TIMESLOTS', name: '타임슬롯 관리', description: '타임슬롯 관리 기능', category: 'admin-permissions', icon: '⏰', level: 'medium' },
        { id: 'BOOKINGS', name: '예약 관리', description: '예약 관리 기능', category: 'admin-permissions', icon: '📅', level: 'medium' },
        { id: 'USERS', name: '사용자 관리', description: '사용자 관리 기능', category: 'admin-permissions', icon: '👥', level: 'high' },
        { id: 'ADMINS', name: '관리자 관리', description: '관리자 관리 기능', category: 'admin-permissions', icon: '👨‍💼', level: 'critical' },
        { id: 'ANALYTICS', name: '분석/리포트', description: '분석 및 리포트 조회', category: 'admin-permissions', icon: '📊', level: 'medium' },
        { id: 'SUPPORT', name: '고객 지원', description: '고객 지원 기능', category: 'admin-permissions', icon: '🎧', level: 'medium' },
        { id: 'VIEW', name: '조회', description: '정보 조회만 가능', category: 'admin-permissions', icon: '👁️', level: 'low' },
      ]
    },
    {
      id: 'user-permissions',
      name: '사용자 권한',
      description: '일반 사용자 기능 접근 권한',
      icon: '👤',
      permissions: [
        { id: 'PROFILE', name: '프로필 관리', description: '개인 프로필 관리', category: 'user-permissions', icon: '👤', level: 'low' },
        { id: 'COURSE_VIEW', name: '코스 조회', description: '코스 정보 조회', category: 'user-permissions', icon: '⛳', level: 'low' },
        { id: 'BOOKING_VIEW', name: '예약 조회', description: '예약 내역 조회', category: 'user-permissions', icon: '📋', level: 'low' },
        { id: 'BOOKING_MANAGE', name: '예약 관리', description: '예약 생성/수정/취소', category: 'user-permissions', icon: '📅', level: 'medium' },
        { id: 'PAYMENT', name: '결제/환불', description: '결제 및 환불 처리', category: 'user-permissions', icon: '💳', level: 'medium' },
        { id: 'PREMIUM_BOOKING', name: '프리미엄 예약', description: '프리미엄 예약 기능', category: 'user-permissions', icon: '⭐', level: 'high' },
        { id: 'PRIORITY_BOOKING', name: '우선 예약', description: '우선 예약 권한', category: 'user-permissions', icon: '🚀', level: 'high' },
        { id: 'ADVANCED_SEARCH', name: '고급 검색', description: '고급 검색 기능', category: 'user-permissions', icon: '🔍', level: 'medium' },
      ]
    },
  ];

  // v3 역할별 기본 권한 정의 (5 roles, 18 permissions)
  const rolePermissions: Record<AdminRole, Permission[]> = {
    'ADMIN': ['ALL'],
    'SUPPORT': ['BOOKINGS', 'USERS', 'ANALYTICS', 'SUPPORT', 'VIEW'],
    'MANAGER': ['COMPANIES', 'COURSES', 'TIMESLOTS', 'BOOKINGS', 'USERS', 'ADMINS', 'ANALYTICS', 'VIEW'],
    'STAFF': ['TIMESLOTS', 'BOOKINGS', 'SUPPORT', 'VIEW'],
    'VIEWER': ['VIEW'],
  };

  // 현재 역할의 권한 목록
  const currentRolePermissions = rolePermissions[selectedRole] || [];

  // 권한 레벨별 색상
  const getLevelColor = (level: PermissionInfo['level']) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // 권한 레벨별 라벨
  const getLevelLabel = (level: PermissionInfo['level']) => {
    switch (level) {
      case 'low': return '낮음';
      case 'medium': return '보통';
      case 'high': return '높음';
      case 'critical': return '위험';
      default: return '알 수 없음';
    }
  };

  // 역할 변경 핸들러
  const handleRoleChange = (role: AdminRole) => {
    setSelectedRole(role);
    setCustomPermissions(rolePermissions[role] || []);
  };

  // 카테고리 토글
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // 저장 핸들러
  const handleSave = async () => {
    const isConfirmed = await showConfirmation({
      title: '권한 변경 확인',
      message: `${admin.name}의 역할을 "${getRoleLabel(selectedRole)}"로 변경하시겠습니까?`,
      type: 'warning'
    });

    if (!isConfirmed) return;

    setIsLoading(true);
    try {
      const updatedAdmin = await updateAdmin(admin.id, {
        role: selectedRole,
        permissions: customPermissions
      });
      
      if (updatedAdmin) {
        onUpdate(updatedAdmin);
        onClose();
      }
    } catch (error) {
      console.error('Failed to update admin role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 역할 라벨
  const getRoleLabel = (role: AdminRole) => {
    const labels: Record<AdminRole, string> = {
      'ADMIN': '시스템 관리자',
      'SUPPORT': '고객지원',
      'MANAGER': '운영 관리자',
      'STAFF': '현장 직원',
      'VIEWER': '조회 전용',
    };
    return labels[role] || role;
  };

  // 역할 설명
  const getRoleDescription = (role: AdminRole) => {
    const descriptions: Record<AdminRole, string> = {
      'ADMIN': '시스템 전체에 대한 최고 권한을 가집니다.',
      'SUPPORT': '고객 지원 및 예약 관리를 담당합니다.',
      'MANAGER': '회사 및 코스 운영 전반을 관리합니다.',
      'STAFF': '현장 업무 및 예약 접수를 수행합니다.',
      'VIEWER': '정보 조회만 가능합니다.',
    };
    return descriptions[role] || '';
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <span className="mr-2">🔐</span>
                권한 관리: {admin.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                관리자의 역할과 권한을 설정합니다.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 왼쪽: 역할 선택 */}
            <div className="lg:col-span-1">
              <h4 className="text-md font-medium text-gray-900 mb-4">역할 선택</h4>
              
              <div className="space-y-3">
                {(Object.keys(rolePermissions) as AdminRole[]).map((role) => (
                  <div
                    key={role}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedRole === role
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleRoleChange(role)}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={selectedRole === role}
                        onChange={() => handleRoleChange(role)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{getRoleLabel(role)}</h5>
                        <p className="text-sm text-gray-500 mt-1">{getRoleDescription(role)}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          권한 {currentRolePermissions.length}개
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 오른쪽: 권한 목록 */}
            <div className="lg:col-span-2">
              <h4 className="text-md font-medium text-gray-900 mb-4">
                권한 목록 ({currentRolePermissions.length}개)
              </h4>

              <div className="space-y-4">
                {permissionCategories.map((category) => (
                  <div key={category.id} className="border rounded-lg">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full px-4 py-3 bg-gray-50 border-b text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{category.icon}</span>
                        <div>
                          <h5 className="font-medium text-gray-900">{category.name}</h5>
                          <p className="text-sm text-gray-500">{category.description}</p>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transform transition-transform ${
                          expandedCategories.includes(category.id) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {expandedCategories.includes(category.id) && (
                      <div className="p-4">
                        <div className="grid grid-cols-1 gap-3">
                          {category.permissions.map((permission) => {
                            const hasPermission = currentRolePermissions.includes(permission.id);
                            return (
                              <div
                                key={permission.id}
                                className={`p-3 rounded-lg border ${
                                  hasPermission
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-lg">{permission.icon}</span>
                                    <div>
                                      <h6 className="font-medium text-gray-900 flex items-center space-x-2">
                                        <span>{permission.name}</span>
                                        <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(permission.level)}`}>
                                          {getLevelLabel(permission.level)}
                                        </span>
                                      </h6>
                                      <p className="text-sm text-gray-500">{permission.description}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center">
                                    {hasPermission ? (
                                      <span className="text-green-600">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="mt-8 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};