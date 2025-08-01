import React from 'react';
import { CompanyManagementContainer } from '../components/company/CompanyManagementContainer';
import { PageLayout } from '../components/common/Layout/PageLayout';
import { useSetBreadcrumb } from '../redux/hooks/useBreadcrumb';

export const CompanyManagementPage: React.FC = () => {
  // Redux breadcrumb 설정
  useSetBreadcrumb([
    { label: '회사 관리', icon: '🏢' }
  ]);

  return (
    <PageLayout>
      <PageLayout.Content>
        <CompanyManagementContainer />
      </PageLayout.Content>
    </PageLayout>
  );
};