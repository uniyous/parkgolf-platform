import React from 'react';
import { GolfCompanyCourseList } from './GolfCompanyCourseList';
import { CourseDetailContainer } from './CourseDetailContainer';
import { PageHeader, PageHeaderAction } from '../common/PageHeader';
import type { Company, Course, UpdateCourseDto } from '../../types';

interface CourseManagementPresenterProps {
  // 데이터
  companies: Company[];
  courses: Course[];
  selectedCompanyId: number | null;
  selectedCourse: Course | null;
  
  // 로딩 상태
  coursesLoading: boolean;
  
  // 에러 상태
  coursesError: string | null;
  updateError: string | null;
  
  // 이벤트 핸들러
  onCompanyChange: (companyId: string | number) => void;
  onCourseSelect: (course: Course) => void;
  onBackToCourseList: () => void;
  onUpdateCourse: (courseId: number, data: UpdateCourseDto) => Promise<boolean>;
  onAddNewCourse: () => void;
  onEditCourse: (course: Course) => void;
  onDeleteCourse: (course: Course) => void;
}

export const CourseManagementPresenter: React.FC<CourseManagementPresenterProps> = ({
  companies,
  courses,
  selectedCompanyId,
  selectedCourse,
  coursesLoading,
  coursesError,
  updateError,
  onCompanyChange,
  onCourseSelect,
  onBackToCourseList,
  onUpdateCourse,
  onAddNewCourse,
  onEditCourse,
  onDeleteCourse,
}) => {
  // 디버깅용 로그 (개발 환경에서만)
  if (import.meta.env.DEV) {
    console.log('CourseManagementPresenter - courses:', courses);
    console.log('CourseManagementPresenter - selectedCompanyId:', selectedCompanyId);
    console.log('CourseManagementPresenter - coursesLoading:', coursesLoading);
  }
  
  return (
    <div className="space-y-6">
      {/* Unified Page Header */}
      <PageHeader
        title={selectedCourse ? `${selectedCourse.name} - 홀 관리` : '코스 관리'}
        subtitle={selectedCourse ? '코스의 홀 정보를 관리합니다.' : '골프 코스와 홀 정보를 관리합니다.'}
        icon={
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        }
        onBack={selectedCourse ? onBackToCourseList : undefined}
        backLabel="목록으로"
      />

      {/* 코스 목록 또는 코스 상세 */}
      {!selectedCourse ? (
        /* 코스 목록 */
        <GolfCompanyCourseList
          companies={companies}
          courses={courses}
          selectedCompanyId={selectedCompanyId}
          loading={coursesLoading}
          error={coursesError}
          onCompanyChange={onCompanyChange}
          onCourseSelect={onCourseSelect}
          onAddNewCourse={onAddNewCourse}
          onEditCourse={onEditCourse}
          onDeleteCourse={onDeleteCourse}
        />
      ) : (
        /* 코스 상세 뷰 */
        <CourseDetailContainer
          course={selectedCourse}
          onBack={onBackToCourseList}
          onUpdateCourse={onUpdateCourse}
        />
      )}
    </div>
  );
};