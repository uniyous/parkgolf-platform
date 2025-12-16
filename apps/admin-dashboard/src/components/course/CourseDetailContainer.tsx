import React, { useState } from 'react';
import { CourseDetailView } from './CourseDetailView';
import type { Course, UpdateCourseDto } from '../../types';

interface CourseDetailContainerProps {
  course: Course;
  onBack: () => void;
  onUpdateCourse: (courseId: number, data: UpdateCourseDto) => Promise<boolean>;
}

export const CourseDetailContainer: React.FC<CourseDetailContainerProps> = ({
  course,
  onBack,
  onUpdateCourse,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 코스 업데이트 핸들러
  const handleUpdateCourse = async (courseId: number, data: UpdateCourseDto): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await onUpdateCourse(courseId, data);
      if (!success) {
        setError('코스 정보 업데이트에 실패했습니다');
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '코스 정보 업데이트에 실패했습니다';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* 메인 콘텐츠 - CourseDetailView에 홀 관리가 통합됨 */}
      <CourseDetailView
        course={course}
        loading={loading}
        error={error}
        onBackToCourseList={onBack}
        onUpdateCourse={handleUpdateCourse}
      />
    </div>
  );
};