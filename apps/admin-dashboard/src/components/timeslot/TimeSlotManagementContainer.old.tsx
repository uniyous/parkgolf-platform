import React, { useState, useEffect } from 'react';
import { TimeSlotStats } from './TimeSlotStats';
import { EnhancedTimeSlotList } from './EnhancedTimeSlotList';
import { TimeSlotBulkActions } from './TimeSlotBulkActions';
import { NewTimeSlotForm } from './NewTimeSlotForm';
import { TimeSlotDetailView } from './TimeSlotDetailView';
import { TimeSlotGenerationModal } from './TimeSlotGenerationModal';
import { DualCourseSelector } from '../course/DualCourseSelector';
import { useCourseSelection } from '../../redux/hooks/useCourseSelection';
import type { 
  TimeSlot, 
  TimeSlotFilters as TimeSlotFiltersType, 
  TimeSlotStats as TimeSlotStatsType,
  CreateTimeSlotDto,
  UpdateTimeSlotDto,
  BulkTimeSlotOperation,
  TimeSlotGenerationConfig
} from '../../types/timeslot';
import { timeSlotApi } from '../../api/timeSlotApi';

export const TimeSlotManagementContainer: React.FC = () => {
  // Data state
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [stats, setStats] = useState<TimeSlotStatsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [usingMockData, setUsingMockData] = useState(false);
  
  // Course selection using hook
  const {
    companies,
    companiesLoading,
    courses,
    coursesLoading,
    selectedCompanyId,
    selectedFrontCourseId,
    selectedBackCourseId,
    selectCompany,
    selectFrontCourse,
    selectBackCourse,
    resetSelection,
  } = useCourseSelection();

  // UI state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filters, setFilters] = useState<TimeSlotFiltersType>({
    page: 1,
    limit: 20,
    sortBy: 'date',
    sortOrder: 'asc',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Load initial data when both courses are selected
  useEffect(() => {
    if (selectedFrontCourseId && selectedBackCourseId) {
      fetchTimeSlots();
      fetchStats();
    }
  }, [filters, selectedFrontCourseId, selectedBackCourseId]);

  const fetchTimeSlots = async () => {
    if (!selectedFrontCourseId || !selectedBackCourseId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // For dual course, we need to modify the API call
      const dualCourseFilters = {
        ...filters,
        frontNineCourseId: selectedFrontCourseId,
        backNineCourseId: selectedBackCourseId,
        isDualCourse: true
      };
      
      const response = await timeSlotApi.getTimeSlots(selectedFrontCourseId, dualCourseFilters);
      
      setTimeSlots(response.timeSlots);
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
      setCurrentPage(response.page);
      setUsingMockData(false);
      
    } catch (err: any) {
      console.warn('API 호출 실패, 임시 데이터 사용:', err);
      setUsingMockData(true);
      
      // Mock data for 18-hole rounds
      const frontCourse = courses.find(c => c.id === selectedFrontCourseId);
      const backCourse = courses.find(c => c.id === selectedBackCourseId);
      
      const mockTimeSlots = [
        {
          id: 1,
          courseId: selectedFrontCourseId,
          frontNineCourseId: selectedFrontCourseId,
          frontNineCourseName: frontCourse?.name || '전반 코스',
          backNineCourseId: selectedBackCourseId,
          backNineCourseName: backCourse?.name || '후반 코스',
          isDualCourse: true,
          date: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '13:30',
          breakTime: 30,
          maxSlots: 4,
          bookedSlots: 2,
          availableSlots: 2,
          price: 120000,
          status: 'AVAILABLE' as const,
          isRecurring: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          revenue: 240000,
          utilizationRate: 50
        },
        {
          id: 2,
          courseId: selectedFrontCourseId,
          frontNineCourseId: selectedFrontCourseId,
          frontNineCourseName: frontCourse?.name || '전반 코스',
          backNineCourseId: selectedBackCourseId,
          backNineCourseName: backCourse?.name || '후반 코스',
          isDualCourse: true,
          date: new Date().toISOString().split('T')[0],
          startTime: '14:00',
          endTime: '18:30',
          breakTime: 30,
          maxSlots: 4,
          bookedSlots: 0,
          availableSlots: 4,
          price: 100000,
          status: 'AVAILABLE' as const,
          isRecurring: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          revenue: 0,
          utilizationRate: 0
        }
      ];
      
      setTimeSlots(mockTimeSlots);
      setTotalCount(mockTimeSlots.length);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsParams = {
        frontNineCourseId: selectedFrontCourseId,
        backNineCourseId: selectedBackCourseId,
        isDualCourse: true
      };
      const statsData = await timeSlotApi.getTimeSlotStats(selectedFrontCourseId!, statsParams);
      setStats(statsData);
    } catch (err) {
      console.warn('통계 API 호출 실패, 임시 데이터 사용:', err);
      setUsingMockData(true);
      
      const mockStats: TimeSlotStatsType = {
        totalSlots: 50,
        activeSlots: 45,
        fullyBookedSlots: 20,
        cancelledSlots: 5,
        totalRevenue: 4500000,
        averageUtilization: 75,
        totalBookings: 89,
        averagePrice: 110000,
        peakHours: ['09:00', '10:00', '14:00', '15:00'],
        topCourses: [
          { courseId: 1, courseName: '18홀 A→B 코스', totalSlots: 30, revenue: 2700000, utilizationRate: 80 },
          { courseId: 2, courseName: '18홀 B→A 코스', totalSlots: 20, revenue: 1800000, utilizationRate: 70 },
        ],
      };
      
      setStats(mockStats);
    }
  };

  const handleCreateTimeSlot = async (data: CreateTimeSlotDto) => {
    if (!selectedFrontCourseId || !selectedBackCourseId) return;
    
    try {
      const dualCourseData: CreateTimeSlotDto = {
        ...data,
        frontNineCourseId: selectedFrontCourseId,
        backNineCourseId: selectedBackCourseId,
        isDualCourse: true,
        breakTime: data.breakTime || 30,
      };
      
      const newTimeSlot = await timeSlotApi.createTimeSlot(selectedFrontCourseId, dualCourseData);
      
      await fetchTimeSlots();
      await fetchStats();
      
      setShowCreateModal(false);
      
    } catch (err: any) {
      setError(err.message || '타임슬롯 생성에 실패했습니다.');
      console.error('Failed to create time slot:', err);
    }
  };

  const handleUpdateTimeSlot = async (data: UpdateTimeSlotDto) => {
    if (!selectedTimeSlot || !selectedCourseId) return;
    
    try {
      await timeSlotApi.updateTimeSlot(selectedCourseId, selectedTimeSlot.id, data);
      
      // 목록 새로고침
      await fetchTimeSlots();
      await fetchStats();
      
      setShowEditModal(false);
      setSelectedTimeSlot(null);
      
    } catch (err: any) {
      setError(err.message || '타임슬롯 수정에 실패했습니다.');
      console.error('Failed to update time slot:', err);
    }
  };

  const handleDeleteTimeSlot = async (id: number) => {
    if (!selectedCourseId) return;
    
    try {
      await timeSlotApi.deleteTimeSlot(selectedCourseId, id);
      
      // 목록 새로고침
      await fetchTimeSlots();
      await fetchStats();
      
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      
    } catch (err: any) {
      setError(err.message || '타임슬롯 삭제에 실패했습니다.');
      console.error('Failed to delete time slot:', err);
    }
  };

  const handleBulkOperation = async (operation: BulkTimeSlotOperation) => {
    if (!selectedCourseId || selectedIds.length === 0) return;
    
    try {
      await timeSlotApi.bulkOperation(selectedCourseId, operation, selectedIds);
      
      // 목록 새로고침
      await fetchTimeSlots();
      await fetchStats();
      
      setSelectedIds([]);
      setShowBulkActions(false);
      
    } catch (err: any) {
      setError(err.message || '대량 작업에 실패했습니다.');
      console.error('Failed to perform bulk operation:', err);
    }
  };

  const handleGenerateTimeSlots = async (config: TimeSlotGenerationConfig) => {
    if (!selectedCourseId) return;
    
    try {
      await timeSlotApi.generateTimeSlots(selectedCourseId, config);
      
      // 목록 새로고침
      await fetchTimeSlots();
      await fetchStats();
      
      setShowGenerationModal(false);
      
    } catch (err: any) {
      setError(err.message || '타임슬롯 생성에 실패했습니다.');
      console.error('Failed to generate time slots:', err);
    }
  };

  const handleViewDetails = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setShowDetailView(true);
  };

  const handleEditTimeSlot = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setShowEditModal(true);
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleFilterChange = (newFilters: Partial<TimeSlotFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleSelectionChange = (ids: number[]) => {
    setSelectedIds(ids);
    setShowBulkActions(ids.length > 0);
  };

  const handleUpdateStatus = async (timeSlot: TimeSlot, status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED') => {
    if (!selectedCourseId) return;
    
    try {
      await timeSlotApi.updateTimeSlotStatus(selectedCourseId, timeSlot.id, status);
      
      // 목록 새로고침
      await fetchTimeSlots();
      await fetchStats();
      
    } catch (err: any) {
      setError(err.message || '타임슬롯 상태 변경에 실패했습니다.');
      console.error('Failed to update time slot status:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">타임슬롯 관리</h1>
        <p className="text-gray-600 mt-1">18홀 라운딩 타임슬롯을 관리하고 예약 현황을 확인하세요</p>
      </div>

      {/* Course Selection */}
      <DualCourseSelector
        companies={companies}
        courses={courses}
        companiesLoading={companiesLoading}
        coursesLoading={coursesLoading}
        selectedCompanyId={selectedCompanyId}
        selectedFrontCourseId={selectedFrontCourseId}
        selectedBackCourseId={selectedBackCourseId}
        onCompanyChange={selectCompany}
        onFrontCourseChange={selectFrontCourse}
        onBackCourseChange={selectBackCourse}
        onReset={resetSelection}
      />

      {/* Actions - Only show when courses are selected */}
      {selectedFrontCourseId && selectedBackCourseId && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowGenerationModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            타임슬롯 대량 생성
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && <TimeSlotStats stats={stats} />}


      {/* Bulk Actions */}
      {showBulkActions && (
        <TimeSlotBulkActions
          selectedCount={selectedIds.length}
          onBulkOperation={handleBulkOperation}
          onClose={() => {
            setSelectedIds([]);
            setShowBulkActions(false);
          }}
        />
      )}

      {/* Mock Data Warning */}
      {usingMockData && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">개발 모드:</span>
            <span className="ml-1">API 서버 연결에 실패하여 임시 데이터를 표시하고 있습니다.</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Time Slot List */}
      <EnhancedTimeSlotList
        timeSlots={timeSlots}
        isLoading={loading}
        selectedTimeSlots={timeSlots.filter(ts => selectedIds.includes(ts.id))}
        onSelectionChange={(timeSlots) => setSelectedIds(timeSlots.map(ts => ts.id))}
        onSelectTimeSlot={handleViewDetails}
        onCreateTimeSlot={() => setShowCreateModal(true)}
        onEditTimeSlot={handleEditTimeSlot}
        onDeleteTimeSlot={handleDeleteTimeSlot}
        onUpdateStatus={handleUpdateStatus}
        onRefresh={fetchTimeSlots}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <NewTimeSlotForm
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTimeSlot}
          mode="create"
          title="새 타임슬롯 생성"
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTimeSlot && (
        <NewTimeSlotForm
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTimeSlot(null);
          }}
          onSubmit={handleUpdateTimeSlot}
          timeSlot={selectedTimeSlot}
          mode="edit"
          title="타임슬롯 수정"
        />
      )}

      {/* Detail View */}
      {showDetailView && selectedTimeSlot && (
        <TimeSlotDetailView
          timeSlot={selectedTimeSlot}
          onClose={() => {
            setShowDetailView(false);
            setSelectedTimeSlot(null);
          }}
          onEdit={() => {
            setShowDetailView(false);
            setShowEditModal(true);
          }}
          onDelete={() => {
            handleDeleteTimeSlot(selectedTimeSlot.id);
            setShowDetailView(false);
            setSelectedTimeSlot(null);
          }}
        />
      )}

      {/* Generation Modal */}
      {showGenerationModal && (
        <TimeSlotGenerationModal
          isOpen={showGenerationModal}
          onClose={() => setShowGenerationModal(false)}
          onGenerate={handleGenerateTimeSlots}
        />
      )}
    </div>
  );
};