import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Inbox } from 'lucide-react';
import { GlassCard, LoadingView, EmptyState } from '@/components/ui';
import type { Booking, BookingStatusType } from '@/types';

interface RecentBookingsListProps {
  bookings: Booking[];
  isLoading?: boolean;
}

const statusConfig: Record<BookingStatusType, { label: string; className: string }> = {
  PENDING: { label: '대기', className: 'badge-warning' },
  CONFIRMED: { label: '확정', className: 'badge-success' },
  COMPLETED: { label: '완료', className: 'badge-info' },
  CANCELLED: { label: '취소', className: 'badge-error' },
  NO_SHOW: { label: '노쇼', className: 'badge-pending' },
  SAGA_PENDING: { label: '처리중', className: 'badge-warning' },
  SAGA_FAILED: { label: '실패', className: 'badge-error' },
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
      <GlassCard>
        <div className="flex justify-between items-center mb-4">
          <div className="section-header">
            <div className="section-header-icon">
              <Calendar className="w-5 h-5" />
            </div>
            <span>최근 예약</span>
          </div>
        </div>
        <LoadingView message="예약을 불러오는 중..." />
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex justify-between items-center mb-4">
        <div className="section-header">
          <div className="section-header-icon">
            <Calendar className="w-5 h-5" />
          </div>
          <span>최근 예약</span>
        </div>
        <button
          onClick={() => navigate('/bookings')}
          className="flex items-center gap-1 text-sm text-[var(--color-primary-light)] hover:text-[var(--color-primary)] transition-colors"
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
                className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-hover)] cursor-pointer px-3 -mx-3 rounded-lg transition-colors"
                onClick={() => navigate('/bookings')}
              >
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-mono text-[var(--color-text-tertiary)] w-16">
                    {booking.bookingNumber}
                  </span>
                  <span className="text-white w-20 truncate">
                    {booking.userName || booking.guestName || '-'}
                  </span>
                  <span className="text-[var(--color-text-secondary)] truncate max-w-[200px] hidden md:block">
                    {booking.clubName || booking.gameName || '-'}
                  </span>
                  <span className="text-[var(--color-text-tertiary)] hidden sm:block">
                    {formatDate(booking.bookingDate)} {booking.startTime}
                  </span>
                  <span className="text-[var(--color-text-tertiary)] hidden sm:block">
                    {booking.playerCount}명
                  </span>
                </div>
                <span className={`badge ${status.className}`}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
};
