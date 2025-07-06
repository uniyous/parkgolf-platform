import React from 'react';
import { CourseManagementContainer } from '../components/course/CourseManagementContainer';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { PageLayout } from '../components/common/Layout/PageLayout';

export const CourseManagementPage: React.FC = () => {
  return (
    <PageLayout>
      <Breadcrumb 
        items={[
          { label: '코스 관리', icon: '⛳' }
        ]}
      />
      <PageLayout.Header>
        <h1 className="text-3xl font-bold text-gray-900">코스 관리</h1>
        <p className="mt-2 text-sm text-gray-600">골프장의 코스를 관리할 수 있습니다.</p>
      </PageLayout.Header>
      <PageLayout.Content>
        <CourseManagementContainer />
      </PageLayout.Content>
    </PageLayout>
  );
};