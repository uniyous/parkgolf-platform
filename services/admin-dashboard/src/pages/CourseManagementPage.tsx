import React from 'react';
import { NewCourseManagementContainer } from '../components/course/NewCourseManagementContainer';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { PageLayout } from '../components/common/Layout/PageLayout';
import { CanManageCourses } from '../components/auth/PermissionGuard';

export const CourseManagementPage: React.FC = () => {
  return (
    <CanManageCourses
      fallback={
        <PageLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h1>
            <p className="text-gray-600">코스 관리 권한이 필요합니다.</p>
          </div>
        </PageLayout>
      }
    >
      <PageLayout>
        <Breadcrumb 
          items={[
            { label: '코스 관리', icon: '⛳' }
          ]}
        />
        
        <PageLayout.Content>
          <NewCourseManagementContainer />
        </PageLayout.Content>
      </PageLayout>
    </CanManageCourses>
  );
};