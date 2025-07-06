import React from 'react';
import { GolfCompanyCourseList } from './GolfCompanyCourseList';
import { CourseDetailContainer } from './CourseDetailContainer';
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