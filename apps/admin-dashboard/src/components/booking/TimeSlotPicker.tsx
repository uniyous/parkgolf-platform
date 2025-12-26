import React, { useState, useEffect } from 'react';
import { courseApi } from '@/lib/api/courseApi';
import { bookingApi } from '@/lib/api/bookingApi';
import type { Course, TimeSlotAvailability } from '../../types';

interface TimeSlotPickerProps {
  course: Course;
  selectedDate: string;
  onTimeSlotSelect: (timeSlot: TimeSlotAvailability) => void;
  selectedTimeSlot?: TimeSlotAvailability;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  course,
  selectedDate,
  onTimeSlotSelect,
  selectedTimeSlot
}) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlotAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 타임슬롯 가용성 조회
  const fetchTimeSlots = async () => {
    if (!course?.id || !selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      const availability = await courseApi.getAvailability(course.id, selectedDate);
      setTimeSlots(availability);
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
      setError('타임슬롯 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeSlots();
  }, [course?.id, selectedDate]);

  // 시간 포맷팅
  const formatTimeRange = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
  };

  // 가격 포맷팅
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  // 타임슬롯 상태별 스타일
  const getTimeSlotStyle = (slot: TimeSlotAvailability, isSelected: boolean) => {
    const baseClasses = "p-4 border rounded-lg cursor-pointer transition-all duration-200";
    
    if (isSelected) {
      return `${baseClasses} border-blue-500 bg-blue-50 shadow-md`;
    }

    if (!slot.isAvailable) {
      return `${baseClasses} border-gray-200 bg-gray-50 cursor-not-allowed opacity-60`;
    }

    if (slot.availableSlots <= 0) {
      return `${baseClasses} border-red-200 bg-red-50 cursor-not-allowed`;
    }

    if (slot.availableSlots <= slot.maxPlayers * 0.3) {
      return `${baseClasses} border-yellow-300 bg-yellow-50 hover:border-yellow-400 hover:shadow-sm`;
    }

    return `${baseClasses} border-green-300 bg-green-50 hover:border-green-400 hover:shadow-sm`;
  };

  // 타임슬롯 선택 핸들러
  const handleTimeSlotSelect = (slot: TimeSlotAvailability) => {
    if (!slot.isAvailable || slot.availableSlots <= 0) return;
    onTimeSlotSelect(slot);
  };

  // 선택된 날짜 포맷팅
  const formatSelectedDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    };
    return date.toLocaleDateString('ko-KR', options);
  };

  if (!selectedDate) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">날짜를 선택하세요</h3>
          <p className="text-gray-500">달력에서 예약하실 날짜를 먼저 선택해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">타임슬롯 선택</h3>
            <p className="text-sm text-gray-600 mt-1">{formatSelectedDate(selectedDate)}</p>
          </div>
          <button
            onClick={fetchTimeSlots}
            disabled={loading}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {loading ? '새로고침 중...' : '새로고침'}
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* 타임슬롯 목록 */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">타임슬롯을 불러오는 중...</p>
          </div>
        ) : timeSlots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">🚫</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">예약 가능한 시간이 없습니다</h4>
            <p className="text-gray-500">선택하신 날짜에는 예약 가능한 타임슬롯이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {timeSlots.map((slot) => {
              const isSelected = selectedTimeSlot?.timeSlotId === slot.timeSlotId;
              
              return (
                <div
                  key={slot.timeSlotId}
                  onClick={() => handleTimeSlotSelect(slot)}
                  className={getTimeSlotStyle(slot, isSelected)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-semibold text-gray-900">
                            {formatTimeRange(slot.startTime, slot.endTime)}
                          </span>
                        </div>

                        {/* 가격 */}
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-700">
                            {formatPrice(slot.price)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                        {/* 인원 정보 */}
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <span>
                            최대 {slot.maxPlayers}명 
                            {slot.availableSlots > 0 && (
                              <span className="text-green-600 ml-1">
                                (잔여 {slot.availableSlots}자리)
                              </span>
                            )}
                          </span>
                        </div>

                        {/* 예약된 인원 */}
                        <div className="flex items-center space-x-1">
                          <span>
                            예약: {slot.currentBookings}명
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* 가용성 상태 */}
                      <div className="text-right">
                        {slot.availableSlots <= 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            예약 마감
                          </span>
                        ) : slot.availableSlots <= slot.maxPlayers * 0.3 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            마감 임박
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            예약 가능
                          </span>
                        )}
                      </div>

                      {/* 선택 아이콘 */}
                      {isSelected && (
                        <div className="text-blue-600">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 푸터 - 요약 정보 */}
      {timeSlots.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <span className="text-gray-500">총 타임슬롯:</span>
              <span className="ml-2 font-medium text-gray-900">{timeSlots.length}개</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-500">예약 가능:</span>
              <span className="ml-2 font-medium text-gray-900">
                {timeSlots.filter(slot => slot.isAvailable && slot.availableSlots > 0).length}개
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-500">평균 가격:</span>
              <span className="ml-2 font-medium text-gray-900">
                {formatPrice(Math.round(timeSlots.reduce((sum, slot) => sum + slot.price, 0) / timeSlots.length))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};