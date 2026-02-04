import React, { useState, useMemo } from 'react';
import { useUserBookingsQuery } from '@/hooks/queries';
import { DataContainer } from '@/components/common';
import type { BookingStatusType } from '@/types';

interface UserBookingHistoryTabProps {
  userId: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '대기',
  CONFIRMED: '확정',
  CANCELLED: '취소',
  COMPLETED: '완료',
  NO_SHOW: '노쇼',
  SAGA_PENDING: '처리중',
  SAGA_FAILED: '실패',
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800',
  NO_SHOW: 'bg-gray-100 text-gray-800',
  SAGA_PENDING: 'bg-orange-100 text-orange-800',
  SAGA_FAILED: 'bg-red-100 text-red-800',
};

type StatusFilter = BookingStatusType | 'ALL';

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'CONFIRMED', label: '확정' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELLED', label: '취소' },
  { value: 'NO_SHOW', label: '노쇼' },
  { value: 'PENDING', label: '대기' },
];

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || amount === null) return '-';
  return amount.toLocaleString('ko-KR') + '원';
};

export const UserBookingHistoryTab: React.FC<UserBookingHistoryTabProps> = ({ userId }) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const { data: bookingsResponse, isLoading } = useUserBookingsQuery(userId);

  const bookings = bookingsResponse?.data || [];

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'ALL') return bookings;
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 + 필터 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          예약 이력
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({filteredBookings.length}건)
          </span>
        </h3>
        <div className="flex items-center space-x-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                statusFilter === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <DataContainer
        isLoading={isLoading}
        isEmpty={filteredBookings.length === 0}
        emptyIcon="📋"
        emptyMessage={bookings.length === 0 ? '예약 이력이 없습니다' : '해당 상태의 예약이 없습니다'}
        emptyDescription={bookings.length === 0 ? '이 사용자의 예약 기록이 없습니다.' : '다른 필터를 선택해 보세요.'}
        loadingMessage="예약 이력을 불러오는 중..."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">예약번호</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">골프장 / 게임</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">시간</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">인원</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">금액</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">
                    {booking.bookingNumber || `#${booking.id}`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{booking.clubName || '-'}</div>
                    <div className="text-xs text-gray-500">{booking.gameName || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatDate(booking.bookingDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {booking.startTime || '-'} ~ {booking.endTime || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-900">
                    {booking.playerCount}명
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {formatCurrency(booking.totalPrice)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[booking.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[booking.status] || booking.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataContainer>
    </div>
  );
};
