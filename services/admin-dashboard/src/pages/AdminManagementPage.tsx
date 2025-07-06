import React from 'react';
import { AdminManagementContainer } from '../components/admin/AdminManagementContainer';
import { PageLayout } from '../components/common/Layout/PageLayout';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { withPermission } from '../hooks/usePermissionGuard';

const AdminManagementPageComponent: React.FC = () => {
  return (
    <PageLayout>
      <Breadcrumb 
        items={[
          { label: '사용자 관리', icon: '👥' }
        ]}
      />
      <PageLayout.Header>
        <h1 className="text-3xl font-bold text-gray-900">관리자 관리</h1>
        <p className="mt-2 text-sm text-gray-600">시스템 관리자들의 계정과 권한을 관리합니다.</p>
      </PageLayout.Header>
      <PageLayout.Content>
        <AdminManagementContainer />
      </PageLayout.Content>
    </PageLayout>
  );
};

// 권한 기반 보호 - ADMIN_READ 권한이 있어야 접근 가능
export const AdminManagementPage = withPermission(AdminManagementPageComponent, 'ADMIN_READ');