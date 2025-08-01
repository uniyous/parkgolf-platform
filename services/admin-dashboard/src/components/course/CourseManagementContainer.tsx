import React, { useEffect, useState } from 'react';
import { CourseManagementPresenter } from './CourseManagementPresenter';
import { useGolfCourseManagement } from '../../redux/hooks/useCourse';
import { useModal } from '../../hooks/useModal';
import { useConfirmation } from '../../hooks/useConfirmation';
import { CourseFormModal } from './CourseFormModal';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { PageHeader, PageHeaderAction } from '../common/PageHeader';
import type { Course, UpdateCourseDto, CreateCourseDto } from '../../types';
import { courseApi } from '../../api/courseApi';
import { useBreadcrumb } from '../../redux/hooks/useBreadcrumb';


export const CourseManagementContainer: React.FC = () => {
  // 통합된 상태 관리 훅 사용
  const golfCourseManager = useGolfCourseManagement();
  const { push, pop } = useBreadcrumb();
  
  // 모달 관리
  const addCourseModal = useModal();
  const editCourseModal = useModal();
  
  // 삭제 확인 다이얼로그
  const deleteConfirmation = useConfirmation();

  // 초기 데이터 설정
  useEffect(() => {
    // 회사 목록을 가져옴 (API 내에서 개발 환경 처리)
    golfCourseManager.fetchCompanies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 빈 의존성 배열로 한 번만 실행

  // 권한에 따른 자동 선택 로직
  useEffect(() => {
    console.log('CourseManagementContainer - Auto selection effect triggered');
    console.log('Companies length:', golfCourseManager.companies.length);
    console.log('Selected company ID:', golfCourseManager.selectedCompanyId);
    console.log('Companies:', golfCourseManager.companies);
    
    // 권한 기반 자동 선택
    if (golfCourseManager.companies.length > 0 && !golfCourseManager.selectedCompanyId) {
      // 회사 관리자의 경우 자신의 회사 자동 선택
      // 플랫폼 관리자의 경우 첫 번째 회사 선택
      console.log('Auto-selecting first available company:', golfCourseManager.companies[0]);
      golfCourseManager.selectCompanyAndFetchCourses(golfCourseManager.companies[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [golfCourseManager.companies.length]); // companies 길이 변화만 감지

  // 이벤트 핸들러들
  const handleCompanyChange = (companyId: string | number) => {
    const newCompanyId = Number(companyId);
    console.log('CourseManagementContainer - handleCompanyChange called with:', companyId, 'converted to:', newCompanyId);
    golfCourseManager.selectCompanyAndFetchCourses(newCompanyId);
  };

  const handleCourseSelect = (course: Course) => {
    if (golfCourseManager.selectedCompanyId) {
      golfCourseManager.selectCourse(golfCourseManager.selectedCompanyId, course.id);
      // breadcrumb에 선택된 코스 추가
      push({ label: course.name, icon: '🏌️' });
    }
  };

  const handleBackToCourseList = () => {
    if (golfCourseManager.selectedCompanyId) {
      golfCourseManager.selectCourse(golfCourseManager.selectedCompanyId, null);
      // breadcrumb에서 코스 항목 제거
      pop();
    }
  };

  const handleUpdateCourse = async (courseId: number, data: UpdateCourseDto) => {
    try {
      const result = await golfCourseManager.updateCourseData(courseId, data);
      return result?.success ?? false;
    } catch {
      return false;
    }
  };

  const handleAddNewCourse = () => {
    setEditingCourse(null);
    addCourseModal.open();
  };

  // 코스 생성/수정 처리
  const handleCourseSubmit = async (data: CreateCourseDto | UpdateCourseDto): Promise<boolean> => {
    if (!golfCourseManager.selectedCompanyId) {
      console.error('No company selected');
      return false;
    }

    setIsSubmitting(true);
    try {
      if (editingCourse) {
        // 수정 모드
        await courseApi.updateCourse(editingCourse.id, data as UpdateCourseDto);
      } else {
        // 생성 모드
        const createData = { ...data, companyId: golfCourseManager.selectedCompanyId } as CreateCourseDto;
        await courseApi.createCourse(createData);
      }
      
      // 성공 시 코스 목록 새로고침
      golfCourseManager.selectCompanyAndFetchCourses(golfCourseManager.selectedCompanyId);
      return true;
    } catch (error) {
      console.error('Failed to save course:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // 편집할 코스 상태
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    editCourseModal.open();
  };

  const handleDeleteCourse = (course: Course) => {
    deleteConfirmation.confirm({
      title: '코스 삭제',
      message: `"${course.name}" 코스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      cancelText: '취소',
      onConfirm: async () => {
        try {
          await courseApi.deleteCourse(course.id);
          // 성공 시 코스 목록 새로고침
          if (golfCourseManager.selectedCompanyId) {
            golfCourseManager.selectCompanyAndFetchCourses(golfCourseManager.selectedCompanyId);
          }
        } catch (error) {
          console.error('Failed to delete course:', error);
        }
      }
    });
  };

  return (
    <>
      <CourseManagementPresenter
        // 데이터
        companies={golfCourseManager.companies}
        courses={golfCourseManager.courses}
        selectedCompanyId={golfCourseManager.selectedCompanyId}
        selectedCourse={golfCourseManager.selectedCourse}
        
        // 로딩 상태
        coursesLoading={golfCourseManager.coursesLoading}
        
        // 에러 상태
        coursesError={golfCourseManager.coursesError}
        updateError={null} // updateError는 CourseDetail에서 관리
        
        // 이벤트 핸들러
        onCompanyChange={handleCompanyChange}
        onCourseSelect={handleCourseSelect}
        onBackToCourseList={handleBackToCourseList}
        onUpdateCourse={handleUpdateCourse}
        onAddNewCourse={handleAddNewCourse}
        onEditCourse={handleEditCourse}
        onDeleteCourse={handleDeleteCourse}
      />

      {/* 새 코스 추가 모달 */}
      <CourseFormModal
        isOpen={addCourseModal.isOpen}
        onClose={addCourseModal.close}
        onSubmit={handleCourseSubmit}
        companyId={golfCourseManager.selectedCompanyId || 0}
        mode="create"
        loading={isSubmitting}
      />

      {/* 코스 편집 모달 */}
      <CourseFormModal
        isOpen={editCourseModal.isOpen}
        onClose={() => {
          setEditingCourse(null);
          editCourseModal.close();
        }}
        onSubmit={handleCourseSubmit}
        companyId={golfCourseManager.selectedCompanyId || 0}
        course={editingCourse}
        mode="edit"
        loading={isSubmitting}
      />

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmation.isOpen && (
        <Modal
          isOpen={deleteConfirmation.isOpen}
          onClose={deleteConfirmation.close}
          title={deleteConfirmation.config?.title || '확인'}
        >
          <div className="space-y-4">
            <p className="text-gray-600">{deleteConfirmation.config?.message}</p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={deleteConfirmation.handleCancel}>
                {deleteConfirmation.config?.cancelText || '취소'}
              </Button>
              <Button 
                onClick={deleteConfirmation.handleConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteConfirmation.config?.confirmText || '확인'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};