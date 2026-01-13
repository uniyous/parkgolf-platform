import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useBookingsQuery } from '@/hooks/queries/booking';
import { useClubsQuery } from '@/hooks/queries';
import type { Booking } from '@/types';

import { CancellationStatsCards } from './CancellationStatsCards';
import { CancellationFilters } from './CancellationFilters';
import { CancellationTable, type CancellationRecord } from './CancellationTable';
import { CancellationDetailModal } from './CancellationDetailModal';
import { RefundProcessModal } from './RefundProcessModal';

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// 취소 예약을 CancellationRecord로 변환
const convertToCancellationRecord = (booking: Booking): CancellationRecord => {
  // 예약일과 취소일 사이의 시간차로 취소 유형 결정
  const bookingDate = new Date(booking.bookingDate);
  const cancelledAt = booking.updatedAt ? new Date(booking.updatedAt) : new Date();
  const hoursBeforeBooking = (bookingDate.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

  let cancellationType = 'USER_NORMAL';
  let refundRate = 100;

  if (hoursBeforeBooking < 0) {
    // 예약일 이후 취소
    cancellationType = 'ADMIN';
    refundRate = 0;
  } else if (hoursBeforeBooking < 24) {
    cancellationType = 'USER_LASTMINUTE';
    refundRate = 0;
  } else if (hoursBeforeBooking < 72) {
    cancellationType = 'USER_LATE';
    refundRate = 50;
  } else if (hoursBeforeBooking < 168) {
    cancellationType = 'USER_NORMAL';
    refundRate = 80;
  } else {
    cancellationType = 'USER_NORMAL';
    refundRate = 100;
  }

  const totalPrice = booking.totalPrice || 0;
  const refundAmount = Math.floor(totalPrice * (refundRate / 100));
  const refundFee = totalPrice - refundAmount;

  // 환불 상태 결정 (실제로는 API에서 가져와야 함)
  let refundStatus = 'PENDING';
  const paymentStatus = booking.paymentStatus as string | undefined;
  if (paymentStatus === 'REFUNDED' || paymentStatus === 'PARTIALLY_REFUNDED') {
    refundStatus = 'COMPLETED';
  } else if (refundRate === 0) {
    refundStatus = 'NO_REFUND';
  }

  return {
    booking,
    cancellationType,
    cancelledAt: booking.updatedAt || booking.createdAt,
    cancelledBy: '관리자', // 실제로는 취소 요청자 정보 필요
    cancelReason: booking.notes || undefined,
    refundStatus,
    refundAmount,
    refundRate,
    refundFee,
    processedAt: refundStatus === 'COMPLETED' ? booking.updatedAt : undefined,
  };
};

export const CancellationList: React.FC = () => {
  // 날짜 기본값: 30일 전 ~ 오늘
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  // 필터 상태
  const [dateFrom, setDateFrom] = useState(formatDate(monthAgo));
  const [dateTo, setDateTo] = useState(formatDate(today));
  const [refundStatusFilter, setRefundStatusFilter] = useState('ALL');
  const [clubFilter, setClubFilter] = useState<number | null>(null);
  const [cancellationType, setCancellationType] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 모달 상태
  const [selectedRecord, setSelectedRecord] = useState<CancellationRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // API Queries - 취소된 예약만 조회
  const { data: bookingsData, isLoading, refetch } = useBookingsQuery({
    dateFrom,
    dateTo,
    status: 'CANCELLED',
    courseId: clubFilter || undefined,
    search: searchKeyword || undefined,
  });
  const { data: clubsData } = useClubsQuery();

  const bookings = bookingsData?.data || [];
  const clubs = clubsData?.data || [];

  // 취소 예약을 CancellationRecord로 변환
  const cancellationRecords = useMemo(() => {
    return bookings.map(convertToCancellationRecord);
  }, [bookings]);

  // 필터링된 레코드
  const filteredRecords = useMemo(() => {
    let filtered = cancellationRecords;

    // 환불 상태 필터
    if (refundStatusFilter !== 'ALL') {
      if (refundStatusFilter === 'PENDING') {
        filtered = filtered.filter((r) => r.refundStatus === 'PENDING');
      } else if (refundStatusFilter === 'COMPLETED') {
        filtered = filtered.filter((r) => r.refundStatus === 'COMPLETED');
      } else if (refundStatusFilter === 'NO_REFUND') {
        filtered = filtered.filter((r) => r.refundStatus === 'NO_REFUND' || r.refundAmount === 0);
      }
    }

    // 취소 유형 필터
    if (cancellationType) {
      filtered = filtered.filter((r) => r.cancellationType === cancellationType);
    }

    // 검색어 필터
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.booking.bookingNumber?.toLowerCase().includes(keyword) ||
          r.booking.userName?.toLowerCase().includes(keyword) ||
          r.booking.customerName?.toLowerCase().includes(keyword) ||
          r.booking.userPhone?.includes(keyword) ||
          r.booking.customerPhone?.includes(keyword)
      );
    }

    return filtered;
  }, [cancellationRecords, refundStatusFilter, cancellationType, searchKeyword]);

  // 통계 계산
  const stats = useMemo(() => {
    const total = cancellationRecords.length;
    const pendingRefund = cancellationRecords.filter((r) => r.refundStatus === 'PENDING').length;
    const completedRefund = cancellationRecords.filter((r) => r.refundStatus === 'COMPLETED').length;
    const noRefund = cancellationRecords.filter(
      (r) => r.refundStatus === 'NO_REFUND' || r.refundAmount === 0
    ).length;
    const totalRefundAmount = cancellationRecords
      .filter((r) => r.refundStatus === 'COMPLETED')
      .reduce((sum, r) => sum + r.refundAmount, 0);

    return { total, pendingRefund, completedRefund, noRefund, totalRefundAmount };
  }, [cancellationRecords]);

  // 핸들러
  const handleViewDetail = (record: CancellationRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRecord(null);
  };

  const handleOpenRefundModal = (record: CancellationRecord) => {
    setSelectedRecord(record);
    setIsRefundModalOpen(true);
  };

  const handleCloseRefundModal = () => {
    setIsRefundModalOpen(false);
    setSelectedRecord(null);
  };

  const handleProcessRefund = async (
    record: CancellationRecord,
    adjustedAmount: number,
    note: string
  ) => {
    setIsProcessing(true);
    try {
      // TODO: 실제 API 호출
      console.log('Processing refund:', {
        bookingId: record.booking.id,
        adjustedAmount,
        note,
      });

      // 임시로 성공 처리
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success(`₩${adjustedAmount.toLocaleString()} 환불 처리가 완료되었습니다.`);
      handleCloseRefundModal();
      refetch();
    } catch (error) {
      console.error('Failed to process refund:', error);
      toast.error('환불 처리에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 필터 초기화
  const handleResetFilters = () => {
    const newToday = new Date();
    const newMonthAgo = new Date(newToday);
    newMonthAgo.setDate(newMonthAgo.getDate() - 30);
    setDateFrom(formatDate(newMonthAgo));
    setDateTo(formatDate(newToday));
    setRefundStatusFilter('ALL');
    setClubFilter(null);
    setCancellationType('');
    setSearchKeyword('');
  };

  const hasActiveFilters =
    searchKeyword !== '' || clubFilter !== null || cancellationType !== '';

  return (
    <div className="space-y-4">
      {/* 통계 카드 */}
      <CancellationStatsCards
        stats={stats}
        selectedFilter={refundStatusFilter}
        onFilterChange={setRefundStatusFilter}
      />

      {/* 필터 */}
      <CancellationFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        clubFilter={clubFilter}
        cancellationType={cancellationType}
        searchKeyword={searchKeyword}
        clubs={clubs.map((club) => ({ id: club.id, name: club.name }))}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onClubFilterChange={setClubFilter}
        onCancellationTypeChange={setCancellationType}
        onSearchKeywordChange={setSearchKeyword}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* 테이블 */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-3 text-gray-600">취소 내역을 불러오는 중...</span>
          </div>
        </div>
      ) : (
        <CancellationTable
          records={filteredRecords}
          onViewDetail={handleViewDetail}
          onProcessRefund={handleOpenRefundModal}
          isActionPending={isProcessing}
        />
      )}

      {/* 하단 정보 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 text-center">
          총 {filteredRecords.length}건의 취소 내역
          {searchKeyword && ` (검색: "${searchKeyword}")`}
        </p>
      </div>

      {/* 상세 모달 */}
      <CancellationDetailModal
        record={selectedRecord}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onProcessRefund={handleOpenRefundModal}
        isActionPending={isProcessing}
      />

      {/* 환불 처리 모달 */}
      <RefundProcessModal
        record={selectedRecord}
        isOpen={isRefundModalOpen}
        onClose={handleCloseRefundModal}
        onConfirm={handleProcessRefund}
        isProcessing={isProcessing}
      />
    </div>
  );
};
