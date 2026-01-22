import React, { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Search, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, Button } from '@/components/ui';
import { useSearchBookingsQuery } from '@/hooks/queries/booking';
import { BookingCard, BookingCardSkeleton } from '@/components/BookingCard';
import { CancelBookingModal } from '@/components/CancelBookingModal';
import { Pagination } from '@/components';
import { type BookingWithCancel } from '@/lib/api/bookingApi';

type TimeFilter = 'upcoming' | 'past';

export const MyBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingWithCancel | null>(null);

  const timeFilter = (searchParams.get('tab') as TimeFilter) || 'upcoming';
  const page = Number(searchParams.get('page')) || 1;

  const { data, isLoading, isError, refetch } = useSearchBookingsQuery({
    timeFilter,
    sortBy: 'bookingDate',
    sortOrder: timeFilter === 'past' ? 'desc' : 'asc',
    page,
    limit: 10,
  });

  const handleTabChange = useCallback((tab: TimeFilter) => {
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'upcoming') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', tab);
    }
    newParams.delete('page');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handlePageChange = useCallback((newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (newPage === 1) {
      newParams.delete('page');
    } else {
      newParams.set('page', String(newPage));
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCancelClick = useCallback((booking: BookingWithCancel) => {
    setCancelModalBooking(booking);
  }, []);

  const handleCancelSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const headerRight = (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => handleTabChange(timeFilter === 'upcoming' ? 'past' : 'upcoming')}
    >
      <History className="w-4 h-4" />
      <span className="hidden sm:inline">
        {timeFilter === 'upcoming' ? '지난 예약' : '예정된 예약'}
      </span>
    </Button>
  );

  return (
    <AppLayout title="예약 내역" headerRight={headerRight}>
      <Container className="py-4 md:py-6">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <GlassCard className="text-center">
            <p className="text-[var(--color-error)] mb-4">예약 내역을 불러오는데 실패했습니다.</p>
            <Button variant="secondary" onClick={() => refetch()}>
              다시 시도
            </Button>
          </GlassCard>
        )}

        {/* Empty State */}
        {!isLoading && !isError && data?.bookings?.length === 0 && (
          <GlassCard className="text-center py-12">
            <Search className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)]" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {timeFilter === 'upcoming' ? '예정된 예약이 없습니다' : '지난 예약이 없습니다'}
            </h3>
            <p className="text-[var(--color-text-muted)] mb-6">
              {timeFilter === 'upcoming' ? '새로운 라운드를 예약해 보세요!' : '아직 완료된 라운드가 없습니다.'}
            </p>
            <Button onClick={() => navigate('/bookings')}>
              라운드 찾기
            </Button>
          </GlassCard>
        )}

        {/* Booking List */}
        {!isLoading && !isError && data?.bookings && data.bookings.length > 0 && (
          <>
            <div className="space-y-4">
              {data.bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onCancelClick={handleCancelClick}
                />
              ))}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              className="mt-6"
              variant="glass"
            />

            {/* Summary */}
            <p className="text-center text-sm text-[var(--color-text-muted)] mt-4">
              총 {data.total}건의 예약
            </p>
          </>
        )}
      </Container>

      {/* Cancel Modal */}
      {cancelModalBooking && (
        <CancelBookingModal
          booking={cancelModalBooking}
          isOpen={!!cancelModalBooking}
          onClose={() => setCancelModalBooking(null)}
          onSuccess={handleCancelSuccess}
        />
      )}
    </AppLayout>
  );
};
