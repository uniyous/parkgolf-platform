import React from 'react';
import { useAuthStore, useCurrentAdmin } from '@/stores';
import type { Course, CourseStatus, DifficultyLevel, CourseType } from '@/types/course';

interface CourseListProps {
  courses: Course[];
  selectedCourses: number[];
  isLoading: boolean;
  onSelectCourses: (ids: number[]) => void;
  onViewCourse: (course: Course) => void;
  onEditCourse: (course: Course) => void;
  onDeleteCourse: (course: Course) => void;
  onUpdateStatus: (course: Course, status: CourseStatus) => void;
}

export const CourseList: React.FC<CourseListProps> = ({
  courses,
  selectedCourses,
  isLoading,
  onSelectCourses,
  onViewCourse,
  onEditCourse,
  onDeleteCourse,
  onUpdateStatus
}) => {
  const currentAdmin = useCurrentAdmin();
  const hasManageCourses = useAuthStore((state) => state.hasPermission('COURSES'));
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getStatusBadge = (status: CourseStatus) => {
    switch (status) {
      case 'ACTIVE':
        return { label: '활성', color: 'bg-green-100 text-green-800' };
      case 'INACTIVE':
        return { label: '비활성', color: 'bg-red-100 text-red-800' };
      case 'MAINTENANCE':
        return { label: '점검', color: 'bg-yellow-100 text-yellow-800' };
      case 'PENDING':
        return { label: '대기', color: 'bg-gray-100 text-gray-800' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getDifficultyBadge = (level: DifficultyLevel) => {
    switch (level) {
      case 'BEGINNER':
        return { label: '초급', color: 'bg-blue-100 text-blue-800' };
      case 'INTERMEDIATE':
        return { label: '중급', color: 'bg-yellow-100 text-yellow-800' };
      case 'ADVANCED':
        return { label: '고급', color: 'bg-orange-100 text-orange-800' };
      case 'PROFESSIONAL':
        return { label: '프로', color: 'bg-red-100 text-red-800' };
      default:
        return { label: level, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getTypeIcon = (type: CourseType) => {
    switch (type) {
      case 'CHAMPIONSHIP':
        return '🏆';
      case 'PRACTICE':
        return '🎯';
      case 'EXECUTIVE':
        return '💼';
      case 'RESORT':
        return '🏖️';
      default:
        return '⛳';
    }
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          className={`w-4 h-4 ${i <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    return stars;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectCourses(courses.map(c => c.id));
    } else {
      onSelectCourses([]);
    }
  };

  const handleSelectCourse = (courseId: number, checked: boolean) => {
    if (checked) {
      onSelectCourses([...selectedCourses, courseId]);
    } else {
      onSelectCourses(selectedCourses.filter(id => id !== courseId));
    }
  };

  const isAllSelected = courses.length > 0 && selectedCourses.length === courses.length;
  const isPartiallySelected = selectedCourses.length > 0 && selectedCourses.length < courses.length;

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="animate-pulse h-4 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-6 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="w-20 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isPartiallySelected;
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                {selectedCourses.length > 0 ? `${selectedCourses.length}개 선택됨` : '전체 선택'}
              </span>
            </label>
            
            <h3 className="text-lg font-medium text-gray-900">
              코스 목록 ({courses.length}개)
            </h3>
          </div>

          {/* View Options */}
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Course List */}
      {courses.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⛳</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 코스가 없습니다</h3>
          <p className="text-gray-500 mb-4">새 코스 등록 버튼을 클릭하여 첫 번째 코스를 추가하세요.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {courses.map((course) => {
            const status = getStatusBadge(course.status);
            const difficulty = getDifficultyBadge(course.difficultyLevel);
            const isSelected = selectedCourses.includes(course.id);
            
            return (
              <div 
                key={course.id}
                className={`p-6 hover:bg-gray-50 transition-colors duration-150 ${
                  isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center space-x-4">
                  {/* Checkbox */}
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectCourse(course.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </label>

                  {/* Course Image */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                      {course.imageUrl ? (
                        <img
                          src={course.imageUrl}
                          alt={course.name}
                          className="w-20 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="text-2xl">
                          {getTypeIcon(course.courseType)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Course Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 
                        className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                        onClick={() => onViewCourse(course)}
                      >
                        {course.name}
                      </h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${difficulty.color}`}>
                        {difficulty.label}
                      </span>
                      {course.website && (
                        <a
                          href={course.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">홀/파:</span>
                        <br />
                        {course.holeCount}홀 / 파{course.par}
                      </div>
                      <div>
                        <span className="font-medium">야디지:</span>
                        <br />
                        {course.yardage.toLocaleString()}야드
                      </div>
                      <div>
                        <span className="font-medium">코스레이팅:</span>
                        <br />
                        {course.courseRating} / {course.slopeRating}
                      </div>
                      <div>
                        <span className="font-medium">가격:</span>
                        <br />
                        평일 {formatCurrency(course.weekdayPrice)}
                      </div>
                    </div>

                    {course.address && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">주소:</span> {course.address}
                      </div>
                    )}

                    {course.description && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">설명:</span> {course.description}
                      </div>
                    )}

                    {/* Facilities */}
                    {course.facilities.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm font-medium text-gray-600">시설:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {course.facilities.slice(0, 3).map((facility, index) => (
                            <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              {facility}
                            </span>
                          ))}
                          {course.facilities.length > 3 && (
                            <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              +{course.facilities.length - 3}개
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="flex-shrink-0 text-right space-y-2">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(course.totalRevenue)}
                      </div>
                      <div className="text-xs text-gray-500">총 매출</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        {course.totalBookings}건
                      </div>
                      <div className="text-xs text-gray-500">총 예약</div>
                    </div>
                    <div className="flex items-center justify-end space-x-1">
                      {getRatingStars(Math.round(course.averageRating))}
                      <span className="text-xs text-gray-500 ml-1">
                        {course.averageRating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0">
                    <div className="flex items-center space-x-1">
                      {/* View Button */}
                      <button
                        onClick={() => onViewCourse(course)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="상세보기"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      
                      {hasManageCourses && (
                        <>
                          {/* Edit Button */}
                          <button
                            onClick={() => onEditCourse(course)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="수정"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          
                          {/* Status Toggle Button */}
                          {course.status === 'ACTIVE' ? (
                            <button
                              onClick={() => onUpdateStatus(course, 'MAINTENANCE')}
                              className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors"
                              title="점검 모드로 전환"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => onUpdateStatus(course, 'ACTIVE')}
                              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                              title="활성화"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                        </>
                      )}
                      
                      {hasManageCourses && currentAdmin?.scope === 'SYSTEM' && (
                        <>
                          {/* Delete Button */}
                          <button
                            onClick={() => onDeleteCourse(course)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};