import React from 'react';
import { CompanyList } from '@/components/features/company';
import { PageLayout } from '@/components/layout';
import { Breadcrumb } from '@/components/common';

export const CompanyPage: React.FC = () => {
  return (
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
  );
};
