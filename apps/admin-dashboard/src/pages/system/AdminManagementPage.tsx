import React from 'react';
import { AdminList } from '@/components/features/admin';
import { PageLayout } from '@/components/layout';
import { Breadcrumb } from '@/components/common';
import { CanManageAdmins } from '@/components/auth';

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
            { label: '시스템' },
            { label: '관리자 관리' }
          ]}
        />
        <PageLayout.Content>
          <AdminList />
        </PageLayout.Content>
      </PageLayout>
    </CanManageAdmins>
  );
};
