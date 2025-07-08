import React, { useState, useEffect } from 'react';
import { courseApi } from '../../api/courseApi';
import type { TimeSlot, CreateTimeSlotDto, UpdateTimeSlotDto, Course, WeeklySchedule } from '../../types';
import { TimeSlotForm } from './TimeSlotForm';
import { TimeSlotList } from './TimeSlotList';
import { TimeSlotPatternModal, TimeSlotGenerationConfig } from './TimeSlotPatternModal';

interface TimeSlotManagementProps {
  course: Course;
}

export const TimeSlotManagement: React.FC<TimeSlotManagementProps> = ({ course }) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPatternModal, setShowPatternModal] = useState(false);

  // 필터 상태
  const [filter, setFilter] = useState<TimeSlotFilter>({
    page: 1,
    limit: 20
  });

  // 타임슬롯 목록 조회
  const fetchTimeSlots = async () => {
    if (!course?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await courseApi.getTimeSlots(course.id, filter);
      setTimeSlots(data);
    } catch (error) {
      setError('타임슬롯 정보를 불러오는데 실패했습니다.');
      console.error('Failed to fetch time slots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeSlots();
  }, [course?.id, filter]);


  // 타임슬롯 수정
  const handleUpdateTimeSlot = async (timeSlotData: UpdateTimeSlotDto) => {
    if (!selectedTimeSlot) return false;
    
    try {
      const updatedTimeSlot = await courseApi.updateTimeSlot(course.id, selectedTimeSlot.id, timeSlotData);
      // API 응답이 성공적이면 로컬 상태 업데이트
      setTimeSlots(prev => prev.map(ts => ts.id === selectedTimeSlot.id ? updatedTimeSlot : ts));
      setShowEditModal(false);
      setSelectedTimeSlot(null);
      return true;
    } catch (error) {
      console.error('Failed to update time slot:', error);
      setError('타임슬롯 수정에 실패했습니다.');
      return false;
    }
  };

  // 타임슬롯 삭제
  const handleDeleteTimeSlot = async () => {
    if (!selectedTimeSlot) return;
    
    try {
      await courseApi.deleteTimeSlot(course.id, selectedTimeSlot.id);
      // API 응답이 성공적이면 로컬 상태에서 제거
      setTimeSlots(prev => prev.filter(ts => ts.id !== selectedTimeSlot.id));
      setShowDeleteConfirm(false);
      setSelectedTimeSlot(null);
    } catch (error) {
      console.error('Failed to delete time slot:', error);
      setError('타임슬롯 삭제에 실패했습니다.');
    }
  };

  // 편집 모달 열기
  const openEditModal = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setShowEditModal(true);
  };

  // 삭제 확인 모달 열기
  const openDeleteConfirm = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setShowDeleteConfirm(true);
  };

  // 시간을 분으로 변환하는 헬퍼 함수
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // 분을 시간으로 변환하는 헬퍼 함수  
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // 운영시간 범위 검증 함수
  const isTimeSlotWithinOperatingHours = (
    slotStart: string, 
    slotEnd: string, 
    operatingStart: string, 
    operatingEnd: string
  ): boolean => {
    const slotStartMin = timeToMinutes(slotStart);
    const slotEndMin = timeToMinutes(slotEnd);
    const opStartMin = timeToMinutes(operatingStart);
    const opEndMin = timeToMinutes(operatingEnd);
    
    return slotStartMin >= opStartMin && slotEndMin <= opEndMin;
  };

  // 패턴 기반 타임슬롯 생성
  const handlePatternGeneration = async (config: TimeSlotGenerationConfig) => {
    try {
      // 먼저 운영 스케줄 조회
      const weeklySchedules = await courseApi.getWeeklySchedule(course.id);
      
      if (!weeklySchedules || weeklySchedules.length === 0) {
        setError('운영 스케줄이 설정되지 않았습니다. 먼저 운영 스케줄을 설정해주세요.');
        return;
      }

      const bulkTimeSlots: CreateTimeSlotDto[] = [];
      const startDate = new Date(config.startDate);
      const endDate = new Date(config.endDate);
      
      // 날짜 반복
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
        
        // 해당 요일의 운영 스케줄 찾기
        const daySchedule = weeklySchedules.find(schedule => 
          schedule.dayOfWeek === dayOfWeek && schedule.isActive
        );
        
        if (!daySchedule) {
          console.log(`${date.toDateString()} (${dayOfWeek}요일)은 휴무일입니다.`);
          continue;
        }

        const operatingStart = daySchedule.openTime;
        const operatingEnd = daySchedule.closeTime;
        
        switch (config.pattern) {
          case 'AM_PM': {
            const amStart = config.amStartTime || '09:00';
            const amEnd = config.amEndTime || '12:00';
            const pmStart = config.pmStartTime || '13:00';
            const pmEnd = config.pmEndTime || '18:00';

            const dateStr = date.toISOString().split('T')[0];

            // 오전 타임슬롯 검증
            if (isTimeSlotWithinOperatingHours(amStart, amEnd, operatingStart, operatingEnd)) {
              bulkTimeSlots.push({
                date: dateStr,
                startTime: amStart,
                endTime: amEnd,
                maxPlayers: config.maxPlayers,
                price: config.price,
                isActive: true
              });
            }
            
            // 오후 타임슬롯 검증
            if (isTimeSlotWithinOperatingHours(pmStart, pmEnd, operatingStart, operatingEnd)) {
              bulkTimeSlots.push({
                date: dateStr,
                startTime: pmStart,
                endTime: pmEnd,
                maxPlayers: config.maxPlayers,
                price: config.price,
                isActive: true
              });
            }
            break;
          }
          
          case 'INTERVAL_10':
          case 'INTERVAL_15':
          case 'INTERVAL_30':
          case 'INTERVAL_60':
          case 'CUSTOM': {
            const interval = config.pattern === 'CUSTOM' 
              ? (config.customInterval || 30)
              : parseInt(config.pattern.split('_')[1]);
            
            // 사용자가 입력한 시간과 운영시간 중 더 제한적인 범위 사용
            const configStartMin = timeToMinutes(config.startTime);
            const configEndMin = timeToMinutes(config.endTime);
            const operatingStartMin = timeToMinutes(operatingStart);
            const operatingEndMin = timeToMinutes(operatingEnd);
            
            const effectiveStartMin = Math.max(configStartMin, operatingStartMin);
            const effectiveEndMin = Math.min(configEndMin, operatingEndMin);
            
            if (effectiveStartMin >= effectiveEndMin) {
              console.log(`${date.toDateString()}: 설정된 시간이 운영시간과 겹치지 않습니다.`);
              continue;
            }
            
            const dateStr = date.toISOString().split('T')[0];
            
            for (let minutes = effectiveStartMin; minutes < effectiveEndMin; minutes += interval) {
              const slotEndMinutes = minutes + interval;
              
              // 타임슬롯이 운영시간을 넘어가지 않는지 확인
              if (slotEndMinutes <= effectiveEndMin) {
                bulkTimeSlots.push({
                  date: dateStr,
                  startTime: minutesToTime(minutes),
                  endTime: minutesToTime(slotEndMinutes),
                  maxPlayers: config.maxPlayers,
                  price: config.price,
                  isActive: true
                });
              }
            }
            break;
          }
        }
      }
      
      if (bulkTimeSlots.length === 0) {
        setError('운영시간 범위 내에 생성할 수 있는 타임슬롯이 없습니다.');
        return;
      }
      
      const newTimeSlots = await courseApi.createBulkTimeSlots(course.id, bulkTimeSlots);
      setTimeSlots(prev => [...prev, ...newTimeSlots]);
      setShowPatternModal(false);
      setError(null);
      
      console.log(`총 ${bulkTimeSlots.length}개의 타임슬롯이 운영시간 범위 내에서 생성되었습니다.`);
      
    } catch (error) {
      console.error('Failed to create time slots:', error);
      setError('타임슬롯 생성에 실패했습니다.');
    }
  };


  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">타임슬롯 관리</h2>
          <p className="text-sm text-gray-600 mt-1">{course.name}</p>
        </div>
        <button
          onClick={() => setShowPatternModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          패턴으로 생성
        </button>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">필터</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시작 날짜
            </label>
            <input
              type="date"
              value={filter.dateFrom || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종료 날짜
            </label>
            <input
              type="date"
              value={filter.dateTo || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시작 시간
            </label>
            <input
              type="time"
              value={filter.timeFrom || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, timeFrom: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종료 시간
            </label>
            <input
              type="time"
              value={filter.timeTo || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, timeTo: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              활성 상태
            </label>
            <select
              value={filter.isActive === undefined ? '' : filter.isActive.toString()}
              onChange={(e) => setFilter(prev => ({ 
                ...prev, 
                isActive: e.target.value === '' ? undefined : e.target.value === 'true'
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">전체</option>
              <option value="true">활성</option>
              <option value="false">비활성</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              페이지 크기
            </label>
            <select
              value={filter.limit || 20}
              onChange={(e) => setFilter(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilter({ page: 1, limit: 20 })}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* 타임슬롯 목록 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            타임슬롯 목록 ({timeSlots.length}개)
          </h3>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">타임슬롯 정보를 불러오는 중...</p>
            </div>
          ) : (
            <TimeSlotList
              timeSlots={timeSlots}
              onEdit={openEditModal}
              onDelete={openDeleteConfirm}
            />
          )}
        </div>
      </div>

      {/* 타임슬롯 수정 모달 */}
      {showEditModal && selectedTimeSlot && (
        <TimeSlotForm
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

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && selectedTimeSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">타임슬롯 삭제</h3>
            <div className="mb-6">
              <p className="text-gray-600">
                <strong>{selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}</strong> 타임슬롯을 삭제하시겠습니까?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedTimeSlot(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteTimeSlot}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 패턴 생성 모달 */}
      <TimeSlotPatternModal
        isOpen={showPatternModal}
        onClose={() => setShowPatternModal(false)}
        onGenerate={handlePatternGeneration}
      />

    </div>
  );
};