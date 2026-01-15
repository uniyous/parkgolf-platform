import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Booking, BookingStatusType } from '@/types';

interface RecentBookingsListProps {
  bookings: Booking[];
  isLoading?: boolean;
}

const statusConfig: Record<BookingStatusType, { label: string; className: string }> = {
  PENDING: { label: '대기', className: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: '확정', className: 'bg-green-100 text-green-800' },
  COMPLETED: { label: '완료', className: 'bg-blue-100 text-blue-800' },
  CANCELLED: { label: '취소', className: 'bg-red-100 text-red-800' },
  NO_SHOW: { label: '노쇼', className: 'bg-gray-100 text-gray-800' },
  SAGA_PENDING: { label: '처리중', className: 'bg-orange-100 text-orange-800' },
  SAGA_FAILED: { label: '실패', className: 'bg-red-100 text-red-800' },
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
};

export const RecentBookingsList: React.FC<RecentBookingsListProps> = ({
  bookings,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">최근 예약</h2>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-4 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
              <div className="h-6 bg-gray-200 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">최근 예약</h2>
        <button
          onClick={() => navigate('/bookings')}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          전체보기 &rarr;
        </button>
      </div>

      {bookings.length === 0 ? (
        <p className="text-gray-500 text-center py-8">예약이 없습니다.</p>
      ) : (
        <div className="space-y-1">
          {bookings.map((booking) => {
            const status = statusConfig[booking.status] || statusConfig.PENDING;
            return (
              <div
                key={booking.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer px-2 -mx-2 rounded"
                onClick={() => navigate('/bookings')}
              >
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-mono text-gray-500 w-16">{booking.bookingNumber}</span>
                  <span className="text-gray-900 w-20 truncate">{booking.userName || booking.guestName || '-'}</span>
                  <span className="text-gray-600 truncate max-w-[200px]">{booking.clubName || booking.gameName || '-'}</span>
                  <span className="text-gray-500">
                    {formatDate(booking.bookingDate)} {booking.startTime}
                  </span>
                  <span className="text-gray-500">{booking.playerCount}명</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
