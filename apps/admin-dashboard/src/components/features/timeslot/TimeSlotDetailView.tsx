import React from 'react';
import type { TimeSlot } from '@/types/timeslot';

interface TimeSlotDetailViewProps {
  timeSlot: TimeSlot;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const TimeSlotDetailView: React.FC<TimeSlotDetailViewProps> = ({
  timeSlot,
  onClose,
  onEdit,
  onDelete,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  const formatDateTime = (dateString: string, timeString: string) => {
    const date = new Date(dateString + 'T' + timeString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { label: '활성', color: 'bg-green-100 text-green-800' },
      INACTIVE: { label: '비활성', color: 'bg-gray-100 text-gray-800' },
      FULL: { label: '만료', color: 'bg-red-100 text-red-800' },
      CANCELLED: { label: '취소', color: 'bg-orange-100 text-orange-800' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.INACTIVE;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">타임슬롯 상세 정보</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">기본 정보</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">코스</label>
                  <p className="text-gray-900">{timeSlot.course?.name || '정보 없음'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">날짜</label>
                  <p className="text-gray-900">{formatDateTime(timeSlot.date, timeSlot.startTime)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">시간</label>
                  <p className="text-gray-900">{timeSlot.startTime} - {timeSlot.endTime}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">상태</label>
                  <div className="mt-1">
                    {getStatusBadge(timeSlot.status)}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">예약 정보</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">최대 인원</label>
                  <p className="text-gray-900">{timeSlot.maxPlayers}명</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">현재 예약</label>
                  <p className="text-gray-900">{timeSlot.currentBookings}명</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">잔여석</label>
                  <p className="text-gray-900">{timeSlot.availableSlots}석</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">이용률</label>
                  <p className={`font-semibold ${getUtilizationColor(timeSlot.utilizationRate || 0)}`}>
                    {timeSlot.utilizationRate || 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Revenue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">가격 정보</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">기본 가격</label>
                  <p className="text-gray-900 font-semibold">{formatCurrency(timeSlot.price)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">총 수익</label>
                  <p className="text-gray-900 font-semibold">{formatCurrency(timeSlot.revenue || 0)}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">반복 설정</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">반복 여부</label>
                  <div className="mt-1">
                    {timeSlot.isRecurring ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        반복 슬롯
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                        일회성 슬롯
                      </span>
                    )}
                  </div>
                </div>
                {timeSlot.isRecurring && timeSlot.recurringPattern && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">반복 패턴</label>
                    <p className="text-gray-900">
                      {timeSlot.recurringPattern.type} - {timeSlot.recurringPattern.frequency}회
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bookings */}
          {timeSlot.bookings && timeSlot.bookings.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">예약 목록</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3">
                  {timeSlot.bookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between bg-white p-3 rounded border">
                      <div>
                        <p className="font-medium text-gray-900">{booking.user?.name || '정보 없음'}</p>
                        <p className="text-sm text-gray-500">{booking.user?.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{booking.playerCount}명</p>
                        <p className="text-sm text-gray-500">{formatCurrency(booking.totalPrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">생성 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">생성일시</label>
                <p className="text-gray-900">{new Date(timeSlot.createdAt).toLocaleString('ko-KR')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">수정일시</label>
                <p className="text-gray-900">{new Date(timeSlot.updatedAt).toLocaleString('ko-KR')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              닫기
            </button>
            <button
              onClick={onEdit}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              수정
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};