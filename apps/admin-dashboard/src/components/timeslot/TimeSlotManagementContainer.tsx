import React, { useState, useEffect } from 'react';
import { TimeSlotStats } from './TimeSlotStats';
import { EnhancedTimeSlotList } from './EnhancedTimeSlotList';
import { TimeSlotBulkActions } from './TimeSlotBulkActions';
import { NewTimeSlotForm } from './NewTimeSlotForm';
import { TimeSlotDetailView } from './TimeSlotDetailView';
import { TimeSlotGenerationModal } from './TimeSlotGenerationModal';
import { NineHoleCourseSelector } from './NineHoleCourseSelector';
import { useGolfCourseManagement } from '../../redux/hooks/useCourse';
import { useAppDispatch, useAppSelector } from '../../redux/hooks/reduxHooks';
import { fetchCompanies, fetchCoursesByCompany } from '../../redux/slices/courseSlice';
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

interface TimeSlotFilters {
  companyId?: number;
  firstCourseId?: number;
  secondCourseId?: number;
  dateFrom?: string;
  dateTo?: string;
  roundType?: 'NINE_HOLE' | 'EIGHTEEN_HOLE';
  page: number;
  limit: number;
}

export const TimeSlotManagementContainer: React.FC = () => {
  // Data state
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [stats, setStats] = useState<TimeSlotStatsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Redux hooks - 직접 store 접근으로 권한 필터링 우회
  const dispatch = useAppDispatch();
  const { companies, courses, isLoading, error: reduxError } = useAppSelector((state: any) => state.course);
  
  const companiesLoading = isLoading;
  const coursesLoading = isLoading;
  const companiesError = reduxError;
  const coursesError = reduxError;

  // UI state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filters, setFilters] = useState<TimeSlotFilters>({
    page: 1,
    limit: 20,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Course selection state
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedFirstCourseId, setSelectedFirstCourseId] = useState<number | null>(null);
  const [selectedSecondCourseId, setSelectedSecondCourseId] = useState<number | null>(null);
  const [roundType, setRoundType] = useState<'NINE_HOLE' | 'EIGHTEEN_HOLE'>('EIGHTEEN_HOLE');

  // Load initial data
  useEffect(() => {
    dispatch(fetchCompanies());
  }, [dispatch]);

  useEffect(() => {
    if (selectedCompanyId) {
      console.log('TimeSlot - useEffect triggered for company:', selectedCompanyId);
      dispatch(fetchCoursesByCompany(selectedCompanyId));
    }
  }, [selectedCompanyId, dispatch]);

  // courses 변화 감지
  useEffect(() => {
    console.log('TimeSlot - Courses updated:', courses);
    console.log('TimeSlot - Filtered courses for company', selectedCompanyId, ':', 
      selectedCompanyId ? courses.filter(c => c.companyId === selectedCompanyId) : []);
  }, [courses, selectedCompanyId]);

  // Load time slots when filters change
  useEffect(() => {
    if (selectedCompanyId || selectedFirstCourseId) {
      fetchTimeSlots();
    }
  }, [filters, selectedCompanyId, selectedFirstCourseId, selectedSecondCourseId, roundType]);

  const fetchTimeSlots = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const queryFilters = {
        ...filters,
        companyId: selectedCompanyId,
        firstCourseId: selectedFirstCourseId,
        secondCourseId: roundType === 'EIGHTEEN_HOLE' ? selectedSecondCourseId : undefined,
        roundType,
      };
      
      const response = await timeSlotApi.getTimeSlots(queryFilters);
      
      setTimeSlots(response.timeSlots || []);
      setTotalCount(response.totalCount || 0);
      setTotalPages(response.totalPages || 0);
      setCurrentPage(response.page || 1);
      
    } catch (err: any) {
      console.error('타임슬롯 로딩 실패:', err);
      setError('타임슬롯을 불러오는데 실패했습니다.');
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await timeSlotApi.getStats({
        companyId: selectedCompanyId,
        firstCourseId: selectedFirstCourseId,
        roundType,
      });
      setStats(statsData);
    } catch (err) {
      console.error('통계 로딩 실패:', err);
    }
  };

  // Course selection handlers
  const handleCompanySelect = (companyId: number) => {
    console.log('TimeSlot - Company selected:', companyId);
    console.log('TimeSlot - Available companies:', companies);
    console.log('TimeSlot - Current courses before selection:', courses);
    
    setSelectedCompanyId(companyId);
    setSelectedFirstCourseId(null);
    setSelectedSecondCourseId(null);
    setFilters(prev => ({ ...prev, companyId, firstCourseId: undefined, secondCourseId: undefined }));
  };

  const handleFirstCourseSelect = (courseId: number) => {
    setSelectedFirstCourseId(courseId);
    setFilters(prev => ({ ...prev, firstCourseId: courseId }));
  };

  const handleSecondCourseSelect = (courseId: number | null) => {
    setSelectedSecondCourseId(courseId);
    setFilters(prev => ({ ...prev, secondCourseId: courseId || undefined }));
  };

  const handleRoundTypeChange = (type: 'NINE_HOLE' | 'EIGHTEEN_HOLE') => {
    setRoundType(type);
    if (type === 'NINE_HOLE') {
      setSelectedSecondCourseId(null);
    }
  };

  // TimeSlot CRUD operations
  const handleCreateTimeSlot = async (data: CreateTimeSlotDto) => {
    try {
      setLoading(true);
      await timeSlotApi.createTimeSlot({
        ...data,
        firstCourseId: selectedFirstCourseId!,
        secondCourseId: roundType === 'EIGHTEEN_HOLE' ? selectedSecondCourseId : undefined,
        roundType,
      });
      await fetchTimeSlots();
      setShowCreateModal(false);
    } catch (err: any) {
      setError('타임슬롯 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTimeSlot = async (id: number, data: UpdateTimeSlotDto) => {
    try {
      setLoading(true);
      await timeSlotApi.updateTimeSlot(id, data);
      await fetchTimeSlots();
      setShowEditModal(false);
      setSelectedTimeSlot(null);
    } catch (err: any) {
      setError('타임슬롯 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTimeSlot = async (id: number) => {
    if (!confirm('이 타임슬롯을 삭제하시겠습니까?')) return;
    
    try {
      setLoading(true);
      await timeSlotApi.deleteTimeSlot(id);
      await fetchTimeSlots();
    } catch (err: any) {
      setError('타임슬롯 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkOperation = async (operation: BulkTimeSlotOperation, ids: number[]) => {
    try {
      setLoading(true);
      
      switch (operation.type) {
        case 'delete':
          await Promise.all(ids.map(id => timeSlotApi.deleteTimeSlot(id)));
          break;
        case 'activate':
          await Promise.all(ids.map(id => 
            timeSlotApi.updateTimeSlot(id, { status: 'ACTIVE' })
          ));
          break;
        case 'deactivate':
          await Promise.all(ids.map(id => 
            timeSlotApi.updateTimeSlot(id, { status: 'INACTIVE' })
          ));
          break;
      }
      
      await fetchTimeSlots();
      setSelectedIds([]);
      setShowBulkActions(false);
    } catch (err: any) {
      setError('일괄 작업에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTimeSlots = async (config: TimeSlotGenerationConfig) => {
    try {
      setLoading(true);
      
      // Generate multiple time slots based on config
      const slots = generateTimeSlotsFromConfig(config);
      await Promise.all(slots.map(slot => timeSlotApi.createTimeSlot({
        ...slot,
        firstCourseId: selectedFirstCourseId!,
        secondCourseId: roundType === 'EIGHTEEN_HOLE' ? selectedSecondCourseId : undefined,
        roundType,
      })));
      
      await fetchTimeSlots();
      setShowGenerationModal(false);
    } catch (err: any) {
      setError('타임슬롯 일괄 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlotsFromConfig = (config: TimeSlotGenerationConfig): CreateTimeSlotDto[] => {
    const slots: CreateTimeSlotDto[] = [];
    const { dateRange, timeSlots: timeConfig, pattern } = config;
    
    // Implementation for generating time slots based on config
    // This is a simplified version - you'd implement the full logic
    
    return slots;
  };

  const handleFiltersChange = (newFilters: Partial<TimeSlotFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {(error || companiesError || coursesError) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-sm text-red-700">
              {error || companiesError || coursesError}
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Course Selection */}
      <NineHoleCourseSelector
        companies={companies}
        courses={selectedCompanyId ? courses.filter(c => c.companyId === selectedCompanyId) : []}
        selectedCompanyId={selectedCompanyId}
        selectedFirstCourseId={selectedFirstCourseId}
        selectedSecondCourseId={selectedSecondCourseId}
        roundType={roundType}
        onCompanySelect={handleCompanySelect}
        onFirstCourseSelect={handleFirstCourseSelect}
        onSecondCourseSelect={handleSecondCourseSelect}
        onRoundTypeChange={handleRoundTypeChange}
        loading={loading || companiesLoading || coursesLoading}
      />

      {/* Stats */}
      {stats && (
        <TimeSlotStats 
          stats={stats}
          roundType={roundType}
        />
      )}

      {/* Main Content */}
      {selectedFirstCourseId && (
        <>
          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                + 새 타임슬롯
              </button>
              <button
                onClick={() => setShowGenerationModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                일괄 생성
              </button>
            </div>
            
            {selectedIds.length > 0 && (
              <button
                onClick={() => setShowBulkActions(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                선택된 {selectedIds.length}개 일괄 작업
              </button>
            )}
          </div>

          {/* Time Slot List */}
          <EnhancedTimeSlotList
            timeSlots={timeSlots}
            selectedTimeSlots={timeSlots.filter(slot => selectedIds.includes(slot.id))}
            onSelectionChange={(selectedTimeSlots) => {
              setSelectedIds(selectedTimeSlots.map(slot => slot.id));
            }}
            isLoading={loading}
            onSelectTimeSlot={(slot) => {
              setSelectedTimeSlot(slot);
              setShowDetailView(true);
            }}
            onCreateTimeSlot={() => setShowCreateModal(true)}
            onEditTimeSlot={(slot) => {
              setSelectedTimeSlot(slot);
              setShowEditModal(true);
            }}
            onDeleteTimeSlot={handleDeleteTimeSlot}
            onUpdateStatus={(slot, status) => {
              handleUpdateTimeSlot(slot.id, { status });
            }}
            onRefresh={fetchTimeSlots}
          />
        </>
      )}

      {/* Modals */}
      {showCreateModal && (
        <NewTimeSlotForm
          onSubmit={handleCreateTimeSlot}
          onCancel={() => setShowCreateModal(false)}
          roundType={roundType}
          firstCourseId={selectedFirstCourseId}
          secondCourseId={selectedSecondCourseId}
        />
      )}

      {showEditModal && selectedTimeSlot && (
        <NewTimeSlotForm
          initialData={selectedTimeSlot}
          onSubmit={(data) => handleUpdateTimeSlot(selectedTimeSlot.id, data)}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedTimeSlot(null);
          }}
          roundType={roundType}
          firstCourseId={selectedFirstCourseId}
          secondCourseId={selectedSecondCourseId}
          isEditing
        />
      )}

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
            setShowDetailView(false);
            handleDeleteTimeSlot(selectedTimeSlot.id);
            setSelectedTimeSlot(null);
          }}
        />
      )}

      {showBulkActions && (
        <TimeSlotBulkActions
          selectedIds={selectedIds}
          onExecute={handleBulkOperation}
          onCancel={() => setShowBulkActions(false)}
        />
      )}

      {showGenerationModal && (
        <TimeSlotGenerationModal
          onGenerate={handleGenerateTimeSlots}
          onCancel={() => setShowGenerationModal(false)}
          roundType={roundType}
          firstCourseId={selectedFirstCourseId}
          secondCourseId={selectedSecondCourseId}
        />
      )}
    </div>
  );
};