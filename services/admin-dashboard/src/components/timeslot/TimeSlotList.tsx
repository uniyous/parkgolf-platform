import React, { useState } from 'react';
import type { TimeSlot } from '../../types';
import { TimeSlotCard } from './TimeSlotCard';

interface TimeSlotListProps {
  timeSlots: TimeSlot[];
  onEdit: (timeSlot: TimeSlot) => void;
  onDelete: (timeSlot: TimeSlot) => void;
}

export const TimeSlotList: React.FC<TimeSlotListProps> = ({
  timeSlots,
  onEdit,
  onDelete
}) => {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  
  // timeSlots가 배열인지 확인하고 방어적 처리
  const validTimeSlots = Array.isArray(timeSlots) ? timeSlots : [];
  
  // 날짜와 시간대별로 정렬
  const sortedTimeSlots = [...validTimeSlots].sort((a, b) => {
    const dateCompare = (a.date || '').localeCompare(b.date || '');
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  // 날짜별로 그룹화
  const groupedTimeSlots = sortedTimeSlots.reduce((groups, timeSlot) => {
    const date = timeSlot.date || '';
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(timeSlot);
    return groups;
  }, {} as Record<string, TimeSlot[]>);

  // 날짜 포맷팅
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const handleTimeSlotClick = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(selectedTimeSlot?.id === timeSlot.id ? null : timeSlot);
  };

  if (timeSlots.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-6xl mb-4">🕐</div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">등록된 타임슬롯이 없습니다</h4>
        <p className="text-gray-500 mb-4">타임슬롯 추가 버튼을 클릭하여 첫 번째 타임슬롯을 추가하세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 날짜별로 그룹화된 타임슬롯 표시 */}
      {Object.entries(groupedTimeSlots).map(([date, timeSlots]) => (
        <div key={date} className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900">
              {formatDate(date)}
            </h4>
            <span className="text-sm text-gray-500">
              {timeSlots.length}개 타임슬롯
            </span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {timeSlots.map((timeSlot) => (
              <TimeSlotCard
                key={timeSlot.id}
                timeSlot={timeSlot}
                variant="detailed"
                onEdit={() => onEdit(timeSlot)}
                onDelete={() => onDelete(timeSlot)}
                onClick={() => handleTimeSlotClick(timeSlot)}
                isSelected={selectedTimeSlot?.id === timeSlot.id}
                showActions={true}
              />
            ))}
          </div>
        </div>
      ))}

      {/* 요약 정보 */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <h5 className="font-medium text-gray-900 mb-3">타임슬롯 요약</h5>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{timeSlots.length}</div>
            <div className="text-gray-600">총 타임슬롯</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {timeSlots.filter(slot => slot.status === 'ACTIVE').length}
            </div>
            <div className="text-gray-600">활성 타임슬롯</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {timeSlots.reduce((sum, slot) => sum + (slot.bookedSlots || 0), 0)}
            </div>
            <div className="text-gray-600">총 예약</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              ₩{new Intl.NumberFormat('ko-KR').format(
                Math.round(timeSlots.reduce((sum, slot) => sum + slot.price, 0) / timeSlots.length || 0)
              )}
            </div>
            <div className="text-gray-600">평균 가격</div>
          </div>
        </div>
      </div>
    </div>
  );
};