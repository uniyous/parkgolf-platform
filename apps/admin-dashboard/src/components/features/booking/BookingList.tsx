import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  useBookingsQuery,
  useCancelBookingMutation,
  useCompleteBookingMutation,
  useNoShowBookingMutation,
} from '@/hooks/queries/booking';
import { useClubsQuery } from '@/hooks/queries';
import type { BookingFilters as ApiBookingFilters } from '@/lib/api/bookingApi';
import type { Booking } from '@/types';

import { BookingStatsCards } from './BookingStatsCards';
import { BookingFilters } from './BookingFilters';
import { BookingTable } from './BookingTable';
import { BookingDetailModal } from './BookingDetailModal';

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

export const BookingList: React.FC = () => {
  // 날짜 기본값: 오늘 ~ 7일 후
  const today = new Date();
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  // 필터 상태
  const [dateFrom, setDateFrom] = useState(formatDate(today));
  const [dateTo, setDateTo] = useState(formatDate(weekLater));
  const [statusFilter, setStatusFilter] = useState<BookingStatusKey>('ALL');
  const [clubFilter, setClubFilter] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 모달 상태
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // API 필터 객체
  const filters: ApiBookingFilters = useMemo(
    () => ({
      dateFrom,
      dateTo,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      courseId: clubFilter || undefined,
      search: searchKeyword || undefined,
    }),
    [dateFrom, dateTo, statusFilter, clubFilter, searchKeyword]
  );

  // API Queries
  const { data: bookingsData, isLoading } = useBookingsQuery(filters);
  const { data: clubsData } = useClubsQuery();

  // Mutations
  const cancelMutation = useCancelBookingMutation();
  const completeMutation = useCompleteBookingMutation();
  const noShowMutation = useNoShowBookingMutation();

  const bookings = bookingsData?.data || [];
  const clubs = clubsData?.data || [];

  // 클라이언트 사이드 검색 필터링
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

  // 액션 핸들러
  const handleViewDetail = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedBooking(null);
  };

  const handleCancel = async (booking: Booking) => {
    const reason = window.prompt(
      `${booking.userName || booking.customerName || '고객'}님의 예약을 취소하시겠습니까?\n취소 사유를 입력해주세요:`
    );
    if (reason !== null) {
      try {
        await cancelMutation.mutateAsync(booking.id);
        toast.success('예약이 취소되었습니다.');
        handleCloseDetailModal();
      } catch (error) {
        console.error('Failed to cancel booking:', error);
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
        console.error('Failed to complete booking:', error);
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
        console.error('Failed to mark as no-show:', error);
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
    setSearchKeyword('');
  };

  const hasActiveFilters =
    searchKeyword !== '' || clubFilter !== null || statusFilter !== 'ALL';

  const isActionPending =
    cancelMutation.isPending || completeMutation.isPending || noShowMutation.isPending;

  return (
    <div className="space-y-4">
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
        searchKeyword={searchKeyword}
        clubs={clubs.map((club) => ({ id: club.id, name: club.name }))}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onClubFilterChange={setClubFilter}
        onSearchKeywordChange={setSearchKeyword}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* 테이블 */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-3 text-gray-600">예약 데이터를 불러오는 중...</span>
          </div>
        </div>
      ) : (
        <BookingTable
          bookings={filteredBookings}
          onViewDetail={handleViewDetail}
          onCancel={handleCancel}
          onComplete={handleComplete}
          onNoShow={handleNoShow}
          isActionPending={isActionPending}
        />
      )}

      {/* 하단 정보 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 text-center">
          총 {filteredBookings.length}건의 예약
          {searchKeyword && ` (검색: "${searchKeyword}")`}
        </p>
      </div>

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
    </div>
  );
};
