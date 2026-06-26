import React, { useState, useMemo } from 'react';
import { Pagination } from '@/components/common';
import { useClientPagination } from '@/hooks/useClientPagination';
import { toast } from 'sonner';
import {
  useBookingsQuery,
  useBookingQuery,
  useCancelBookingMutation,
  useCompleteBookingMutation,
  useNoShowBookingMutation,
} from '@/hooks/queries/booking';
import { useClubsQuery } from '@/hooks/queries';
import type { BookingFilters as ApiBookingFilters } from '@/lib/api/bookingApi';
import type { Booking } from '@/types';

import { BookingStatsCards } from '@/components/features/booking/BookingStatsCards';
import { BookingFilters } from '@/components/features/booking/BookingFilters';
import { BookingTable } from '@/components/features/booking/BookingTable';
import { BookingDetailModal } from '@/components/features/booking/BookingDetailModal';
import { PageLayout } from '@/components/layout';

type BookingStatusKey = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const isToday = (dateStr: string): boolean => {
  const today = new Date();
  const bookingDate = new Date(dateStr);
  return (
    today.getFullYear() === bookingDate.getFullYear() &&
    today.getMonth() === bookingDate.getMonth() &&
    today.getDate() === bookingDate.getDate()
  );
};

export const BookingManagementPage: React.FC = () => {
  // 날짜 기본값: 오늘 ~ 7일 후
  const today = new Date();
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  // 필터 상태
  const [dateFrom, setDateFrom] = useState(formatDate(today));
  const [dateTo, setDateTo] = useState(formatDate(weekLater));
  const [statusFilter, setStatusFilter] = useState<BookingStatusKey>('ALL');
  const [clubFilter, setClubFilter] = useState<number | null>(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 모달 상태
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // API 필터 객체
  const filters: ApiBookingFilters = useMemo(
    () => ({
      startDate: dateFrom,
      endDate: dateTo,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      clubId: clubFilter || undefined,
      paymentMethod: paymentMethodFilter || undefined,
      search: searchKeyword || undefined,
    }),
    [dateFrom, dateTo, statusFilter, clubFilter, paymentMethodFilter, searchKeyword]
  );

  // API Queries
  const { data: bookingsData, isLoading } = useBookingsQuery(filters);
  const { data: clubsData } = useClubsQuery();
  const { data: detailBooking } = useBookingQuery(selectedBookingId || 0);

  // Mutations
  const cancelMutation = useCancelBookingMutation();
  const completeMutation = useCompleteBookingMutation();
  const noShowMutation = useNoShowBookingMutation();

  const bookings = bookingsData?.data || [];
  const clubs = clubsData?.data || [];

  // 클라이언트 사이드 필터링 (검색)
  const filteredBookings = useMemo(() => {
    if (!searchKeyword.trim()) return bookings;

    const keyword = searchKeyword.toLowerCase();
    return bookings.filter(
      (booking) =>
        booking.customerName?.toLowerCase().includes(keyword) ||
        booking.userName?.toLowerCase().includes(keyword) ||
        booking.customerPhone?.includes(keyword) ||
        booking.userPhone?.includes(keyword) ||
        booking.customerEmail?.toLowerCase().includes(keyword) ||
        booking.userEmail?.toLowerCase().includes(keyword) ||
        booking.bookingNumber?.toLowerCase().includes(keyword)
    );
  }, [bookings, searchKeyword]);

  const { paginatedData: paginatedBookings, pagination, setPage } = useClientPagination(filteredBookings, 20);

  // 상태별 카운트
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: bookings.length,
      PENDING: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      NO_SHOW: 0,
    };
    bookings.forEach((b) => {
      if (counts[b.status] !== undefined) {
        counts[b.status]++;
      }
    });
    return counts;
  }, [bookings]);

  // 오늘 예약 수
  const todayCount = useMemo(() => {
    return bookings.filter((b) => isToday(b.bookingDate)).length;
  }, [bookings]);

  const selectedBooking = detailBooking || bookings.find((b) => b.id === selectedBookingId) || null;

  // 액션 핸들러
  const handleViewDetail = (booking: Booking) => {
    setSelectedBookingId(booking.id);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedBookingId(null);
  };

  const handleCancel = async (booking: Booking) => {
    const paymentInfo =
      booking.paymentMethod === 'card'
        ? '\n⚠️ 카드결제 예약입니다. 취소 시 자동 환불 처리됩니다.'
        : booking.paymentMethod === 'dutchpay'
          ? '\n⚠️ 더치페이 예약입니다. 결제 완료된 참가자에게 자동 환불됩니다.'
          : '\n현장결제 예약입니다. 별도 환불은 없습니다.';

    const reason = window.prompt(
      `${booking.userName || booking.customerName || '고객'}님의 예약을 취소하시겠습니까?${paymentInfo}\n\n취소 사유를 입력해주세요:`
    );
    if (reason !== null) {
      try {
        await cancelMutation.mutateAsync(booking.id);
        toast.success('예약이 취소되었습니다.');
        handleCloseDetailModal();
      } catch (error) {
        toast.error('예약 취소에 실패했습니다.');
      }
    }
  };

  const handleComplete = async (booking: Booking) => {
    if (
      window.confirm(
        `${booking.userName || booking.customerName || '고객'}님의 예약을 완료 처리하시겠습니까?`
      )
    ) {
      try {
        await completeMutation.mutateAsync(booking.id);
        toast.success('예약이 완료 처리되었습니다.');
        handleCloseDetailModal();
      } catch (error) {
        toast.error('예약 완료 처리에 실패했습니다.');
      }
    }
  };

  const handleNoShow = async (booking: Booking) => {
    if (
      window.confirm(
        `${booking.userName || booking.customerName || '고객'}님의 예약을 노쇼 처리하시겠습니까?`
      )
    ) {
      try {
        await noShowMutation.mutateAsync(booking.id);
        toast.success('노쇼 처리되었습니다.');
        handleCloseDetailModal();
      } catch (error) {
        toast.error('노쇼 처리에 실패했습니다.');
      }
    }
  };

  // 필터 초기화
  const handleResetFilters = () => {
    const newToday = new Date();
    const newWeekLater = new Date(newToday);
    newWeekLater.setDate(newWeekLater.getDate() + 7);
    setDateFrom(formatDate(newToday));
    setDateTo(formatDate(newWeekLater));
    setStatusFilter('ALL');
    setClubFilter(null);
    setPaymentMethodFilter('');
    setSearchKeyword('');
  };

  const hasActiveFilters =
    searchKeyword !== '' || clubFilter !== null || paymentMethodFilter !== '' || statusFilter !== 'ALL';

  const isActionPending =
    cancelMutation.isPending || completeMutation.isPending || noShowMutation.isPending;

  return (
    <PageLayout>
      {/* 통계 카드 */}
      <BookingStatsCards
        statusCounts={statusCounts}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        todayCount={todayCount}
      />

      {/* 필터 */}
      <BookingFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        clubFilter={clubFilter}
        paymentMethodFilter={paymentMethodFilter}
        searchKeyword={searchKeyword}
        clubs={clubs.map((club) => ({ id: club.id, name: club.name }))}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onClubFilterChange={setClubFilter}
        onPaymentMethodFilterChange={setPaymentMethodFilter}
        onSearchKeywordChange={setSearchKeyword}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* 테이블 */}
      {isLoading ? (
        <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            <span className="ml-3 text-white/60">예약 데이터를 불러오는 중...</span>
          </div>
        </div>
      ) : (
        <BookingTable
          bookings={paginatedBookings}
          onViewDetail={handleViewDetail}
          onCancel={handleCancel}
          onComplete={handleComplete}
          onNoShow={handleNoShow}
          isActionPending={isActionPending}
        />
      )}

      <Pagination pagination={pagination} onPageChange={setPage} />

      {/* 상세 모달 */}
      <BookingDetailModal
        booking={selectedBooking}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onCancel={handleCancel}
        onComplete={handleComplete}
        onNoShow={handleNoShow}
        isActionPending={isActionPending}
      />
    </PageLayout>
  );
};

export default BookingManagementPage;
