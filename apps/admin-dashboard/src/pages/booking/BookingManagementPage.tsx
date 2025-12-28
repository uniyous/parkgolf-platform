import React, { useState, useMemo } from 'react';
import { useBookings, useConfirmBooking, useCancelBooking } from '@/hooks/queries/booking';
import { useClubs } from '@/hooks/queries';
import type { BookingFilters } from '@/lib/api/bookingApi';
import type { Booking } from '@/types';

// 상태 정의
const BOOKING_STATUSES = {
  ALL: { label: '전체', color: '' },
  PENDING: { label: '대기', color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: '확정', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: '완료', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: '취소', color: 'bg-red-100 text-red-800' },
  NO_SHOW: { label: '노쇼', color: 'bg-gray-100 text-gray-800' },
} as const;

type BookingStatusKey = keyof typeof BOOKING_STATUSES;

// 날짜 포맷 헬퍼
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekDay = weekDays[date.getDay()];
  return `${month}/${day}(${weekDay})`;
};

export const BookingManagementPage: React.FC = () => {
  // 필터 상태
  const today = new Date();
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  const [dateFrom, setDateFrom] = useState(formatDate(today));
  const [dateTo, setDateTo] = useState(formatDate(weekLater));
  const [statusFilter, setStatusFilter] = useState<BookingStatusKey>('ALL');
  const [clubFilter, setClubFilter] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 필터 객체
  const filters: BookingFilters = useMemo(() => ({
    dateFrom,
    dateTo,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    courseId: clubFilter || undefined,
    search: searchKeyword || undefined,
  }), [dateFrom, dateTo, statusFilter, clubFilter, searchKeyword]);

  // API Queries
  const { data: bookingsData } = useBookings(filters);
  const { data: clubsData } = useClubs();

  const confirmMutation = useConfirmBooking();
  const cancelMutation = useCancelBooking();

  const bookings = bookingsData?.data || [];
  const clubs = clubsData?.data || [];

  // 클라이언트 사이드 검색 필터링
  const filteredBookings = useMemo(() => {
    if (!searchKeyword.trim()) return bookings;
    const keyword = searchKeyword.toLowerCase();
    return bookings.filter(
      (booking) =>
        booking.customerName?.toLowerCase().includes(keyword) ||
        booking.customerPhone?.includes(keyword) ||
        booking.customerEmail?.toLowerCase().includes(keyword)
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

  // 액션 핸들러
  const handleConfirm = async (booking: Booking) => {
    if (window.confirm(`${booking.customerName}님의 예약을 확정하시겠습니까?`)) {
      try {
        await confirmMutation.mutateAsync(booking.id);
      } catch (error) {
        console.error('Failed to confirm booking:', error);
        alert('예약 확정에 실패했습니다.');
      }
    }
  };

  const handleCancel = async (booking: Booking) => {
    const reason = window.prompt(`${booking.customerName}님의 예약을 취소하시겠습니까?\n취소 사유를 입력해주세요:`);
    if (reason !== null) {
      try {
        await cancelMutation.mutateAsync(booking.id);
      } catch (error) {
        console.error('Failed to cancel booking:', error);
        alert('예약 취소에 실패했습니다.');
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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">예약 현황</h1>
            <p className="text-gray-500 mt-1">실시간 예약 조회 및 관리</p>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div
            onClick={() => setStatusFilter('ALL')}
            className={`p-4 rounded-lg cursor-pointer transition-all ${
              statusFilter === 'ALL' ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <p className="text-sm text-gray-500">전체</p>
            <p className="text-2xl font-bold text-gray-900">{statusCounts.ALL}</p>
          </div>
          <div
            onClick={() => setStatusFilter('PENDING')}
            className={`p-4 rounded-lg cursor-pointer transition-all ${
              statusFilter === 'PENDING' ? 'bg-yellow-50 border-2 border-yellow-500' : 'bg-yellow-50/50 hover:bg-yellow-100'
            }`}
          >
            <p className="text-sm text-yellow-600">대기</p>
            <p className="text-2xl font-bold text-yellow-700">{statusCounts.PENDING}</p>
          </div>
          <div
            onClick={() => setStatusFilter('CONFIRMED')}
            className={`p-4 rounded-lg cursor-pointer transition-all ${
              statusFilter === 'CONFIRMED' ? 'bg-blue-50 border-2 border-blue-500' : 'bg-blue-50/50 hover:bg-blue-100'
            }`}
          >
            <p className="text-sm text-blue-600">확정</p>
            <p className="text-2xl font-bold text-blue-700">{statusCounts.CONFIRMED}</p>
          </div>
          <div
            onClick={() => setStatusFilter('COMPLETED')}
            className={`p-4 rounded-lg cursor-pointer transition-all ${
              statusFilter === 'COMPLETED' ? 'bg-green-50 border-2 border-green-500' : 'bg-green-50/50 hover:bg-green-100'
            }`}
          >
            <p className="text-sm text-green-600">완료</p>
            <p className="text-2xl font-bold text-green-700">{statusCounts.COMPLETED}</p>
          </div>
          <div
            onClick={() => setStatusFilter('CANCELLED')}
            className={`p-4 rounded-lg cursor-pointer transition-all ${
              statusFilter === 'CANCELLED' ? 'bg-red-50 border-2 border-red-500' : 'bg-red-50/50 hover:bg-red-100'
            }`}
          >
            <p className="text-sm text-red-600">취소</p>
            <p className="text-2xl font-bold text-red-700">{statusCounts.CANCELLED}</p>
          </div>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 날짜 범위 */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">기간</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 골프장 필터 */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">골프장</label>
            <select
              value={clubFilter || ''}
              onChange={(e) => setClubFilter(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>

          {/* 검색 */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                placeholder="고객명, 연락처 검색..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* 필터 초기화 */}
          {(searchKeyword || clubFilter || statusFilter !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* 예약 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">예약이 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">
              선택한 조건에 해당하는 예약이 없습니다.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    예약번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    날짜/시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    고객 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    인원
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    금액
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        B{String(booking.id).padStart(4, '0')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDisplayDate(booking.bookingDate)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {booking.timeSlot || booking.startTime}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.customerName || '미등록'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {booking.customerPhone || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {booking.playerCount || booking.numberOfPlayers || 0}명
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        ₩{(booking.totalPrice || booking.totalAmount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          BOOKING_STATUSES[booking.status as BookingStatusKey]?.color || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {BOOKING_STATUSES[booking.status as BookingStatusKey]?.label || booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {booking.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleConfirm(booking)}
                              disabled={confirmMutation.isPending}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            >
                              확정
                            </button>
                            <button
                              onClick={() => handleCancel(booking)}
                              disabled={cancelMutation.isPending}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              취소
                            </button>
                          </>
                        )}
                        {booking.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleCancel(booking)}
                            disabled={cancelMutation.isPending}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            취소
                          </button>
                        )}
                        <button className="text-gray-600 hover:text-gray-900">
                          상세
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 하단 정보 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 text-center">
          총 {filteredBookings.length}건의 예약
          {searchKeyword && ` (검색: "${searchKeyword}")`}
        </p>
      </div>
    </div>
  );
};

export default BookingManagementPage;
