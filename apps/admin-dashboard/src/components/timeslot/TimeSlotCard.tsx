import React from 'react';
import type { TimeSlot } from '../../types/timeslot';

interface TimeSlotCardProps {
  timeSlot: TimeSlot;
  variant?: 'compact' | 'detailed';
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  showActions?: boolean;
  isSelected?: boolean;
}

export const TimeSlotCard: React.FC<TimeSlotCardProps> = ({
  timeSlot,
  variant = 'compact',
  onEdit,
  onDelete,
  onClick,
  showActions = true,
  isSelected = false
}) => {
  const formatTime = (time: string) => {
    return time.substring(0, 5); // HH:mm 형식으로 표시
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const getAvailabilityColor = (available: number, max: number) => {
    const ratio = available / max;
    if (ratio > 0.5) return 'bg-green-100 text-green-800';
    if (ratio > 0.2) return 'bg-yellow-100 text-yellow-800';
    if (ratio > 0) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'FULL':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '활성';
      case 'INACTIVE':
        return '비활성';
      case 'FULL':
        return '마감';
      case 'CANCELLED':
        return '취소';
      default:
        return status;
    }
  };

  if (variant === 'compact') {
    // 코스 상세 화면용 간단한 뷰
    return (
      <div 
        className={`p-3 border rounded-lg hover:shadow-md transition-all cursor-pointer ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-sm">
              <span className="font-medium">{formatTime(timeSlot.startTime)}</span>
              <span className="text-gray-500 mx-1">-</span>
              <span className="font-medium">{formatTime(timeSlot.endTime)}</span>
            </div>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              getAvailabilityColor(timeSlot.availableSlots || 0, timeSlot.maxSlots)
            }`}>
              {timeSlot.availableSlots > 0 
                ? `${timeSlot.availableSlots}/${timeSlot.maxSlots}팀` 
                : '마감'}
            </span>
          </div>
          <div className="text-sm font-medium">
            ₩{formatPrice(timeSlot.price)}
          </div>
        </div>
      </div>
    );
  }

  // 타임슬롯 관리 화면용 상세 뷰
  return (
    <div className={`border rounded-lg transition-all ${
      isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <h4 className="text-lg font-medium">
                {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)}
              </h4>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                getStatusColor(timeSlot.status)
              }`}>
                {getStatusLabel(timeSlot.status)}
              </span>
              {timeSlot.isWeekend && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                  주말
                </span>
              )}
              {timeSlot.isHoliday && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-pink-100 text-pink-800">
                  공휴일
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">예약 현황</span>
                <p className="font-medium mt-1">
                  {timeSlot.bookedSlots}/{timeSlot.maxSlots}팀
                </p>
              </div>
              <div>
                <span className="text-gray-500">가격</span>
                <p className="font-medium mt-1">
                  ₩{formatPrice(timeSlot.price)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">이용률</span>
                <p className="font-medium mt-1">
                  {timeSlot.maxSlots > 0 
                    ? Math.round((timeSlot.bookedSlots / timeSlot.maxSlots) * 100)
                    : 0}%
                </p>
              </div>
              <div>
                <span className="text-gray-500">간격</span>
                <p className="font-medium mt-1">
                  {timeSlot.intervalMinutes}분
                </p>
              </div>
            </div>

            {/* 진행률 바 */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    timeSlot.bookedSlots === timeSlot.maxSlots 
                      ? 'bg-red-500' 
                      : timeSlot.bookedSlots / timeSlot.maxSlots > 0.5 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                  }`}
                  style={{ 
                    width: `${timeSlot.maxSlots > 0 
                      ? (timeSlot.bookedSlots / timeSlot.maxSlots) * 100 
                      : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center space-x-1 ml-4">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="수정"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                    />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  title="삭제"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 선택시 확장되는 상세 정보 */}
      {isSelected && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-gray-900 mb-2">예약 정보</h5>
              <div className="space-y-1 text-gray-600">
                <div className="flex justify-between">
                  <span>총 예약:</span>
                  <span className="font-medium">{timeSlot.totalBookings || 0}건</span>
                </div>
                <div className="flex justify-between">
                  <span>취소:</span>
                  <span className="font-medium">{timeSlot.cancelledBookings || 0}건</span>
                </div>
                <div className="flex justify-between">
                  <span>노쇼:</span>
                  <span className="font-medium">{timeSlot.noShowBookings || 0}건</span>
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium text-gray-900 mb-2">매출 정보</h5>
              <div className="space-y-1 text-gray-600">
                <div className="flex justify-between">
                  <span>예상 매출:</span>
                  <span className="font-medium">
                    ₩{formatPrice(timeSlot.bookedSlots * timeSlot.price)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>실제 매출:</span>
                  <span className="font-medium">
                    ₩{formatPrice(timeSlot.revenue || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>취소 손실:</span>
                  <span className="font-medium text-red-600">
                    ₩{formatPrice(timeSlot.cancelledRevenue || 0)}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium text-gray-900 mb-2">설정 정보</h5>
              <div className="space-y-1 text-gray-600">
                <div className="flex justify-between">
                  <span>생성일:</span>
                  <span className="font-medium">
                    {new Date(timeSlot.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>수정일:</span>
                  <span className="font-medium">
                    {new Date(timeSlot.updatedAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                {timeSlot.notes && (
                  <div className="mt-2">
                    <span>메모:</span>
                    <p className="font-medium mt-1">{timeSlot.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 예약자 목록 (있는 경우) */}
          {timeSlot.bookings && timeSlot.bookings.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h5 className="font-medium text-gray-900 mb-2">예약자 목록</h5>
              <div className="space-y-2">
                {timeSlot.bookings.map((booking, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{booking.userName}</span>
                      <span className="text-gray-500">({booking.players}명)</span>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      booking.status === 'CONFIRMED' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status === 'CONFIRMED' ? '확정' : booking.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};