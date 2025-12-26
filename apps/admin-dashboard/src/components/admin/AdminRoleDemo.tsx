import React, { useState } from 'react';
import type { Admin, AdminRole, AdminScope } from '../../types';
import {
  ADMIN_ROLE_LABELS,
  PERMISSION_LABELS,
  ADMIN_ROLE_COLORS,
  getDefaultPermissions,
  getRoleScope,
  canManageAdmin,
  hasPermission,
  isPlatformAdmin,
  isCompanyAdmin
} from '@/utils';

// 데모용 관리자 데이터
const demoAdmins: Admin[] = [
  {
    id: 1,
    username: 'system_admin',
    email: 'admin@parkgolf.com',
    name: '김관리자',
    role: 'ADMIN',
    scope: 'SYSTEM',
    permissions: getDefaultPermissions('ADMIN'),
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    department: '본사 경영진'
  },
  {
    id: 2,
    username: 'support_admin',
    email: 'support@parkgolf.com',
    name: '박지원',
    role: 'SUPPORT',
    scope: 'SYSTEM',
    permissions: getDefaultPermissions('SUPPORT'),
    isActive: true,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    department: '고객지원팀'
  },
  {
    id: 3,
    username: 'manager_a',
    email: 'manager@golf-company-a.com',
    name: '이운영',
    role: 'MANAGER',
    scope: 'OPERATION',
    permissions: getDefaultPermissions('MANAGER'),
    isActive: true,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    companyId: 1,
    department: '운영팀',
    company: {
      id: 1,
      name: '파크골프A',
      businessNumber: '123-45-67890',
      address: '서울시 강남구',
      phone: '02-1234-5678',
      email: 'info@golf-a.com',
      status: 'active',
      description: '강남 지역 파크골프장',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  },
  {
    id: 4,
    username: 'staff_a1',
    email: 'staff@golf-course-a1.com',
    name: '최현장',
    role: 'STAFF',
    scope: 'OPERATION',
    permissions: getDefaultPermissions('STAFF'),
    isActive: true,
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-01-04T00:00:00Z',
    companyId: 1,
    courseIds: [1],
    department: '현장 운영팀'
  },
  {
    id: 5,
    username: 'viewer_a1',
    email: 'viewer@golf-course-a1.com',
    name: '김조회',
    role: 'VIEWER',
    scope: 'VIEW',
    permissions: getDefaultPermissions('VIEWER'),
    isActive: true,
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    companyId: 1,
    courseIds: [1],
    department: '조회 전용'
  }
];

export const AdminRoleDemo: React.FC = () => {
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [viewMode, setViewMode] = useState<'hierarchy' | 'permissions' | 'access-control'>('hierarchy');

  const renderAdminCard = (admin: Admin) => (
    <div 
      key={admin.id} 
      className={`p-4 border rounded-lg cursor-pointer transition-all ${
        selectedAdmin?.id === admin.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => setSelectedAdmin(admin)}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900">{admin.name}</h3>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ADMIN_ROLE_COLORS[admin.role]}`}>
          {ADMIN_ROLE_LABELS[admin.role]}
        </span>
      </div>
      <p className="text-sm text-gray-600">{admin.email}</p>
      <p className="text-xs text-gray-500 mt-1">
        {admin.scope} 레벨 • {admin.department}
      </p>
      {admin.company && (
        <p className="text-xs text-blue-600 mt-1">
          소속: {admin.company.name}
        </p>
      )}
    </div>
  );

  const renderPermissionsList = (admin: Admin) => (
    <div className="space-y-2">
      <h4 className="font-medium text-gray-900">보유 권한</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {admin.permissions.map(permission => (
          <div key={permission} className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>{PERMISSION_LABELS[permission]}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAccessControl = () => {
    if (!selectedAdmin) return null;

    const otherAdmins = demoAdmins.filter(admin => admin.id !== selectedAdmin.id);
    
    return (
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">
          {selectedAdmin.name}님이 관리할 수 있는 관리자들
        </h4>
        <div className="space-y-2">
          {otherAdmins.map(admin => {
            const canManage = canManageAdmin(selectedAdmin.role, admin.role);
            return (
              <div 
                key={admin.id} 
                className={`p-3 border rounded-lg ${
                  canManage ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{admin.name}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      ({ADMIN_ROLE_LABELS[admin.role]})
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    canManage ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {canManage ? '관리 가능' : '관리 불가'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">관리자 역할 체계 데모</h2>
        <p className="text-gray-600 mt-2">
          파크골프 부킹 서비스의 계층적 관리자 분류 시스템을 시연합니다.
        </p>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'hierarchy', label: '계층 구조' },
            { key: 'permissions', label: '권한 상세' },
            { key: 'access-control', label: '접근 제어' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Admin List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">관리자 목록</h3>
          
          {/* Platform Admins */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
              플랫폼 레벨 관리자 (본사)
            </h4>
            <div className="space-y-2 ml-5">
              {demoAdmins.filter(admin => isPlatformAdmin(admin.role)).map(renderAdminCard)}
            </div>
          </div>

          {/* Company Admins */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
              회사 레벨 관리자 (골프장 운영사)
            </h4>
            <div className="space-y-2 ml-5">
              {demoAdmins.filter(admin => isCompanyAdmin(admin.role)).map(renderAdminCard)}
            </div>
          </div>
        </div>

        {/* Right Panel - Details */}
        <div className="bg-gray-50 p-6 rounded-lg">
          {selectedAdmin ? (
            <div className="space-y-6">
              {/* Admin Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {selectedAdmin.name} 상세 정보
                </h3>
                <div className="space-y-2 text-sm">
                  <div><strong>이메일:</strong> {selectedAdmin.email}</div>
                  <div><strong>역할:</strong> {ADMIN_ROLE_LABELS[selectedAdmin.role]}</div>
                  <div><strong>관리 범위:</strong> {selectedAdmin.scope}</div>
                  <div><strong>부서:</strong> {selectedAdmin.department}</div>
                  {selectedAdmin.company && (
                    <div><strong>소속 회사:</strong> {selectedAdmin.company.name}</div>
                  )}
                </div>
              </div>

              {/* Content based on view mode */}
              {viewMode === 'hierarchy' && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">계층 구조</h4>
                  <div className="space-y-2 text-sm">
                    {isPlatformAdmin(selectedAdmin.role) ? (
                      <div>
                        <div className="p-3 bg-red-100 rounded-lg">
                          <strong>플랫폼 레벨:</strong> 모든 회사와 골프장을 관리할 수 있습니다.
                        </div>
                        <div className="mt-2 text-gray-600">
                          • 전체 회사 관리<br/>
                          • 전체 사용자 관리<br/>
                          • 시스템 설정<br/>
                          • 플랫폼 분석
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <strong>회사 레벨:</strong> 특정 회사의 자원만 관리할 수 있습니다.
                        </div>
                        <div className="mt-2 text-gray-600">
                          • 소속 회사의 골프장만 관리<br/>
                          • 소속 회사의 직원만 관리<br/>
                          • 소속 회사의 고객만 관리<br/>
                          • 소속 회사의 예약만 관리
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewMode === 'permissions' && renderPermissionsList(selectedAdmin)}
              {viewMode === 'access-control' && renderAccessControl()}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-4">👥</div>
              <p>관리자를 선택하면 상세 정보를 확인할 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};