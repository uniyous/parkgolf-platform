import React, { useState } from 'react';
import { useAdminActions } from '../../hooks/useAdminActions';
import { useRolePermission } from '../../hooks/useRolePermission';
import type { Admin, Permission, AdminRole } from '../../types';

interface RoleManagementProps {
  admin: Admin;
  onClose: () => void;
  onUpdate: (updatedAdmin: Admin) => void;
}

// 권한 그룹 정의 - 실제 Permission 타입 사용
const PERMISSION_GROUPS = {
  platform: {
    label: '플랫폼 관리',
    permissions: [
      'PLATFORM_ALL', 'PLATFORM_COMPANY_MANAGE', 'PLATFORM_USER_MANAGE', 
      'PLATFORM_SYSTEM_CONFIG', 'PLATFORM_ANALYTICS', 'PLATFORM_SUPPORT'
    ] as Permission[],
  },
  company: {
    label: '회사 관리',
    permissions: [
      'COMPANY_ALL', 'COMPANY_ADMIN_MANAGE', 'COMPANY_COURSE_MANAGE',
      'COMPANY_BOOKING_MANAGE', 'COMPANY_USER_MANAGE', 'COMPANY_ANALYTICS'
    ] as Permission[],
  },
  course: {
    label: '코스 관리',
    permissions: [
      'COURSE_TIMESLOT_MANAGE', 'COURSE_BOOKING_MANAGE', 
      'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW'
    ] as Permission[],
  },
  ui: {
    label: 'UI 네비게이션',
    permissions: [
      'VIEW_DASHBOARD', 'MANAGE_COMPANIES', 'MANAGE_COURSES', 'MANAGE_TIMESLOTS',
      'MANAGE_BOOKINGS', 'MANAGE_USERS', 'MANAGE_ADMINS', 'VIEW_ANALYTICS'
    ] as Permission[],
  },
  support: {
    label: '고객 지원',
    permissions: [
      'CUSTOMER_SUPPORT', 'BOOKING_RECEPTION', 'READ_ONLY'
    ] as Permission[],
  },
};

// 새로운 AdminRole 시스템의 기본 역할별 권한
const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  'PLATFORM_OWNER': [
    'PLATFORM_ALL', 'PLATFORM_COMPANY_MANAGE', 'PLATFORM_USER_MANAGE', 'PLATFORM_SYSTEM_CONFIG',
    'PLATFORM_ANALYTICS', 'PLATFORM_SUPPORT', 'COMPANY_ALL', 'COMPANY_ADMIN_MANAGE',
    'COMPANY_COURSE_MANAGE', 'COMPANY_BOOKING_MANAGE', 'COMPANY_USER_MANAGE', 'COMPANY_ANALYTICS',
    'COURSE_TIMESLOT_MANAGE', 'COURSE_BOOKING_MANAGE', 'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW',
    'VIEW_DASHBOARD', 'MANAGE_COMPANIES', 'MANAGE_COURSES', 'MANAGE_TIMESLOTS', 'MANAGE_BOOKINGS',
    'MANAGE_USERS', 'MANAGE_ADMINS', 'VIEW_ANALYTICS'
  ] as Permission[],
  'PLATFORM_ADMIN': [
    'PLATFORM_COMPANY_MANAGE', 'PLATFORM_USER_MANAGE', 'PLATFORM_ANALYTICS', 'PLATFORM_SUPPORT',
    'COMPANY_ALL', 'COMPANY_ADMIN_MANAGE', 'COMPANY_COURSE_MANAGE', 'COMPANY_BOOKING_MANAGE',
    'COMPANY_USER_MANAGE', 'COMPANY_ANALYTICS', 'VIEW_DASHBOARD', 'MANAGE_COMPANIES',
    'MANAGE_COURSES', 'MANAGE_TIMESLOTS', 'MANAGE_BOOKINGS', 'MANAGE_USERS', 'MANAGE_ADMINS', 'VIEW_ANALYTICS'
  ] as Permission[],
  'PLATFORM_SUPPORT': [
    'PLATFORM_SUPPORT', 'COMPANY_USER_MANAGE', 'COMPANY_BOOKING_MANAGE', 'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW', 'CUSTOMER_SUPPORT', 'BOOKING_RECEPTION', 'VIEW_DASHBOARD',
    'MANAGE_BOOKINGS', 'MANAGE_USERS'
  ] as Permission[],
  'PLATFORM_ANALYST': [
    'PLATFORM_ANALYTICS', 'COMPANY_ANALYTICS', 'COURSE_ANALYTICS_VIEW', 'READ_ONLY',
    'VIEW_DASHBOARD', 'VIEW_ANALYTICS'
  ] as Permission[],
  'COMPANY_OWNER': [
    'COMPANY_ALL', 'COMPANY_ADMIN_MANAGE', 'COMPANY_COURSE_MANAGE', 'COMPANY_BOOKING_MANAGE',
    'COMPANY_USER_MANAGE', 'COMPANY_ANALYTICS', 'COURSE_TIMESLOT_MANAGE', 'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW', 'VIEW_DASHBOARD', 'MANAGE_COURSES',
    'MANAGE_TIMESLOTS', 'MANAGE_BOOKINGS', 'MANAGE_USERS', 'MANAGE_ADMINS', 'VIEW_ANALYTICS'
  ] as Permission[],
  'COMPANY_MANAGER': [
    'COMPANY_COURSE_MANAGE', 'COMPANY_BOOKING_MANAGE', 'COMPANY_USER_MANAGE', 'COMPANY_ANALYTICS',
    'COURSE_TIMESLOT_MANAGE', 'COURSE_BOOKING_MANAGE', 'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW',
    'VIEW_DASHBOARD', 'MANAGE_COURSES', 'MANAGE_TIMESLOTS', 'MANAGE_BOOKINGS', 'MANAGE_USERS', 'VIEW_ANALYTICS'
  ] as Permission[],
  'COURSE_MANAGER': [
    'COURSE_TIMESLOT_MANAGE', 'COURSE_BOOKING_MANAGE', 'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW',
    'BOOKING_RECEPTION', 'CUSTOMER_SUPPORT', 'VIEW_DASHBOARD', 'MANAGE_TIMESLOTS', 'MANAGE_BOOKINGS'
  ] as Permission[],
  'STAFF': [
    'COURSE_BOOKING_MANAGE', 'COURSE_CUSTOMER_VIEW', 'BOOKING_RECEPTION', 'CUSTOMER_SUPPORT',
    'VIEW_DASHBOARD', 'MANAGE_BOOKINGS'
  ] as Permission[],
  'READONLY_STAFF': [
    'COURSE_CUSTOMER_VIEW', 'COURSE_ANALYTICS_VIEW', 'READ_ONLY', 'VIEW_DASHBOARD'
  ] as Permission[],
};

export const RoleManagement: React.FC<RoleManagementProps> = ({
  admin,
  onClose,
  onUpdate,
}) => {
  const { updateAdmin } = useAdminActions();
  const { hasPermission } = useRolePermission();
  
  const [selectedRole, setSelectedRole] = useState<AdminRole>(admin.role);
  const [customPermissions, setCustomPermissions] = useState<Permission[]>(
    admin.permissions || ROLE_PERMISSIONS[admin.role] || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 권한명을 한글로 변환 - 실제 Permission 타입 사용
  const getPermissionLabel = (permission: Permission): string => {
    const labels: Record<string, string> = {
      // 플랫폼 권한
      'PLATFORM_ALL': '플랫폼 전체 권한',
      'PLATFORM_COMPANY_MANAGE': '플랫폼 회사 관리',
      'PLATFORM_USER_MANAGE': '플랫폼 사용자 관리',
      'PLATFORM_SYSTEM_CONFIG': '시스템 설정',
      'PLATFORM_ANALYTICS': '플랫폼 분석',
      'PLATFORM_SUPPORT': '플랫폼 지원',
      // 회사 권한
      'COMPANY_ALL': '회사 전체 권한',
      'COMPANY_ADMIN_MANAGE': '회사 관리자 관리',
      'COMPANY_COURSE_MANAGE': '회사 코스 관리',
      'COMPANY_BOOKING_MANAGE': '회사 예약 관리',
      'COMPANY_USER_MANAGE': '회사 사용자 관리',
      'COMPANY_ANALYTICS': '회사 분석',
      // 코스 권한
      'COURSE_TIMESLOT_MANAGE': '타임슬롯 관리',
      'COURSE_BOOKING_MANAGE': '코스 예약 관리',
      'COURSE_CUSTOMER_VIEW': '고객 정보 조회',
      'COURSE_ANALYTICS_VIEW': '코스 분석 조회',
      // UI 네비게이션 권한
      'VIEW_DASHBOARD': '대시보드 조회',
      'MANAGE_COMPANIES': '회사 관리',
      'MANAGE_COURSES': '코스 관리',
      'MANAGE_TIMESLOTS': '타임슬롯 관리',
      'MANAGE_BOOKINGS': '예약 관리',
      'MANAGE_USERS': '사용자 관리',
      'MANAGE_ADMINS': '관리자 관리',
      'VIEW_ANALYTICS': '분석 조회',
      // 고객 지원 권한
      'CUSTOMER_SUPPORT': '고객 지원',
      'BOOKING_RECEPTION': '예약 접수',
      'READ_ONLY': '읽기 전용',
    };
    return labels[permission] || permission;
  };

  // 역할 변경 핸들러
  const handleRoleChange = (newRole: AdminRole) => {
    setSelectedRole(newRole);
    setCustomPermissions(ROLE_PERMISSIONS[newRole] || []);
  };

  // 권한 토글 핸들러
  const handlePermissionToggle = (permission: Permission) => {
    setCustomPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  // 저장 핸들러
  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const updatedAdmin = await updateAdmin(admin.id, {
        role: selectedRole,
        permissions: customPermissions,
      });
      
      if (updatedAdmin) {
        onUpdate(updatedAdmin);
        onClose();
      }
    } catch (error) {
      console.error('권한 업데이트 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 권한 수정 가능 여부 체크 - 새로운 권한명 사용
  if (!hasPermission('MANAGE_ADMINS')) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">권한을 수정할 권한이 없습니다.</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          닫기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {admin.name}의 권한 관리
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            관리자의 역할과 권한을 설정합니다.
          </p>
        </div>
        
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            {/* 역할 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                역할
              </label>
              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value as AdminRole)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="READONLY_STAFF">조회 전용 직원</option>
                <option value="STAFF">일반 직원</option>
                <option value="COURSE_MANAGER">코스 관리자</option>
                <option value="COMPANY_MANAGER">회사 운영 관리자</option>
                <option value="COMPANY_OWNER">회사 대표</option>
                <option value="PLATFORM_ANALYST">플랫폼 분석가</option>
                <option value="PLATFORM_SUPPORT">플랫폼 지원팀</option>
                <option value="PLATFORM_ADMIN">플랫폼 관리자</option>
                <option value="PLATFORM_OWNER">플랫폼 소유자</option>
              </select>
            </div>

            {/* 권한 설정 */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">세부 권한</h4>
              <div className="space-y-4">
                {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => (
                  <div key={groupKey} className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">{group.label}</h5>
                    <div className="space-y-2">
                      {group.permissions.map((permission) => (
                        <label key={permission} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={customPermissions.includes(permission)}
                            onChange={() => handlePermissionToggle(permission)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {getPermissionLabel(permission)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};