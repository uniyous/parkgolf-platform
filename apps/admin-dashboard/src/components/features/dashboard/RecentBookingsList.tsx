import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Inbox } from 'lucide-react';
import { LoadingView, EmptyState } from '@/components/ui';
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
  SAGA_PENDING: { label: '처리중', className: 'bg-yellow-100 text-yellow-800' },
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
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            최근 예약
          </h3>
        </div>
        <LoadingView message="예약을 불러오는 중..." />
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          최근 예약
        </h3>
        <button
          onClick={() => navigate('/bookings')}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          전체보기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="예약이 없습니다"
          description="새로운 예약이 들어오면 여기에 표시됩니다"
        />
      ) : (
        <div className="space-y-1">
          {bookings.map((booking) => {
            const status = statusConfig[booking.status] || statusConfig.PENDING;
            return (
              <div
                key={booking.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer px-3 -mx-3 rounded-lg transition-colors"
                onClick={() => navigate('/bookings')}
              >
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-mono text-gray-400 w-16">
                    {booking.bookingNumber}
                  </span>
                  <span className="text-gray-900 w-20 truncate">
                    {booking.userName || booking.guestName || '-'}
                  </span>
                  <span className="text-gray-500 truncate max-w-[200px] hidden md:block">
                    {booking.clubName || booking.gameName || '-'}
                  </span>
                  <span className="text-gray-400 hidden sm:block">
                    {formatDate(booking.bookingDate)} {booking.startTime}
                  </span>
                  <span className="text-gray-400 hidden sm:block">
                    {booking.playerCount}명
                  </span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
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
