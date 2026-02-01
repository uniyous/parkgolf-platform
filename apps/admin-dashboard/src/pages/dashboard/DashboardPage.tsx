import React from 'react';
import { PageLayout } from '@/components/layout';
import { DashboardContainer } from '@/components/features/dashboard';

export const DashboardPage: React.FC = () => {
  return (
    <PageLayout>
      <DashboardContainer />
    </PageLayout>
  );
};
