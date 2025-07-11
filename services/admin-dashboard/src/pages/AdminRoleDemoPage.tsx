import React from 'react';
import { AdminRoleDemo } from '../components/admin/AdminRoleDemo';
import { PageLayout } from '../components/common/Layout/PageLayout';
import { Breadcrumb } from '../components/common/Breadcrumb';

const AdminRoleDemoPageComponent: React.FC = () => {
  return (
    <PageLayout>
      <Breadcrumb 
        items={[
          { label: '시스템', icon: '⚙️' },
          { label: '관리자 역할 데모', icon: '👥' }
        ]}
      />
      <PageLayout.Content>
        <AdminRoleDemo />
      </PageLayout.Content>
    </PageLayout>
  );
};

export const AdminRoleDemoPage = AdminRoleDemoPageComponent;