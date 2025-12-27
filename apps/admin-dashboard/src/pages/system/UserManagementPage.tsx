import React from 'react';
import { UserList } from '@/components/features/user';
import { PageLayout } from '@/components/layout';
import { Breadcrumb } from '@/components/common';
import { CanManageUsers } from '@/components/auth';

export const UserManagementPage: React.FC = () => {
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
        <Breadcrumb
          items={[
            { label: '시스템' },
            { label: '회원 관리' }
          ]}
        />
        <PageLayout.Content>
          <UserList />
        </PageLayout.Content>
      </PageLayout>
    </CanManageUsers>
  );
};
