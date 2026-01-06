import React, { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Search, RefreshCw, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchBookingsQuery } from '@/hooks/queries/booking';
import { useProfileQuery } from '@/hooks/queries/auth';
import { BookingCard, BookingCardSkeleton } from '@/components/BookingCard';
import { CancelBookingModal } from '@/components/CancelBookingModal';
import { type BookingWithCancel } from '@/lib/api/bookingApi';

type TimeFilter = 'upcoming' | 'past';

export const MyBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingWithCancel | null>(null);

  const { data: profile } = useProfileQuery();

  const timeFilter = (searchParams.get('tab') as TimeFilter) || 'upcoming';
  const page = Number(searchParams.get('page')) || 1;

  const { data, isLoading, isError, refetch, isFetching } = useSearchBookingsQuery({
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

  // 로그인하지 않은 경우
  if (!profile) {
    return (
      <div className="flex items-center justify-center p-4 min-h-[60vh]">
        <div className="glass-card p-6 text-center max-w-md">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-white/40" />
          <h2 className="text-xl font-bold text-white mb-2">로그인이 필요합니다</h2>
          <p className="text-white/60 mb-6">
            예약 내역을 확인하려면 로그인해 주세요.
          </p>
          <button
            onClick={() => navigate('/login', { state: { from: '/my-bookings' } })}
            className={cn(
              'w-full py-3 text-sm font-medium rounded-lg',
              'bg-green-500 text-white hover:bg-green-600',
              'transition-colors'
            )}
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Sub Header */}
      <div className="sticky top-14 z-30 bg-black/20 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {timeFilter === 'upcoming' ? '예정된 예약' : '지난 예약'}
          </h2>
          <button
            onClick={() => handleTabChange(timeFilter === 'upcoming' ? 'past' : 'upcoming')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
              'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            )}
          >
            <History className="w-4 h-4" />
            {timeFilter === 'upcoming' ? '지난 예약 보기' : '예정된 예약 보기'}
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 py-6">
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
          <div className="glass-card p-6 text-center">
            <p className="text-red-400 mb-4">예약 내역을 불러오는데 실패했습니다.</p>
            <button
              onClick={() => refetch()}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg',
                'bg-white/10 text-white hover:bg-white/20',
                'transition-colors'
              )}
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && data?.bookings?.length === 0 && (
          <div className="glass-card p-8 text-center">
            <Search className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {timeFilter === 'upcoming' ? '예정된 예약이 없습니다' : '지난 예약이 없습니다'}
            </h3>
            <p className="text-white/60 mb-6">
              {timeFilter === 'upcoming' ? '새로운 라운드를 예약해 보세요!' : '아직 완료된 라운드가 없습니다.'}
            </p>
            <button
              onClick={() => navigate('/search')}
              className={cn(
                'px-6 py-3 text-sm font-medium rounded-lg',
                'bg-green-500 text-white hover:bg-green-600',
                'transition-colors'
              )}
            >
              라운드 찾기
            </button>
          </div>
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
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-lg',
                    'bg-white/10 text-white/70',
                    'hover:bg-white/20 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  이전
                </button>
                <span className="text-sm text-white/60">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-lg',
                    'bg-white/10 text-white/70',
                    'hover:bg-white/20 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  다음
                </button>
              </div>
            )}

            {/* Summary */}
            <p className="text-center text-sm text-white/40 mt-4">
              총 {data.total}건의 예약
            </p>
          </>
        )}
      </main>

      {/* Cancel Modal */}
      {cancelModalBooking && (
        <CancelBookingModal
          booking={cancelModalBooking}
          isOpen={!!cancelModalBooking}
          onClose={() => setCancelModalBooking(null)}
          onSuccess={handleCancelSuccess}
        />
      )}
    </div>
  );
};
