import React, { useState, useMemo } from 'react';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin, selectHasPermission } from '../../redux/slices/authSlice';
import type { TimeSlot, TimeSlotStatus } from '../../types/timeslot';

interface EnhancedTimeSlotListProps {
  timeSlots: TimeSlot[];
  isLoading: boolean;
  onSelectTimeSlot: (timeSlot: TimeSlot) => void;
  onCreateTimeSlot: () => void;
  onEditTimeSlot: (timeSlot: TimeSlot) => void;
  onDeleteTimeSlot: (timeSlot: TimeSlot) => void;
  onUpdateStatus: (timeSlot: TimeSlot, status: TimeSlotStatus) => void;
  selectedTimeSlots: TimeSlot[];
  onSelectionChange: (timeSlots: TimeSlot[]) => void;
  onRefresh: () => void;
}

type SortField = 'date' | 'startTime' | 'courseId' | 'price' | 'status' | 'availableSlots' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  search: string;
  date: string;
  status: TimeSlotStatus | 'ALL';
  courseId: number | 'ALL';
  priceRange: 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH';
}

export const EnhancedTimeSlotList: React.FC<EnhancedTimeSlotListProps> = ({
  timeSlots,
  isLoading,
  onSelectTimeSlot,
  onCreateTimeSlot,
  onEditTimeSlot,
  onDeleteTimeSlot,
  onUpdateStatus,
  selectedTimeSlots,
  onSelectionChange,
  onRefresh,
}) => {
  const { showConfirmation } = useConfirmation();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const hasManageTimeSlots = useSelector(selectHasPermission('MANAGE_TIMESLOTS'));

  // 필터 및 정렬 상태
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    date: '',
    status: 'ALL',
    courseId: 'ALL',
    priceRange: 'ALL',
  });
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // 코스 목록 (타임슬롯에서 추출)
  const availableCourses = useMemo(() => {
    const courses = Array.from(new Set(timeSlots.map(ts => ts.courseId)))
      .map(courseId => {
        const timeSlot = timeSlots.find(ts => ts.courseId === courseId);
        return {
          id: courseId,
          name: timeSlot?.courseName || `코스 ${courseId}`
        };
      });
    return courses;
  }, [timeSlots]);

  // 필터링 및 정렬된 타임슬롯 목록
  const filteredAndSortedTimeSlots = useMemo(() => {
    if (!timeSlots || !Array.isArray(timeSlots)) {
      return [];
    }
    
    let filtered = timeSlots.filter(timeSlot => {
      // 검색 필터
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          timeSlot.courseName?.toLowerCase().includes(searchLower) ||
          timeSlot.frontNineCourseName?.toLowerCase().includes(searchLower) ||
          timeSlot.backNineCourseName?.toLowerCase().includes(searchLower) ||
          timeSlot.startTime.includes(filters.search) ||
          timeSlot.endTime.includes(filters.search)
        );
      }
      return true;
    }).filter(timeSlot => {
      // 날짜 필터
      if (filters.date) {
        return timeSlot.date === filters.date;
      }
      return true;
    }).filter(timeSlot => {
      // 상태 필터
      if (filters.status !== 'ALL') {
        return timeSlot.status === filters.status;
      }
      return true;
    }).filter(timeSlot => {
      // 코스 필터
      if (filters.courseId !== 'ALL') {
        return timeSlot.courseId === filters.courseId;
      }
      return true;
    }).filter(timeSlot => {
      // 가격 범위 필터
      if (filters.priceRange !== 'ALL') {
        const price = timeSlot.price;
        switch (filters.priceRange) {
          case 'LOW': return price < 50000;
          case 'MEDIUM': return price >= 50000 && price < 100000;
          case 'HIGH': return price >= 100000;
          default: return true;
        }
      }
      return true;
    });

    // 정렬
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'startTime':
          aValue = a.startTime;
          bValue = b.startTime;
          break;
        case 'courseId':
          aValue = a.courseName || a.courseId;
          bValue = b.courseName || b.courseId;
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'availableSlots':
          aValue = a.availableSlots;
          bValue = b.availableSlots;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [timeSlots, filters, sortField, sortDirection]);

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
      onSelectionChange(filteredAndSortedTimeSlots);
    } else {
      onSelectionChange([]);
    }
  };

  // 개별 선택/해제
  const handleSelectTimeSlot = (timeSlot: TimeSlot, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedTimeSlots, timeSlot]);
    } else {
      onSelectionChange(selectedTimeSlots.filter(ts => ts.id !== timeSlot.id));
    }
  };

  // 필터 초기화
  const resetFilters = () => {
    setFilters({
      search: '',
      date: '',
      status: 'ALL',
      courseId: 'ALL',
      priceRange: 'ALL',
    });
  };

  // 삭제 확인
  const handleDeleteTimeSlot = async (timeSlot: TimeSlot) => {
    const confirmed = await showConfirmation({
      title: '타임슬롯 삭제',
      message: `${timeSlot.date} ${timeSlot.startTime}-${timeSlot.endTime} 타임슬롯을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      cancelText: '취소',
      type: 'danger',
    });

    if (confirmed) {
      onDeleteTimeSlot(timeSlot);
    }
  };

  // 상태 변경 확인
  const handleStatusChange = async (timeSlot: TimeSlot, newStatus: TimeSlotStatus) => {
    const statusLabels = {
      AVAILABLE: '예약가능',
      BOOKED: '예약완료',
      BLOCKED: '차단됨',
      CANCELLED: '취소됨'
    };

    const confirmed = await showConfirmation({
      title: '상태 변경',
      message: `${timeSlot.date} ${timeSlot.startTime}-${timeSlot.endTime} 타임슬롯의 상태를 '${statusLabels[newStatus]}'로 변경하시겠습니까?`,
      confirmText: '변경',
      cancelText: '취소',
      type: newStatus === 'BLOCKED' ? 'danger' : 'info',
    });

    if (confirmed) {
      onUpdateStatus(timeSlot, newStatus);
    }
  };

  // Status badge colors
  const getStatusBadgeColor = (status: TimeSlotStatus): string => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800';
      case 'BOOKED': return 'bg-blue-100 text-blue-800';
      case 'BLOCKED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Status labels
  const getStatusLabel = (status: TimeSlotStatus): string => {
    switch (status) {
      case 'AVAILABLE': return '예약가능';
      case 'BOOKED': return '예약완료';
      case 'BLOCKED': return '차단됨';
      case 'CANCELLED': return '취소됨';
      default: return status;
    }
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    }).format(date);
  };

  // Format time range
  const formatTimeRange = (startTime: string, endTime: string): string => {
    return `${startTime} - ${endTime}`;
  };

  // Get today's date for default filter
  const today = new Date().toISOString().split('T')[0];

  const isAllSelected = filteredAndSortedTimeSlots.length > 0 && 
    filteredAndSortedTimeSlots.every(timeSlot => selectedTimeSlots.some(selected => selected.id === timeSlot.id));
  const isSomeSelected = selectedTimeSlots.length > 0 && !isAllSelected;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">타임슬롯 목록을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">타임슬롯 관리</h2>
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
            <span>전체 {timeSlots.length}개</span>
            <span>•</span>
            <span>예약가능 {timeSlots.filter(ts => ts.status === 'AVAILABLE').length}개</span>
            <span>•</span>
            <span>예약완료 {timeSlots.filter(ts => ts.status === 'BOOKED').length}개</span>
            <span>•</span>
            <span>차단됨 {timeSlots.filter(ts => ts.status === 'BLOCKED').length}개</span>
            {filteredAndSortedTimeSlots.length !== timeSlots.length && (
              <>
                <span>•</span>
                <span className="text-blue-600 font-medium">필터링됨 {filteredAndSortedTimeSlots.length}개</span>
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
          {hasManageTimeSlots && (
            <button
              onClick={onCreateTimeSlot}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              새 타임슬롯
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
            <div className="relative">
              <input
                type="text"
                placeholder="코스명, 시간..."
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

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Course Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">코스</label>
            <select
              value={filters.courseId}
              onChange={(e) => setFilters({ ...filters, courseId: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="ALL">전체 코스</option>
              {availableCourses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as TimeSlotStatus | 'ALL' })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="ALL">전체</option>
              <option value="AVAILABLE">예약가능</option>
              <option value="BOOKED">예약완료</option>
              <option value="BLOCKED">차단됨</option>
              <option value="CANCELLED">취소됨</option>
            </select>
          </div>

          {/* Price Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">가격대</label>
            <select
              value={filters.priceRange}
              onChange={(e) => setFilters({ ...filters, priceRange: e.target.value as FilterState['priceRange'] })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="ALL">전체</option>
              <option value="LOW">5만원 미만</option>
              <option value="MEDIUM">5만원 ~ 10만원</option>
              <option value="HIGH">10만원 이상</option>
            </select>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              {filteredAndSortedTimeSlots.length}개 결과
            </span>
            {(filters.search || filters.date || filters.courseId !== 'ALL' || filters.status !== 'ALL' || filters.priceRange !== 'ALL') && (
              <button
                onClick={resetFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                필터 초기화
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setFilters({ ...filters, date: today })}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              오늘 타임슬롯 보기
            </button>
            
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
                <option value="date-asc">날짜 (오래된순)</option>
                <option value="date-desc">날짜 (최신순)</option>
                <option value="startTime-asc">시간 (이른순)</option>
                <option value="startTime-desc">시간 (늦은순)</option>
                <option value="price-desc">가격 (높은순)</option>
                <option value="price-asc">가격 (낮은순)</option>
                <option value="availableSlots-desc">가능슬롯 (많은순)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* TimeSlot List */}
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
                  {selectedTimeSlots.length > 0 ? `${selectedTimeSlots.length}개 선택됨` : '전체 선택'}
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

        {/* TimeSlot Items */}
        {filteredAndSortedTimeSlots.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🕐</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {timeSlots.length === 0 ? '등록된 타임슬롯이 없습니다' : '검색 조건에 맞는 타임슬롯이 없습니다'}
            </h3>
            <p className="text-gray-500 mb-4">
              {timeSlots.length === 0 
                ? '새 타임슬롯 등록 버튼을 클릭하여 첫 번째 타임슬롯을 추가하세요.' 
                : '다른 검색 조건을 시도해보세요.'
              }
            </p>
            {timeSlots.length > 0 && (
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
            {filteredAndSortedTimeSlots.map((timeSlot) => {
              const isSelected = selectedTimeSlots.some(selected => selected.id === timeSlot.id);
              
              return (
                <div 
                  key={timeSlot.id}
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
                        onChange={(e) => handleSelectTimeSlot(timeSlot, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </label>

                    {/* Time Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🕐</span>
                      </div>
                    </div>

                    {/* TimeSlot Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 
                          className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() => onSelectTimeSlot(timeSlot)}
                        >
                          {formatDate(timeSlot.date)} {formatTimeRange(timeSlot.startTime, timeSlot.endTime)}
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(timeSlot.status)}`}>
                          {getStatusLabel(timeSlot.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                        <div>
                          <span className="font-medium">코스:</span>
                          <br />
                          {timeSlot.isDualCourse ? (
                            <span className="flex items-center space-x-1">
                              <span className="text-blue-600">{timeSlot.frontNineCourseName || '전반'}</span>
                              <span>→</span>
                              <span className="text-green-600">{timeSlot.backNineCourseName || '후반'}</span>
                            </span>
                          ) : (
                            timeSlot.courseName || `코스 ${timeSlot.courseId}`
                          )}
                        </div>
                        <div>
                          <span className="font-medium">가격:</span>
                          <br />
                          {formatCurrency(timeSlot.price)}
                          {timeSlot.isDualCourse && <span className="text-xs text-gray-500"> (18홀)</span>}
                        </div>
                        <div>
                          <span className="font-medium">예약 현황:</span>
                          <br />
                          {timeSlot.bookedSlots}/{timeSlot.maxSlots} ({timeSlot.availableSlots}개 남음)
                        </div>
                        <div>
                          <span className="font-medium">등록일:</span>
                          <br />
                          {formatDate(timeSlot.createdAt)}
                        </div>
                      </div>

                      {timeSlot.description && (
                        <div className="text-sm text-gray-600 mb-2">
                          {timeSlot.description}
                        </div>
                      )}

                      {/* Progress Bar for Booking Status */}
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(timeSlot.bookedSlots / timeSlot.maxSlots) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {Math.round((timeSlot.bookedSlots / timeSlot.maxSlots) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => onSelectTimeSlot(timeSlot)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          상세보기
                        </button>
                        {hasManageTimeSlots && (
                          <>
                            <button
                              onClick={() => onEditTimeSlot(timeSlot)}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            >
                              수정
                            </button>
                            
                            {/* Status Actions */}
                            <div className="flex space-x-1">
                              {timeSlot.status !== 'AVAILABLE' && (
                                <button
                                  onClick={() => handleStatusChange(timeSlot, 'AVAILABLE')}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                >
                                  활성화
                                </button>
                              )}
                              {timeSlot.status === 'AVAILABLE' && (
                                <button
                                  onClick={() => handleStatusChange(timeSlot, 'BLOCKED')}
                                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                >
                                  차단
                                </button>
                              )}
                            </div>
                          </>
                        )}
                        
                        {hasManageTimeSlots && currentAdmin?.scope === 'PLATFORM' && (
                          <button
                            onClick={() => handleDeleteTimeSlot(timeSlot)}
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