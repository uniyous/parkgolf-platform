import React from 'react';
import { UserManagementContainer } from '../../components/user';
import { PageLayout } from '../../components/common/Layout/PageLayout';
import { CanManageUsers } from '../../components/auth/PermissionGuard';
import { useSetBreadcrumb } from '../../redux/hooks/useBreadcrumb';

export const UserManagementPage: React.FC = () => {
  // Redux breadcrumb 설정
  useSetBreadcrumb([
    { label: '시스템', icon: '⚙️' },
    { label: '사용자 관리', icon: '👥' }
  ]);

  return (
    <CanManageUsers
      fallback={
        <PageLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h1>
            <p className="text-gray-600">사용자 관리 권한이 필요합니다.</p>
          </div>
        </PageLayout>
      }
    >
      <PageLayout>
        <PageLayout.Content>
          <UserManagementContainer />
        </PageLayout.Content>
      </PageLayout>
    </CanManageUsers>
  );
};