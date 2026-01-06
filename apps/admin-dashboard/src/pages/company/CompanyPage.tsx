import React from 'react';
import { CompanyList } from '@/components/features/company';
import { PageLayout } from '@/components/layout';
import { Breadcrumb } from '@/components/common';
import { CanManageCompanies } from '@/components/auth';

export const CompanyPage: React.FC = () => {
  return (
    <CanManageCompanies
      fallback={
        <PageLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h1>
            <p className="text-gray-600">회사 관리 권한이 필요합니다.</p>
          </div>
        </PageLayout>
      }
    >
      <PageLayout>
        <Breadcrumb
          items={[
            { label: '회사 관리' }
          ]}
        />
        <PageLayout.Content>
          <CompanyList />
        </PageLayout.Content>
      </PageLayout>
    </CanManageCompanies>
  );
};
