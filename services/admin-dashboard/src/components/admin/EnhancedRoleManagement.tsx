import React, { useState, useMemo } from 'react';
import { useAdminActions } from '../../hooks/useAdminActions';
import { useConfirmation } from '../../hooks/useConfirmation';
import type { Admin, AdminRole } from '../../types';

interface EnhancedRoleManagementProps {
  admin: Admin;
  onUpdate: (admin: Admin) => void;
  onClose: () => void;
}

interface Permission {
  id: string;
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
  permissions: Permission[];
}

export const EnhancedRoleManagement: React.FC<EnhancedRoleManagementProps> = ({
  admin,
  onUpdate,
  onClose,
}) => {
  const { updateAdmin } = useAdminActions();
  const { showConfirmation } = useConfirmation();
  const [selectedRole, setSelectedRole] = useState<AdminRole>(admin.role);
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['user-management']);

  // 권한 정의
  const permissionCategories: PermissionCategory[] = [
    {
      id: 'user-management',
      name: '사용자 관리',
      description: '고객 및 사용자 관련 기능',
      icon: '👥',
      permissions: [
        { id: 'USER_READ', name: '사용자 조회', description: '사용자 목록 및 상세 정보 조회', category: 'user-management', icon: '👁️', level: 'low' },
        { id: 'USER_WRITE', name: '사용자 편집', description: '사용자 정보 생성 및 수정', category: 'user-management', icon: '✏️', level: 'medium' },
        { id: 'USER_DELETE', name: '사용자 삭제', description: '사용자 계정 삭제', category: 'user-management', icon: '🗑️', level: 'high' },
        { id: 'USER_EXPORT', name: '사용자 내보내기', description: '사용자 데이터 내보내기', category: 'user-management', icon: '📤', level: 'medium' },
      ]
    },
    {
      id: 'course-management',
      name: '코스 관리',
      description: '골프 코스 및 시설 관리',
      icon: '⛳',
      permissions: [
        { id: 'COURSE_READ', name: '코스 조회', description: '코스 목록 및 상세 정보 조회', category: 'course-management', icon: '👁️', level: 'low' },
        { id: 'COURSE_WRITE', name: '코스 편집', description: '코스 정보 생성 및 수정', category: 'course-management', icon: '✏️', level: 'medium' },
        { id: 'COURSE_DELETE', name: '코스 삭제', description: '코스 삭제', category: 'course-management', icon: '🗑️', level: 'high' },
        { id: 'HOLE_MANAGE', name: '홀 관리', description: '홀 정보 관리', category: 'course-management', icon: '🕳️', level: 'medium' },
        { id: 'TIMESLOT_MANAGE', name: '타임슬롯 관리', description: '예약 시간 관리', category: 'course-management', icon: '⏰', level: 'medium' },
      ]
    },
    {
      id: 'booking-management',
      name: '예약 관리',
      description: '예약 시스템 관리',
      icon: '📅',
      permissions: [
        { id: 'BOOKING_READ', name: '예약 조회', description: '예약 목록 및 상세 정보 조회', category: 'booking-management', icon: '👁️', level: 'low' },
        { id: 'BOOKING_WRITE', name: '예약 편집', description: '예약 생성 및 수정', category: 'booking-management', icon: '✏️', level: 'medium' },
        { id: 'BOOKING_CANCEL', name: '예약 취소', description: '예약 취소 및 환불 처리', category: 'booking-management', icon: '❌', level: 'medium' },
        { id: 'BOOKING_APPROVE', name: '예약 승인', description: '예약 승인/거부', category: 'booking-management', icon: '✅', level: 'medium' },
        { id: 'PAYMENT_MANAGE', name: '결제 관리', description: '결제 및 환불 관리', category: 'booking-management', icon: '💳', level: 'high' },
      ]
    },
    {
      id: 'system-management',
      name: '시스템 관리',
      description: '시스템 설정 및 관리',
      icon: '⚙️',
      permissions: [
        { id: 'SYSTEM_READ', name: '시스템 조회', description: '시스템 상태 및 로그 조회', category: 'system-management', icon: '👁️', level: 'low' },
        { id: 'SYSTEM_SETTINGS', name: '시스템 설정', description: '시스템 환경 설정', category: 'system-management', icon: '⚙️', level: 'high' },
        { id: 'BACKUP_MANAGE', name: '백업 관리', description: '데이터 백업 및 복원', category: 'system-management', icon: '💾', level: 'critical' },
        { id: 'LOG_VIEW', name: '로그 조회', description: '시스템 로그 조회', category: 'system-management', icon: '📋', level: 'medium' },
      ]
    },
    {
      id: 'admin-management',
      name: '관리자 관리',
      description: '관리자 계정 및 권한 관리',
      icon: '👨‍💼',
      permissions: [
        { id: 'ADMIN_READ', name: '관리자 조회', description: '관리자 목록 및 상세 정보 조회', category: 'admin-management', icon: '👁️', level: 'medium' },
        { id: 'ADMIN_WRITE', name: '관리자 편집', description: '관리자 계정 생성 및 수정', category: 'admin-management', icon: '✏️', level: 'high' },
        { id: 'ADMIN_DELETE', name: '관리자 삭제', description: '관리자 계정 삭제', category: 'admin-management', icon: '🗑️', level: 'critical' },
        { id: 'PERMISSION_MANAGE', name: '권한 관리', description: '관리자 권한 설정', category: 'admin-management', icon: '🔐', level: 'critical' },
      ]
    },
    {
      id: 'reports',
      name: '보고서',
      description: '통계 및 보고서 관리',
      icon: '📊',
      permissions: [
        { id: 'REPORT_READ', name: '보고서 조회', description: '보고서 및 통계 조회', category: 'reports', icon: '👁️', level: 'low' },
        { id: 'REPORT_EXPORT', name: '보고서 내보내기', description: '보고서 파일 다운로드', category: 'reports', icon: '📤', level: 'medium' },
        { id: 'ANALYTICS_ACCESS', name: '분석 도구', description: '고급 분석 도구 접근', category: 'reports', icon: '📈', level: 'medium' },
      ]
    },
  ];

  // 역할별 기본 권한 정의
  const rolePermissions: Record<AdminRole, string[]> = {
    'VIEWER': [
      'USER_READ', 'COURSE_READ', 'BOOKING_READ', 'REPORT_READ'
    ],
    'MODERATOR': [
      'USER_READ', 'USER_WRITE', 'COURSE_READ', 'COURSE_WRITE', 'HOLE_MANAGE', 'TIMESLOT_MANAGE',
      'BOOKING_READ', 'BOOKING_WRITE', 'BOOKING_CANCEL', 'BOOKING_APPROVE',
      'REPORT_READ', 'REPORT_EXPORT'
    ],
    'ADMIN': [
      'USER_READ', 'USER_WRITE', 'USER_DELETE', 'USER_EXPORT',
      'COURSE_READ', 'COURSE_WRITE', 'COURSE_DELETE', 'HOLE_MANAGE', 'TIMESLOT_MANAGE',
      'BOOKING_READ', 'BOOKING_WRITE', 'BOOKING_CANCEL', 'BOOKING_APPROVE', 'PAYMENT_MANAGE',
      'SYSTEM_READ', 'LOG_VIEW',
      'REPORT_READ', 'REPORT_EXPORT', 'ANALYTICS_ACCESS'
    ],
    'SUPER_ADMIN': [
      ...permissionCategories.flatMap(cat => cat.permissions.map(p => p.id))
    ],
  };

  // 현재 역할의 권한 목록
  const currentRolePermissions = rolePermissions[selectedRole] || [];

  // 권한 레벨별 색상
  const getLevelColor = (level: Permission['level']) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // 권한 레벨별 라벨
  const getLevelLabel = (level: Permission['level']) => {
    switch (level) {
      case 'low': return '낮음';
      case 'medium': return '보통';
      case 'high': return '높음';
      case 'critical': return '위험';
      default: return '알 수 없음';
    }
  };

  // 카테고리 토글
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // 모든 권한 통계
  const permissionStats = useMemo(() => {
    const totalPermissions = permissionCategories.reduce((sum, cat) => sum + cat.permissions.length, 0);
    const grantedPermissions = currentRolePermissions.length;
    
    return {
      total: totalPermissions,
      granted: grantedPermissions,
      percentage: Math.round((grantedPermissions / totalPermissions) * 100),
    };
  }, [currentRolePermissions, permissionCategories]);

  // 역할 변경 핸들러
  const handleRoleChange = async (newRole: AdminRole) => {
    if (newRole === admin.role) return;

    const confirmed = await showConfirmation({
      title: '역할 변경',
      message: `${admin.name}의 역할을 "${getRoleLabel(newRole)}"로 변경하시겠습니까?`,
      confirmText: '변경',
      cancelText: '취소',
      type: 'warning',
    });

    if (confirmed) {
      setSelectedRole(newRole);
    }
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (selectedRole === admin.role) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      const updatedAdmin = await updateAdmin(admin.id, { role: selectedRole });
      if (updatedAdmin) {
        onUpdate(updatedAdmin);
      }
    } catch (error) {
      console.error('권한 업데이트 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 역할 라벨
  const getRoleLabel = (role: AdminRole) => {
    const labels = {
      'VIEWER': '조회자',
      'MODERATOR': '운영자',
      'ADMIN': '관리자',
      'SUPER_ADMIN': '최고 관리자',
    };
    return labels[role] || role;
  };

  // 역할 설명
  const getRoleDescription = (role: AdminRole) => {
    const descriptions = {
      'VIEWER': '정보 조회만 가능합니다.',
      'MODERATOR': '예약 관리 및 기본 업무를 수행할 수 있습니다.',
      'ADMIN': '대부분의 관리 기능을 수행할 수 있습니다.',
      'SUPER_ADMIN': '모든 기능을 사용할 수 있습니다.',
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
                {(['VIEWER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'] as AdminRole[]).map((role) => (
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
                        checked={selectedRole === role}
                        onChange={() => {}}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{getRoleLabel(role)}</div>
                        <div className="text-sm text-gray-500">{getRoleDescription(role)}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {rolePermissions[role]?.length || 0}개 권한
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 권한 통계 */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">권한 요약</h5>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">부여된 권한</span>
                    <span className="font-medium text-blue-900">
                      {permissionStats.granted}/{permissionStats.total}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${permissionStats.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-blue-600 text-center">
                    {permissionStats.percentage}% 권한 보유
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: 권한 상세 */}
            <div className="lg:col-span-2">
              <h4 className="text-md font-medium text-gray-900 mb-4">
                권한 상세 ({getRoleLabel(selectedRole)})
              </h4>

              <div className="space-y-4">
                {permissionCategories.map((category) => {
                  const isExpanded = expandedCategories.includes(category.id);
                  const categoryPermissions = category.permissions.filter(p => 
                    currentRolePermissions.includes(p.id)
                  );

                  return (
                    <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        onClick={() => toggleCategory(category.id)}
                        className="px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{category.icon}</span>
                            <div>
                              <div className="font-medium text-gray-900">{category.name}</div>
                              <div className="text-sm text-gray-500">{category.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500">
                              {categoryPermissions.length}/{category.permissions.length} 권한
                            </span>
                            <svg 
                              className={`w-5 h-5 text-gray-400 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-1 gap-3">
                            {category.permissions.map((permission) => {
                              const isGranted = currentRolePermissions.includes(permission.id);
                              
                              return (
                                <div
                                  key={permission.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    isGranted 
                                      ? 'border-green-200 bg-green-50' 
                                      : 'border-gray-200 bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <span className="text-lg">{permission.icon}</span>
                                    <div>
                                      <div className={`font-medium ${
                                        isGranted ? 'text-green-900' : 'text-gray-500'
                                      }`}>
                                        {permission.name}
                                      </div>
                                      <div className={`text-sm ${
                                        isGranted ? 'text-green-700' : 'text-gray-400'
                                      }`}>
                                        {permission.description}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      getLevelColor(permission.level)
                                    }`}>
                                      {getLevelLabel(permission.level)}
                                    </span>
                                    {isGranted ? (
                                      <span className="text-green-600">✅</span>
                                    ) : (
                                      <span className="text-gray-400">❌</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            현재 역할: <span className="font-medium">{getRoleLabel(admin.role)}</span>
            {selectedRole !== admin.role && (
              <>
                {' → '}
                <span className="font-medium text-blue-600">{getRoleLabel(selectedRole)}</span>
              </>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || selectedRole === admin.role}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isLoading ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};