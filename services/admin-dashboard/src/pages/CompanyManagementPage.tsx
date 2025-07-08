import React from 'react';
import { CompanyManagementContainer } from '../components/company/CompanyManagementContainer';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { PageLayout } from '../components/common/Layout/PageLayout';

export const CompanyManagementPage: React.FC = () => {
  return (
    <PageLayout>
      <Breadcrumb 
        items={[
          { label: '회사 관리', icon: '🏢' }
        ]}
      />
      
      <PageLayout.Content>
        <CompanyManagementContainer />
      </PageLayout.Content>
    </PageLayout>
  );
};