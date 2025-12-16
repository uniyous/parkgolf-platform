import React from 'react';
import { EnhancedAdminManagementContainer } from '../../components/admin/EnhancedAdminManagementContainer';
import { PageLayout } from '../../components/common/Layout/PageLayout';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { CanManageAdmins } from '../../components/auth/PermissionGuard';

export const AdminManagementPage: React.FC = () => {
  return (
    <CanManageAdmins
      fallback={
        <PageLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h1>
            <p className="text-gray-600">관리자 관리 권한이 필요합니다.</p>
          </div>
        </PageLayout>
      }
    >
      <PageLayout>
        <Breadcrumb 
          items={[
            { label: '시스템', icon: '⚙️' },
            { label: '관리자 관리', icon: '👨‍💼' }
          ]}
        />
        <PageLayout.Content>
          <EnhancedAdminManagementContainer />
        </PageLayout.Content>
      </PageLayout>
    </CanManageAdmins>
  );
};