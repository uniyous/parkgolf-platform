import React, { useState, useEffect } from 'react';
import { TimeSlotStats } from './TimeSlotStats';
import { TimeSlotFilters } from './TimeSlotFilters';
import { NewTimeSlotList } from './NewTimeSlotList';
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
import { generateMockTimeSlots, generateMockTimeSlotStats } from '../../types/timeslot';

export const TimeSlotManagementContainer: React.FC = () => {
  // Data state
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [stats, setStats] = useState<TimeSlotStatsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    fetchTimeSlots();
    fetchStats();
  }, [filters]);

  const fetchTimeSlots = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let mockData = generateMockTimeSlots(100);
      
      // Apply filters
      if (filters.search) {
        mockData = mockData.filter(slot => 
          slot.course?.name.toLowerCase().includes(filters.search!.toLowerCase()) ||
          slot.date.includes(filters.search!)
        );
      }
      
      if (filters.courseId) {
        mockData = mockData.filter(slot => slot.courseId === filters.courseId);
      }
      
      if (filters.status) {
        mockData = mockData.filter(slot => slot.status === filters.status);
      }
      
      if (filters.dateFrom) {
        mockData = mockData.filter(slot => slot.date >= filters.dateFrom!);
      }
      
      if (filters.dateTo) {
        mockData = mockData.filter(slot => slot.date <= filters.dateTo!);
      }
      
      if (filters.timeFrom) {
        mockData = mockData.filter(slot => slot.startTime >= filters.timeFrom!);
      }
      
      if (filters.timeTo) {
        mockData = mockData.filter(slot => slot.endTime <= filters.timeTo!);
      }
      
      if (filters.minAvailableSlots !== undefined) {
        mockData = mockData.filter(slot => slot.availableSlots >= filters.minAvailableSlots!);
      }
      
      if (filters.maxAvailableSlots !== undefined) {
        mockData = mockData.filter(slot => slot.availableSlots <= filters.maxAvailableSlots!);
      }
      
      if (filters.minPrice !== undefined) {
        mockData = mockData.filter(slot => slot.price >= filters.minPrice!);
      }
      
      if (filters.maxPrice !== undefined) {
        mockData = mockData.filter(slot => slot.price <= filters.maxPrice!);
      }
      
      if (filters.isRecurring !== undefined) {
        mockData = mockData.filter(slot => slot.isRecurring === filters.isRecurring);
      }
      
      // Apply sorting
      if (filters.sortBy) {
        mockData.sort((a, b) => {
          let aValue: any = a[filters.sortBy as keyof TimeSlot];
          let bValue: any = b[filters.sortBy as keyof TimeSlot];
          
          // Handle special sorting cases
          if (filters.sortBy === 'date') {
            aValue = new Date(a.date + 'T' + a.startTime).getTime();
            bValue = new Date(b.date + 'T' + b.startTime).getTime();
          } else if (filters.sortBy === 'time') {
            aValue = a.startTime;
            bValue = b.startTime;
          }
          
          if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
          if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      // Apply pagination
      const startIndex = ((filters.page || 1) - 1) * (filters.limit || 20);
      const endIndex = startIndex + (filters.limit || 20);
      
      setTimeSlots(mockData.slice(startIndex, endIndex));
      setCurrentPage(filters.page || 1);
      
    } catch (err) {
      setError('타임슬롯 데이터를 불러오는데 실패했습니다.');
      console.error('Failed to fetch time slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setStats(generateMockTimeSlotStats());
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleCreateTimeSlot = async (data: CreateTimeSlotDto) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newTimeSlot: TimeSlot = {
        id: Date.now(),
        ...data,
        currentBookings: 0,
        availableSlots: data.maxPlayers,
        status: data.status || 'ACTIVE',
        isRecurring: data.isRecurring || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        revenue: 0,
        utilizationRate: 0,
      };
      
      setTimeSlots(prev => [newTimeSlot, ...prev]);
      setShowCreateModal(false);
      fetchStats(); // Refresh stats
      
    } catch (err) {
      setError('타임슬롯 생성에 실패했습니다.');
      console.error('Failed to create time slot:', err);
    }
  };

  const handleUpdateTimeSlot = async (data: UpdateTimeSlotDto) => {
    if (!selectedTimeSlot) return;
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedTimeSlot = {
        ...selectedTimeSlot,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      
      setTimeSlots(prev => prev.map(slot => 
        slot.id === selectedTimeSlot.id ? updatedTimeSlot : slot
      ));
      setShowEditModal(false);
      setSelectedTimeSlot(null);
      fetchStats(); // Refresh stats
      
    } catch (err) {
      setError('타임슬롯 수정에 실패했습니다.');
      console.error('Failed to update time slot:', err);
    }
  };

  const handleDeleteTimeSlot = async (id: number) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTimeSlots(prev => prev.filter(slot => slot.id !== id));
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      fetchStats(); // Refresh stats
      
    } catch (err) {
      setError('타임슬롯 삭제에 실패했습니다.');
      console.error('Failed to delete time slot:', err);
    }
  };

  const handleBulkOperation = async (operation: BulkTimeSlotOperation) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      switch (operation.type) {
        case 'DELETE':
          setTimeSlots(prev => prev.filter(slot => !selectedIds.includes(slot.id)));
          break;
        case 'STATUS_CHANGE':
          if (operation.data?.status) {
            setTimeSlots(prev => prev.map(slot => 
              selectedIds.includes(slot.id) 
                ? { ...slot, status: operation.data!.status!, updatedAt: new Date().toISOString() }
                : slot
            ));
          }
          break;
        case 'UPDATE':
          if (operation.data) {
            setTimeSlots(prev => prev.map(slot => 
              selectedIds.includes(slot.id) 
                ? { ...slot, ...operation.data, updatedAt: new Date().toISOString() }
                : slot
            ));
          }
          break;
      }
      
      setSelectedIds([]);
      setShowBulkActions(false);
      fetchStats(); // Refresh stats
      
    } catch (err) {
      setError('대량 작업에 실패했습니다.');
      console.error('Failed to perform bulk operation:', err);
    }
  };

  const handleGenerateTimeSlots = async (config: TimeSlotGenerationConfig) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const startDate = new Date(config.startDate);
      const endDate = new Date(config.endDate);
      const newSlots: TimeSlot[] = [];
      
      // Generate slots based on pattern
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        
        // Skip weekends if excluded
        if (config.excludeWeekends && (date.getDay() === 0 || date.getDay() === 6)) {
          continue;
        }
        
        switch (config.pattern) {
          case 'HOURLY':
            const startHour = parseInt(config.startTime.split(':')[0]);
            const endHour = parseInt(config.endTime.split(':')[0]);
            
            for (let hour = startHour; hour < endHour; hour++) {
              newSlots.push({
                id: Date.now() + newSlots.length,
                courseId: config.courseId,
                date: dateStr,
                startTime: `${hour.toString().padStart(2, '0')}:00`,
                endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
                maxPlayers: config.maxPlayers,
                currentBookings: 0,
                availableSlots: config.maxPlayers,
                price: config.price,
                status: 'ACTIVE',
                isRecurring: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                revenue: 0,
                utilizationRate: 0,
              });
            }
            break;
          // Add other patterns as needed
        }
      }
      
      setTimeSlots(prev => [...newSlots, ...prev]);
      setShowGenerationModal(false);
      fetchStats(); // Refresh stats
      
    } catch (err) {
      setError('타임슬롯 생성에 실패했습니다.');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">타임슬롯 관리</h1>
          <p className="text-gray-600 mt-1">골프장 타임슬롯을 관리하고 예약 현황을 확인하세요</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowGenerationModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            대량 생성
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            타임슬롯 추가
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && <TimeSlotStats stats={stats} />}

      {/* Filters */}
      <TimeSlotFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={() => setFilters({ page: 1, limit: 20, sortBy: 'date', sortOrder: 'asc' })}
      />

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
      <NewTimeSlotList
        timeSlots={timeSlots}
        loading={loading}
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
        onView={handleViewDetails}
        onEdit={handleEditTimeSlot}
        onDelete={handleDeleteTimeSlot}
        onPageChange={handlePageChange}
        currentPage={currentPage}
        pageSize={filters.limit || 20}
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