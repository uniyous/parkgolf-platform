import React from 'react';
import type { TimeSlot } from '../../types';

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
  // 날짜와 시간대별로 정렬
  const sortedTimeSlots = [...timeSlots].sort((a, b) => {
    const dateCompare = (a.date || '').localeCompare(b.date || '');
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  // 가격 포맷팅
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  // 시간 포맷팅
  const formatTimeRange = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
  };

  // 날짜 포맷팅
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
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
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">날짜</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">시간대</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">최대 인원</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">가격</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">상태</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">작업</th>
          </tr>
        </thead>
        <tbody>
          {sortedTimeSlots.map((timeSlot) => (
            <tr key={timeSlot.id} className="border-b border-gray-200 hover:bg-gray-50">
              {/* 날짜 */}
              <td className="px-4 py-4 text-sm text-gray-900">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">
                      {timeSlot.date ? formatDate(timeSlot.date) : '-'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {timeSlot.date || 'No Date'}
                    </div>
                  </div>
                </div>
              </td>

              {/* 시간대 */}
              <td className="px-4 py-4 text-sm text-gray-900">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">
                      {formatTimeRange(timeSlot.startTime, timeSlot.endTime)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.floor((new Date(`2000-01-01T${timeSlot.endTime}:00`).getTime() - 
                                   new Date(`2000-01-01T${timeSlot.startTime}:00`).getTime()) / (1000 * 60))}분
                    </div>
                  </div>
                </div>
              </td>

              {/* 최대 인원 */}
              <td className="px-4 py-4 text-sm text-gray-900">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <span className="font-medium">{timeSlot.maxPlayers}명</span>
                </div>
              </td>

              {/* 가격 */}
              <td className="px-4 py-4 text-sm text-gray-900">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {formatPrice(timeSlot.price)}
                </span>
              </td>

              {/* 상태 */}
              <td className="px-4 py-4 text-sm">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  timeSlot.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {timeSlot.isActive ? '활성' : '비활성'}
                </span>
              </td>

              {/* 작업 버튼 */}
              <td className="px-4 py-4 text-right text-sm">
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => onEdit(timeSlot)}
                    className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    title="수정"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onDelete(timeSlot)}
                    className="text-red-600 hover:text-red-800 font-medium transition-colors"
                    title="삭제"
                  >
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 요약 정보 */}
      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center">
            <span className="text-gray-500">총 타임슬롯:</span>
            <span className="ml-2 font-medium text-gray-900">{timeSlots.length}개</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-500">활성 타임슬롯:</span>
            <span className="ml-2 font-medium text-gray-900">
              {timeSlots.filter(slot => slot.isActive).length}개
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-500">평균 가격:</span>
            <span className="ml-2 font-medium text-gray-900">
              {timeSlots.length > 0 
                ? formatPrice(Math.round(timeSlots.reduce((sum, slot) => sum + slot.price, 0) / timeSlots.length))
                : '0원'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};