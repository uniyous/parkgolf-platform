import React, { useState } from 'react';
import { useAdminActions } from '../../hooks/useAdminActions';
import { useRolePermission } from '../../hooks/useRolePermission';
import type { Admin, Permission, AdminRole } from '../../types';

interface RoleManagementProps {
  admin: Admin;
  onClose: () => void;
  onUpdate: (updatedAdmin: Admin) => void;
}

// 권한 그룹 정의
const PERMISSION_GROUPS = {
  course: {
    label: '코스 관리',
    permissions: ['COURSE_READ', 'COURSE_WRITE', 'COURSE_DELETE'] as Permission[],
  },
  booking: {
    label: '예약 관리',
    permissions: ['BOOKING_READ', 'BOOKING_WRITE', 'BOOKING_DELETE'] as Permission[],
  },
  admin: {
    label: '관리자 관리',
    permissions: ['ADMIN_READ', 'ADMIN_WRITE', 'ADMIN_DELETE'] as Permission[],
  },
  system: {
    label: '시스템 설정',
    permissions: ['SYSTEM_SETTINGS'] as Permission[],
  },
};

// 기본 역할별 권한
const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: [
    'COURSE_READ', 'COURSE_WRITE', 'COURSE_DELETE',
    'BOOKING_READ', 'BOOKING_WRITE', 'BOOKING_DELETE',
    'ADMIN_READ', 'ADMIN_WRITE', 'ADMIN_DELETE',
    'SYSTEM_SETTINGS',
  ] as Permission[],
  ADMIN: [
    'COURSE_READ', 'COURSE_WRITE', 'COURSE_DELETE',
    'BOOKING_READ', 'BOOKING_WRITE', 'BOOKING_DELETE',
    'ADMIN_READ',
  ] as Permission[],
  MODERATOR: [
    'COURSE_READ',
    'BOOKING_READ', 'BOOKING_WRITE',
  ] as Permission[],
  VIEWER: [
    'COURSE_READ',
    'BOOKING_READ',
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

  // 권한명을 한글로 변환
  const getPermissionLabel = (permission: Permission): string => {
    const labels: Record<Permission, string> = {
      COURSE_READ: '코스 조회',
      COURSE_WRITE: '코스 생성/수정',
      COURSE_DELETE: '코스 삭제',
      BOOKING_READ: '예약 조회',
      BOOKING_WRITE: '예약 생성/수정',
      BOOKING_DELETE: '예약 삭제',
      TIMESLOT_READ: '타임슬롯 조회',
      TIMESLOT_WRITE: '타임슬롯 생성/수정',
      TIMESLOT_DELETE: '타임슬롯 삭제',
      ADMIN_READ: '관리자 조회',
      ADMIN_WRITE: '관리자 생성/수정',
      ADMIN_DELETE: '관리자 삭제',
      USER_READ: '사용자 조회',
      USER_WRITE: '사용자 생성/수정',
      USER_DELETE: '사용자 삭제',
      SYSTEM_READ: '시스템 조회',
      SYSTEM_WRITE: '시스템 수정',
      SYSTEM_SETTINGS: '시스템 설정',
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

  // 권한 수정 가능 여부 체크
  if (!hasPermission('ADMIN_WRITE')) {
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
                <option value="VIEWER">조회자</option>
                <option value="MODERATOR">운영자</option>
                <option value="ADMIN">관리자</option>
                <option value="SUPER_ADMIN">최고 관리자</option>
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