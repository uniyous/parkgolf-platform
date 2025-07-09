import React from 'react';
import { EnhancedAdminManagementContainer } from '../components/admin/EnhancedAdminManagementContainer';
import { PageLayout } from '../components/common/Layout/PageLayout';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { withPermission } from '../hooks/usePermissionGuard';

const AdminManagementPageComponent: React.FC = () => {
  return (
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
  );
};

// 권한 기반 보호 - ADMIN_READ 권한이 있어야 접근 가능
export const AdminManagementPage = withPermission(AdminManagementPageComponent, 'ADMIN_READ');