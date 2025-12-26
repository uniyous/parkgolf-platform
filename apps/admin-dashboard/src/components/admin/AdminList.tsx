import React, { useEffect } from 'react';
import { useAdminActions } from '../../hooks/useAdminActions';
import { useRolePermission } from '../../hooks/useRolePermission';
import type { Admin, AdminRole } from '../../types';

interface AdminListProps {
  onSelectAdmin: (admin: Admin) => void;
  onCreateAdmin: () => void;
  onEditAdmin: (admin: Admin) => void;
  onDeleteAdmin: (admin: Admin) => void;
}

export const AdminList: React.FC<AdminListProps> = ({
  onSelectAdmin,
  onCreateAdmin,
  onEditAdmin,
  onDeleteAdmin,
}) => {
  const { admins, isLoading, fetchAdmins } = useAdminActions();
  const { hasPermission } = useRolePermission();

  // 초기 데이터 로드
  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // 역할별 배지 색상
  const getRoleBadgeColor = (role: AdminRole): string => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'SUPPORT': return 'bg-purple-100 text-purple-800';
      case 'MANAGER': return 'bg-blue-100 text-blue-800';
      case 'STAFF': return 'bg-green-100 text-green-800';
      case 'VIEWER': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 역할명 한글 변환
  const getRoleLabel = (role: AdminRole): string => {
    switch (role) {
      case 'ADMIN': return '시스템 관리자';
      case 'SUPPORT': return '고객지원';
      case 'MANAGER': return '운영 관리자';
      case 'STAFF': return '현장 직원';
      case 'VIEWER': return '조회 전용';
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">관리자 목록을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">관리자 목록</h2>
          <p className="mt-1 text-sm text-gray-500">
            총 {admins.length}명의 관리자가 등록되어 있습니다.
          </p>
        </div>
        {hasPermission('ADMINS') && (
          <button
            onClick={onCreateAdmin}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            새 관리자 추가
          </button>
        )}
      </div>

      {/* 관리자 목록 테이블 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          {admins.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">등록된 관리자가 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      관리자 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      역할
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr
                      key={admin.id}
                      onClick={() => onSelectAdmin(admin)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {admin.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {admin.email}
                            </div>
                            <div className="text-xs text-gray-400">
                              @{admin.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(admin.role)}`}>
                          {getRoleLabel(admin.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          admin.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {admin.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {hasPermission('ADMINS') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditAdmin(admin);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              수정
                            </button>
                          )}
                          {hasPermission('ADMINS') && admin.role !== 'ADMIN' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAdmin(admin);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};