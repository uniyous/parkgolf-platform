import React, { useState, useEffect } from 'react';
import { courseApi } from '../../api/courseApi';
import type { TimeSlot, CreateTimeSlotDto, UpdateTimeSlotDto, Course } from '../../types';
import { TimeSlotForm } from './TimeSlotForm';
import { TimeSlotList } from './TimeSlotList';

interface TimeSlotManagementProps {
  course: Course;
}

export const TimeSlotManagement: React.FC<TimeSlotManagementProps> = ({ course }) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 타임슬롯 목록 조회
  const fetchTimeSlots = async () => {
    if (!course?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await courseApi.getTimeSlots(course.id);
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
  }, [course?.id]);

  // 타임슬롯 생성
  const handleCreateTimeSlot = async (timeSlotData: CreateTimeSlotDto) => {
    try {
      const newTimeSlot = await courseApi.createTimeSlot(course.id, timeSlotData);
      // API 응답이 성공적이면 로컬 상태에 추가
      setTimeSlots(prev => [...prev, newTimeSlot]);
      setShowAddModal(false);
      return true;
    } catch (error) {
      console.error('Failed to create time slot:', error);
      setError('타임슬롯 생성에 실패했습니다.');
      return false;
    }
  };

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

  // 벌크 타임슬롯 생성 (일반적인 시간대 자동 생성)
  const handleCreateBulkTimeSlots = async () => {
    const bulkTimeSlots: CreateTimeSlotDto[] = [];
    
    // 기본 운영시간 (09:00 ~ 18:00, 1시간 단위)
    for (let hour = 9; hour < 18; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      
      bulkTimeSlots.push({
        startTime,
        endTime,
        maxPlayers: 4,
        price: 10000, // 기본 가격 10,000원
        isActive: true
      });
    }

    try {
      const newTimeSlots = await courseApi.createBulkTimeSlots(course.id, bulkTimeSlots);
      // API 응답이 성공적이면 로컬 상태에 추가
      setTimeSlots(prev => [...prev, ...newTimeSlots]);
    } catch (error) {
      console.error('Failed to create bulk time slots:', error);
      setError('기본 타임슬롯 생성에 실패했습니다.');
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
        <div className="flex space-x-3">
          <button
            onClick={handleCreateBulkTimeSlots}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            기본 타임슬롯 생성
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            타임슬롯 추가
          </button>
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

      {/* 타임슬롯 추가 모달 */}
      {showAddModal && (
        <TimeSlotForm
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateTimeSlot}
          mode="create"
          title="타임슬롯 추가"
        />
      )}

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
    </div>
  );
};