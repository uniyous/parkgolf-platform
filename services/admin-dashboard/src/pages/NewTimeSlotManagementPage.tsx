import React from 'react';
import { TimeSlotManagementContainer } from '../components/timeslot/TimeSlotManagementContainer';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { PageLayout } from '../components/common/Layout/PageLayout';

export const NewTimeSlotManagementPage: React.FC = () => {
  return (
    <PageLayout>
      <Breadcrumb 
        items={[
          { label: '타임슬롯 관리', icon: '⏰' }
        ]}
      />
      
      <PageLayout.Content>
        <TimeSlotManagementContainer />
      </PageLayout.Content>
    </PageLayout>
  );
};