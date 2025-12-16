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

  // 새로운 권한 시스템 정의
  const permissionCategories: PermissionCategory[] = [
    {
      id: 'platform-management',
      name: '플랫폼 관리',
      description: '플랫폼 전체 관리 기능',
      icon: '🏢',
      permissions: [
        { id: 'PLATFORM_ALL', name: '플랫폼 전체 권한', description: '플랫폼 모든 기능 접근', category: 'platform-management', icon: '👑', level: 'critical' },
        { id: 'PLATFORM_COMPANY_MANAGE', name: '회사 관리', description: '플랫폼 내 회사 관리', category: 'platform-management', icon: '🏬', level: 'high' },
        { id: 'PLATFORM_USER_MANAGE', name: '전체 사용자 관리', description: '플랫폼 사용자 관리', category: 'platform-management', icon: '👥', level: 'high' },
        { id: 'PLATFORM_SYSTEM_CONFIG', name: '시스템 설정', description: '시스템 설정 관리', category: 'platform-management', icon: '⚙️', level: 'critical' },
        { id: 'PLATFORM_ANALYTICS', name: '플랫폼 분석', description: '전체 분석 데이터 조회', category: 'platform-management', icon: '📊', level: 'medium' },
        { id: 'PLATFORM_SUPPORT', name: '플랫폼 지원', description: '고객 지원 기능', category: 'platform-management', icon: '🎧', level: 'medium' },
      ]
    },
    {
      id: 'company-management',
      name: '회사 관리',
      description: '회사 레벨 관리 기능',
      icon: '🏢',
      permissions: [
        { id: 'COMPANY_ALL', name: '회사 전체 권한', description: '회사 모든 기능 접근', category: 'company-management', icon: '🏢', level: 'high' },
        { id: 'COMPANY_ADMIN_MANAGE', name: '회사 관리자 관리', description: '회사 소속 관리자 관리', category: 'company-management', icon: '👨‍💼', level: 'high' },
        { id: 'COMPANY_COURSE_MANAGE', name: '회사 코스 관리', description: '회사 골프 코스 관리', category: 'company-management', icon: '⛳', level: 'medium' },
        { id: 'COMPANY_BOOKING_MANAGE', name: '회사 예약 관리', description: '회사 예약 시스템 관리', category: 'company-management', icon: '📅', level: 'medium' },
        { id: 'COMPANY_USER_MANAGE', name: '회사 고객 관리', description: '회사 고객 관리', category: 'company-management', icon: '👤', level: 'medium' },
        { id: 'COMPANY_ANALYTICS', name: '회사 분석', description: '회사 분석 데이터 조회', category: 'company-management', icon: '📈', level: 'low' },
      ]
    },
    {
      id: 'course-management',
      name: '코스 관리',
      description: '골프 코스 운영 기능',
      icon: '⛳',
      permissions: [
        { id: 'COURSE_TIMESLOT_MANAGE', name: '타임슬롯 관리', description: '타임슬롯 생성/수정/삭제', category: 'course-management', icon: '⏰', level: 'medium' },
        { id: 'COURSE_BOOKING_MANAGE', name: '예약 관리', description: '예약 접수 및 관리', category: 'course-management', icon: '📋', level: 'medium' },
        { id: 'COURSE_CUSTOMER_VIEW', name: '고객 정보 조회', description: '고객 정보 열람', category: 'course-management', icon: '👁️', level: 'low' },
        { id: 'COURSE_ANALYTICS_VIEW', name: '코스 분석 조회', description: '코스 분석 데이터 조회', category: 'course-management', icon: '📊', level: 'low' },
      ]
    },
    {
      id: 'ui-navigation',
      name: 'UI 네비게이션',
      description: '관리자 인터페이스 접근 권한',
      icon: '🖥️',
      permissions: [
        { id: 'VIEW_DASHBOARD', name: '대시보드 조회', description: '관리자 대시보드 접근', category: 'ui-navigation', icon: '📊', level: 'low' },
        { id: 'MANAGE_COMPANIES', name: '회사 관리 메뉴', description: '회사 관리 화면 접근', category: 'ui-navigation', icon: '🏢', level: 'medium' },
        { id: 'MANAGE_COURSES', name: '코스 관리 메뉴', description: '코스 관리 화면 접근', category: 'ui-navigation', icon: '⛳', level: 'medium' },
        { id: 'MANAGE_TIMESLOTS', name: '타임슬롯 관리 메뉴', description: '타임슬롯 관리 화면 접근', category: 'ui-navigation', icon: '⏰', level: 'medium' },
        { id: 'MANAGE_BOOKINGS', name: '예약 관리 메뉴', description: '예약 관리 화면 접근', category: 'ui-navigation', icon: '📅', level: 'medium' },
        { id: 'MANAGE_USERS', name: '사용자 관리 메뉴', description: '사용자 관리 화면 접근', category: 'ui-navigation', icon: '👥', level: 'medium' },
        { id: 'MANAGE_ADMINS', name: '관리자 관리 메뉴', description: '관리자 관리 화면 접근', category: 'ui-navigation', icon: '👨‍💼', level: 'high' },
        { id: 'VIEW_ANALYTICS', name: '분석 조회 메뉴', description: '분석 화면 접근', category: 'ui-navigation', icon: '📈', level: 'low' },
      ]
    },
    {
      id: 'support',
      name: '고객 지원',
      description: '고객 지원 및 접수 기능',
      icon: '🎧',
      permissions: [
        { id: 'CUSTOMER_SUPPORT', name: '고객 지원', description: '고객 문의 처리', category: 'support', icon: '🎧', level: 'low' },
        { id: 'BOOKING_RECEPTION', name: '예약 접수', description: '예약 접수 처리', category: 'support', icon: '📞', level: 'low' },
        { id: 'READ_ONLY', name: '읽기 전용', description: '정보 조회만 가능', category: 'support', icon: '👁️', level: 'low' },
      ]
    },
  ];

  // 새로운 역할별 기본 권한 정의
  const rolePermissions: Record<AdminRole, Permission[]> = {
    'PLATFORM_OWNER': [
      'PLATFORM_ALL', 'PLATFORM_COMPANY_MANAGE', 'PLATFORM_USER_MANAGE', 'PLATFORM_SYSTEM_CONFIG',
      'PLATFORM_ANALYTICS', 'PLATFORM_SUPPORT', 'COMPANY_ALL', 'COMPANY_ADMIN_MANAGE',
      'COMPANY_COURSE_MANAGE', 'COMPANY_BOOKING_MANAGE', 'COMPANY_USER_MANAGE', 'COMPANY_ANALYTICS',
      'COURSE_TIMESLOT_MANAGE', 'COURSE_BOOKING_MANAGE', 'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW',
      'VIEW_DASHBOARD', 'MANAGE_COMPANIES', 'MANAGE_COURSES', 'MANAGE_TIMESLOTS', 'MANAGE_BOOKINGS',
      'MANAGE_USERS', 'MANAGE_ADMINS', 'VIEW_ANALYTICS'
    ],
    'PLATFORM_ADMIN': [
      'PLATFORM_COMPANY_MANAGE', 'PLATFORM_USER_MANAGE', 'PLATFORM_ANALYTICS', 'PLATFORM_SUPPORT',
      'COMPANY_ALL', 'COMPANY_ADMIN_MANAGE', 'COMPANY_COURSE_MANAGE', 'COMPANY_BOOKING_MANAGE',
      'COMPANY_USER_MANAGE', 'COMPANY_ANALYTICS', 'VIEW_DASHBOARD', 'MANAGE_COMPANIES',
      'MANAGE_COURSES', 'MANAGE_TIMESLOTS', 'MANAGE_BOOKINGS', 'MANAGE_USERS', 'MANAGE_ADMINS', 'VIEW_ANALYTICS'
    ],
    'PLATFORM_SUPPORT': [
      'PLATFORM_SUPPORT', 'COMPANY_USER_MANAGE', 'COMPANY_BOOKING_MANAGE', 'COURSE_BOOKING_MANAGE',
      'COURSE_CUSTOMER_VIEW', 'CUSTOMER_SUPPORT', 'BOOKING_RECEPTION', 'VIEW_DASHBOARD',
      'MANAGE_BOOKINGS', 'MANAGE_USERS'
    ],
    'PLATFORM_ANALYST': [
      'PLATFORM_ANALYTICS', 'COMPANY_ANALYTICS', 'COURSE_ANALYTICS_VIEW', 'READ_ONLY',
      'VIEW_DASHBOARD', 'VIEW_ANALYTICS'
    ],
    'COMPANY_OWNER': [
      'COMPANY_ALL', 'COMPANY_ADMIN_MANAGE', 'COMPANY_COURSE_MANAGE', 'COMPANY_BOOKING_MANAGE',
      'COMPANY_USER_MANAGE', 'COMPANY_ANALYTICS', 'COURSE_TIMESLOT_MANAGE', 'COURSE_BOOKING_MANAGE',
      'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW', 'VIEW_DASHBOARD', 'MANAGE_COURSES',
      'MANAGE_TIMESLOTS', 'MANAGE_BOOKINGS', 'MANAGE_USERS', 'MANAGE_ADMINS', 'VIEW_ANALYTICS'
    ],
    'COMPANY_MANAGER': [
      'COMPANY_COURSE_MANAGE', 'COMPANY_BOOKING_MANAGE', 'COMPANY_USER_MANAGE', 'COMPANY_ANALYTICS',
      'COURSE_TIMESLOT_MANAGE', 'COURSE_BOOKING_MANAGE', 'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW',
      'VIEW_DASHBOARD', 'MANAGE_COURSES', 'MANAGE_TIMESLOTS', 'MANAGE_BOOKINGS', 'MANAGE_USERS', 'VIEW_ANALYTICS'
    ],
    'COURSE_MANAGER': [
      'COURSE_TIMESLOT_MANAGE', 'COURSE_BOOKING_MANAGE', 'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW',
      'BOOKING_RECEPTION', 'CUSTOMER_SUPPORT', 'VIEW_DASHBOARD', 'MANAGE_TIMESLOTS', 'MANAGE_BOOKINGS'
    ],
    'STAFF': [
      'COURSE_BOOKING_MANAGE', 'COURSE_CUSTOMER_VIEW', 'BOOKING_RECEPTION', 'CUSTOMER_SUPPORT',
      'VIEW_DASHBOARD', 'MANAGE_BOOKINGS'
    ],
    'READONLY_STAFF': [
      'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW', 'READ_ONLY', 'VIEW_DASHBOARD'
    ],
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
    const isConfirmed = await showConfirmation(
      '권한 변경 확인',
      `${admin.name}의 역할을 "${getRoleLabel(selectedRole)}"로 변경하시겠습니까?`,
      'warning'
    );

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
      'PLATFORM_OWNER': '플랫폼 소유자',
      'PLATFORM_ADMIN': '플랫폼 관리자',
      'PLATFORM_SUPPORT': '플랫폼 지원팀',
      'PLATFORM_ANALYST': '플랫폼 분석가',
      'COMPANY_OWNER': '회사 대표',
      'COMPANY_MANAGER': '회사 운영 관리자',
      'COURSE_MANAGER': '코스 관리자',
      'STAFF': '일반 직원',
      'READONLY_STAFF': '조회 전용 직원',
    };
    return labels[role] || role;
  };

  // 역할 설명
  const getRoleDescription = (role: AdminRole) => {
    const descriptions: Record<AdminRole, string> = {
      'PLATFORM_OWNER': '플랫폼 전체에 대한 최고 권한을 가집니다.',
      'PLATFORM_ADMIN': '플랫폼 운영 전반을 관리할 수 있습니다.',
      'PLATFORM_SUPPORT': '고객 지원 및 기술 지원을 담당합니다.',
      'PLATFORM_ANALYST': '플랫폼 데이터 분석 및 리포팅을 담당합니다.',
      'COMPANY_OWNER': '회사 전체 운영을 관리할 수 있습니다.',
      'COMPANY_MANAGER': '회사 일반 운영업무를 관리할 수 있습니다.',
      'COURSE_MANAGER': '특정 코스의 운영을 관리할 수 있습니다.',
      'STAFF': '현장 업무를 수행할 수 있습니다.',
      'READONLY_STAFF': '정보 조회만 가능합니다.',
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