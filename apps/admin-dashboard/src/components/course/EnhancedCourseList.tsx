import React, { useState, useMemo } from 'react';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useAuthStore, useCurrentAdmin } from '@/stores';
import type { Course, CourseStatus, DifficultyLevel, CourseType } from '../../types/course';

interface EnhancedCourseListProps {
  courses: Course[];
  isLoading: boolean;
  onSelectCourse: (course: Course) => void;
  onCreateCourse: () => void;
  onEditCourse: (course: Course) => void;
  onDeleteCourse: (course: Course) => void;
  onUpdateStatus: (course: Course, status: CourseStatus) => void;
  selectedCourses: Course[];
  onSelectionChange: (courses: Course[]) => void;
  onRefresh: () => void;
}

type SortField = 'name' | 'courseType' | 'status' | 'difficultyLevel' | 'holeCount' | 'totalBookings' | 'averageRating' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  search: string;
  courseType: CourseType | 'ALL';
  status: CourseStatus | 'ALL';
  difficultyLevel: DifficultyLevel | 'ALL';
}

export const EnhancedCourseList: React.FC<EnhancedCourseListProps> = ({
  courses,
  isLoading,
  onSelectCourse,
  onCreateCourse,
  onEditCourse,
  onDeleteCourse,
  onUpdateStatus,
  selectedCourses,
  onSelectionChange,
  onRefresh,
}) => {
  const { showConfirmation } = useConfirmation();
  const currentAdmin = useCurrentAdmin();
  const hasManageCourses = useAuthStore((state) => state.hasPermission('COURSES'));

  // 필터 및 정렬 상태
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    courseType: 'ALL',
    status: 'ALL',
    difficultyLevel: 'ALL',
  });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // 필터링 및 정렬된 코스 목록
  const filteredAndSortedCourses = useMemo(() => {
    if (!courses || !Array.isArray(courses)) {
      return [];
    }
    
    let filtered = courses.filter(course => {
      // 검색 필터
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          course.name.toLowerCase().includes(searchLower) ||
          course.description?.toLowerCase().includes(searchLower) ||
          course.address?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    }).filter(course => {
      // 코스 타입 필터
      if (filters.courseType !== 'ALL') {
        return course.courseType === filters.courseType;
      }
      return true;
    }).filter(course => {
      // 상태 필터
      if (filters.status !== 'ALL') {
        return course.status === filters.status;
      }
      return true;
    }).filter(course => {
      // 난이도 필터
      if (filters.difficultyLevel !== 'ALL') {
        return course.difficultyLevel === filters.difficultyLevel;
      }
      return true;
    });

    // 정렬
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'courseType':
          aValue = a.courseType;
          bValue = b.courseType;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'difficultyLevel':
          aValue = a.difficultyLevel;
          bValue = b.difficultyLevel;
          break;
        case 'holeCount':
          aValue = a.holeCount;
          bValue = b.holeCount;
          break;
        case 'totalBookings':
          aValue = a.totalBookings;
          bValue = b.totalBookings;
          break;
        case 'averageRating':
          aValue = a.averageRating;
          bValue = b.averageRating;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [courses, filters, sortField, sortDirection]);

  // 정렬 핸들러
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredAndSortedCourses);
    } else {
      onSelectionChange([]);
    }
  };

  // 개별 선택/해제
  const handleSelectCourse = (course: Course, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedCourses, course]);
    } else {
      onSelectionChange(selectedCourses.filter(c => c.id !== course.id));
    }
  };

  // 필터 초기화
  const resetFilters = () => {
    setFilters({
      search: '',
      courseType: 'ALL',
      status: 'ALL',
      difficultyLevel: 'ALL',
    });
  };

  // 삭제 확인
  const handleDeleteCourse = async (course: Course) => {
    const confirmed = await showConfirmation({
      title: '코스 삭제',
      message: `${course.name} 코스를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      cancelText: '취소',
      type: 'danger',
    });

    if (confirmed) {
      onDeleteCourse(course);
    }
  };

  // 상태 변경 확인
  const handleStatusChange = async (course: Course, newStatus: CourseStatus) => {
    const statusLabels = {
      ACTIVE: '활성',
      INACTIVE: '비활성',
      MAINTENANCE: '점검',
      PENDING: '대기'
    };

    const confirmed = await showConfirmation({
      title: '상태 변경',
      message: `${course.name} 코스의 상태를 '${statusLabels[newStatus]}'로 변경하시겠습니까?`,
      confirmText: '변경',
      cancelText: '취소',
      type: newStatus === 'INACTIVE' ? 'danger' : 'info',
    });

    if (confirmed) {
      onUpdateStatus(course, newStatus);
    }
  };

  // Course type badge colors
  const getCourseTypeBadgeColor = (type: CourseType): string => {
    switch (type) {
      case 'CHAMPIONSHIP': return 'bg-purple-100 text-purple-800';
      case 'PRACTICE': return 'bg-blue-100 text-blue-800';
      case 'EXECUTIVE': return 'bg-gray-100 text-gray-800';
      case 'RESORT': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Status badge colors
  const getStatusBadgeColor = (status: CourseStatus): string => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-red-100 text-red-800';
      case 'MAINTENANCE': return 'bg-yellow-100 text-yellow-800';
      case 'PENDING': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Difficulty badge colors
  const getDifficultyBadgeColor = (level: DifficultyLevel): string => {
    switch (level) {
      case 'BEGINNER': return 'bg-blue-100 text-blue-800';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED': return 'bg-orange-100 text-orange-800';
      case 'PROFESSIONAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Course type labels
  const getCourseTypeLabel = (type: CourseType): string => {
    switch (type) {
      case 'CHAMPIONSHIP': return '챔피언십';
      case 'PRACTICE': return '연습장';
      case 'EXECUTIVE': return '임원용';
      case 'RESORT': return '리조트';
      default: return type;
    }
  };

  // Status labels
  const getStatusLabel = (status: CourseStatus): string => {
    switch (status) {
      case 'ACTIVE': return '활성';
      case 'INACTIVE': return '비활성';
      case 'MAINTENANCE': return '점검';
      case 'PENDING': return '대기';
      default: return status;
    }
  };

  // Difficulty labels
  const getDifficultyLabel = (level: DifficultyLevel): string => {
    switch (level) {
      case 'BEGINNER': return '초급';
      case 'INTERMEDIATE': return '중급';
      case 'ADVANCED': return '고급';
      case 'PROFESSIONAL': return '프로';
      default: return level;
    }
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format date
  const formatDate = (dateString: string | Date): string => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const isAllSelected = filteredAndSortedCourses.length > 0 && 
    filteredAndSortedCourses.every(course => selectedCourses.some(selected => selected.id === course.id));
  const isSomeSelected = selectedCourses.length > 0 && !isAllSelected;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">코스 목록을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">코스 관리</h2>
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
            <span>전체 {courses.length}개</span>
            <span>•</span>
            <span>활성 {courses.filter(c => c.status === 'ACTIVE').length}개</span>
            <span>•</span>
            <span>점검중 {courses.filter(c => c.status === 'MAINTENANCE').length}개</span>
            <span>•</span>
            <span>비활성 {courses.filter(c => c.status === 'INACTIVE').length}개</span>
            {filteredAndSortedCourses.length !== courses.length && (
              <>
                <span>•</span>
                <span className="text-blue-600 font-medium">필터링됨 {filteredAndSortedCourses.length}개</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            새로고침
          </button>
          {hasManageCourses && (
            <button
              onClick={onCreateCourse}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              새 코스
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
            <div className="relative">
              <input
                type="text"
                placeholder="코스명, 설명, 주소..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Course Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">코스 타입</label>
            <select
              value={filters.courseType}
              onChange={(e) => setFilters({ ...filters, courseType: e.target.value as CourseType | 'ALL' })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="ALL">전체</option>
              <option value="CHAMPIONSHIP">챔피언십</option>
              <option value="PRACTICE">연습장</option>
              <option value="EXECUTIVE">임원용</option>
              <option value="RESORT">리조트</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as CourseStatus | 'ALL' })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="ALL">전체</option>
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
              <option value="MAINTENANCE">점검</option>
              <option value="PENDING">대기</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
            <select
              value={filters.difficultyLevel}
              onChange={(e) => setFilters({ ...filters, difficultyLevel: e.target.value as DifficultyLevel | 'ALL' })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="ALL">전체</option>
              <option value="BEGINNER">초급</option>
              <option value="INTERMEDIATE">중급</option>
              <option value="ADVANCED">고급</option>
              <option value="PROFESSIONAL">프로</option>
            </select>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              {filteredAndSortedCourses.length}개 결과
            </span>
            {(filters.search || filters.courseType !== 'ALL' || filters.status !== 'ALL' || filters.difficultyLevel !== 'ALL') && (
              <button
                onClick={resetFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                필터 초기화
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">정렬:</span>
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                setSortField(field as SortField);
                setSortDirection(direction as SortDirection);
              }}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="name-asc">이름 (가나다순)</option>
              <option value="name-desc">이름 (다가나순)</option>
              <option value="totalBookings-desc">예약 많은순</option>
              <option value="averageRating-desc">평점 높은순</option>
              <option value="createdAt-desc">등록일 최신순</option>
              <option value="createdAt-asc">등록일 오래된순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Course List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* List Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {selectedCourses.length > 0 ? `${selectedCourses.length}개 선택됨` : '전체 선택'}
                </span>
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Course Items */}
        {filteredAndSortedCourses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⛳</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {courses.length === 0 ? '등록된 코스가 없습니다' : '검색 조건에 맞는 코스가 없습니다'}
            </h3>
            <p className="text-gray-500 mb-4">
              {courses.length === 0 
                ? '새 코스 등록 버튼을 클릭하여 첫 번째 코스를 추가하세요.' 
                : '다른 검색 조건을 시도해보세요.'
              }
            </p>
            {courses.length > 0 && (
              <button
                onClick={resetFilters}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                모든 필터 초기화
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAndSortedCourses.map((course) => {
              const isSelected = selectedCourses.some(selected => selected.id === course.id);
              
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
                        onChange={(e) => handleSelectCourse(course, e.target.checked)}
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
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">⛳</span>
                        )}
                      </div>
                    </div>

                    {/* Course Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 
                          className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() => onSelectCourse(course)}
                        >
                          {course.name}
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(course.status)}`}>
                          {getStatusLabel(course.status)}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCourseTypeBadgeColor(course.courseType)}`}>
                          {getCourseTypeLabel(course.courseType)}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyBadgeColor(course.difficultyLevel)}`}>
                          {getDifficultyLabel(course.difficultyLevel)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
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
                          <span className="font-medium">평점:</span>
                          <br />
                          ⭐ {course.averageRating.toFixed(1)} ({course.totalReviews}개)
                        </div>
                        <div>
                          <span className="font-medium">예약:</span>
                          <br />
                          {course.totalBookings}건 ({formatCurrency(course.totalRevenue)})
                        </div>
                      </div>

                      {course.address && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">📍</span> {course.address}
                        </div>
                      )}

                      {course.description && (
                        <div className="text-sm text-gray-600 mb-2">
                          {course.description}
                        </div>
                      )}

                      {/* Facilities */}
                      {course.facilities && course.facilities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
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
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => onSelectCourse(course)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          상세보기
                        </button>
                        {hasManageCourses && (
                          <>
                            <button
                              onClick={() => onEditCourse(course)}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            >
                              수정
                            </button>
                            
                            {/* Status Actions */}
                            <div className="flex space-x-1">
                              {course.status !== 'ACTIVE' && (
                                <button
                                  onClick={() => handleStatusChange(course, 'ACTIVE')}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                >
                                  활성화
                                </button>
                              )}
                              {course.status === 'ACTIVE' && (
                                <button
                                  onClick={() => handleStatusChange(course, 'MAINTENANCE')}
                                  className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                                >
                                  점검
                                </button>
                              )}
                            </div>
                          </>
                        )}
                        
                        {hasManageCourses && currentAdmin?.scope === 'SYSTEM' && (
                          <button
                            onClick={() => handleDeleteCourse(course)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            삭제
                          </button>
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
    </div>
  );
};