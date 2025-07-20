import React, { useState, useEffect } from 'react';
import { TimeSlotStats } from './TimeSlotStats';
import { EnhancedTimeSlotList } from './EnhancedTimeSlotList';
import { TimeSlotBulkActions } from './TimeSlotBulkActions';
import { NewTimeSlotForm } from './NewTimeSlotForm';
import { TimeSlotDetailView } from './TimeSlotDetailView';
import { TimeSlotGenerationModal } from './TimeSlotGenerationModal';
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
  
  // Course selection state - 임시로 기본값 설정 (추후 프로퍼티로 받을 수 있음)
  const [selectedCourseId, setSelectedCourseId] = useState<number>(1);

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

  // Load initial data
  useEffect(() => {
    if (selectedCourseId) {
      fetchTimeSlots();
      fetchStats();
    }
  }, [filters, selectedCourseId]);

  const fetchTimeSlots = async () => {
    if (!selectedCourseId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await timeSlotApi.getTimeSlots(selectedCourseId, filters);
      
      setTimeSlots(response.timeSlots);
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
      setCurrentPage(response.page);
      
    } catch (err: any) {
      setError(err.message || '타임슬롯 데이터를 불러오는데 실패했습니다.');
      console.error('Failed to fetch time slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await timeSlotApi.getTimeSlotStats(selectedCourseId);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleCreateTimeSlot = async (data: CreateTimeSlotDto) => {
    if (!selectedCourseId) return;
    
    try {
      const newTimeSlot = await timeSlotApi.createTimeSlot(selectedCourseId, data);
      
      // 목록 새로고침
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">타임슬롯 관리</h1>
          <p className="text-gray-600 mt-1">골프장 타임슬롯을 관리하고 예약 현황을 확인하세요</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Course Selection */}
          <div className="flex items-center space-x-2">
            <label htmlFor="courseSelect" className="text-sm font-medium text-gray-700">
              코스:
            </label>
            <select
              id="courseSelect"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>코스 1</option>
              <option value={2}>코스 2</option>
              <option value={3}>코스 3</option>
            </select>
          </div>
          <button
            onClick={() => setShowGenerationModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            대량 생성
          </button>
        </div>
      </div>

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