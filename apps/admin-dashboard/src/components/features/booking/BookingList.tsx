import React, { useState, useEffect } from 'react';
import { bookingApi } from '@/lib/api/bookingApi';
import type { 
  Booking, 
  Course,
  BookingFilters as ApiBookingFilters 
} from '@/types';
import type { BookingListResponse, BookingStats } from '@/lib/api/bookingApi';

interface BookingListProps {
  course?: Course;
  onBookingSelect?: (booking: Booking) => void;
  onBookingEdit?: (booking: Booking) => void;
  onBookingCancel?: (booking: Booking) => void;
  refreshTrigger?: number;
}

interface BookingFilters extends ApiBookingFilters {
  sortBy: 'bookingDate' | 'createdAt' | 'customerName' | 'totalAmount';
  sortDirection: 'asc' | 'desc';
}

export const BookingList: React.FC<BookingListProps> = ({
  course,
  onBookingSelect,
  onBookingEdit,
  onBookingCancel,
  refreshTrigger
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBookings, setSelectedBookings] = useState<Set<number>>(new Set());
  
  // 필터링 및 정렬
  const [filters, setFilters] = useState<BookingFilters>({
    search: '',
    status: '',
    courseId: course?.id,
    dateFrom: '',
    dateTo: '',
    sortBy: 'bookingDate',
    sortDirection: 'desc'
  });

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);

  // 예약 목록 조회
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      const { search, status, courseId, dateFrom, dateTo, sortBy, sortDirection } = filters;
      
      const response = await bookingApi.getBookings(
        {
          search,
          status,
          courseId,
          dateFrom,
          dateTo
        },
        currentPage,
        pageSize
      );

      // 클라이언트 사이드 정렬
      let sortedBookings = [...response.data];
      sortedBookings.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'bookingDate':
            aValue = new Date(a.bookingDate).getTime();
            bValue = new Date(b.bookingDate).getTime();
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case 'customerName':
            aValue = a.customerName.toLowerCase();
            bValue = b.customerName.toLowerCase();
            break;
          case 'totalAmount':
            aValue = a.totalAmount;
            bValue = b.totalAmount;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      setBookings(sortedBookings);
      setTotalPages(response.pagination.totalPages);
      setTotalBookings(response.pagination.total);

      // 통계 정보 조회
      const statsData = await bookingApi.getBookingStats(filters);
      setStats(statsData);

    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setError('예약 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filters, currentPage, refreshTrigger]);

  // 필터 변경 핸들러
  const handleFilterChange = (newFilters: Partial<BookingFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  // 정렬 변경 핸들러
  const handleSort = (column: BookingFilters['sortBy']) => {
    const newDirection = 
      filters.sortBy === column && filters.sortDirection === 'asc' ? 'desc' : 'asc';
    
    handleFilterChange({
      sortBy: column,
      sortDirection: newDirection
    });
  };

  // 예약 선택 핸들러
  const handleBookingSelect = (bookingId: number) => {
    const newSelected = new Set(selectedBookings);
    if (newSelected.has(bookingId)) {
      newSelected.delete(bookingId);
    } else {
      newSelected.add(bookingId);
    }
    setSelectedBookings(newSelected);
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedBookings.size === bookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(bookings.map(b => b.id)));
    }
  };

  // 예약 상태 변경
  const handleStatusChange = async (booking: Booking, newStatus: string) => {
    try {
      await bookingApi.updateBookingStatus(booking.id, newStatus);
      fetchBookings(); // 목록 새로고침
    } catch (error) {
      console.error('Failed to update booking status:', error);
    }
  };

  // 대량 상태 변경
  const handleBulkStatusChange = async (status: string) => {
    if (selectedBookings.size === 0) return;

    try {
      await bookingApi.bulkUpdateBookingStatus(Array.from(selectedBookings), status);
      setSelectedBookings(new Set());
      fetchBookings();
    } catch (error) {
      console.error('Failed to bulk update status:', error);
    }
  };

  // 예약 상태별 스타일
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'NO_SHOW':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 예약 상태 한글 변환
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return '확정';
      case 'PENDING': return '대기';
      case 'CANCELLED': return '취소';
      case 'COMPLETED': return '완료';
      case 'NO_SHOW': return '노쇼';
      default: return status;
    }
  };

  // 결제 상태 스타일
  const getPaymentStatusStyle = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 결제 상태 한글 변환
  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return '결제완료';
      case 'PENDING': return '결제대기';
      case 'FAILED': return '결제실패';
      default: return status;
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  // 시간 포맷팅
  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  // 가격 포맷팅
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">예약 목록</h3>
            {course && (
              <p className="text-sm text-gray-600 mt-1">{course.name}</p>
            )}
          </div>
          <button
            onClick={fetchBookings}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '새로고침 중...' : '새로고침'}
          </button>
        </div>
      </div>

      {/* 통계 정보 */}
      {stats && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalBookings}</div>
              <div className="text-sm text-gray-600">총 예약</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.confirmedBookings}</div>
              <div className="text-sm text-gray-600">확정</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingBookings}</div>
              <div className="text-sm text-gray-600">대기</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.cancelledBookings}</div>
              <div className="text-sm text-gray-600">취소</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatPrice(stats.totalRevenue)}</div>
              <div className="text-sm text-gray-600">총 매출</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{formatPrice(stats.averageBookingValue)}</div>
              <div className="text-sm text-gray-600">평균 예약가</div>
            </div>
          </div>
        </div>
      )}

      {/* 필터 및 검색 */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 검색 */}
          <div>
            <input
              type="text"
              placeholder="고객명, 연락처로 검색"
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 상태 필터 */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange({ status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 상태</option>
              <option value="PENDING">대기</option>
              <option value="CONFIRMED">확정</option>
              <option value="COMPLETED">완료</option>
              <option value="CANCELLED">취소</option>
              <option value="NO_SHOW">노쇼</option>
            </select>
          </div>

          {/* 시작 날짜 */}
          <div>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 종료 날짜 */}
          <div>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 대량 작업 */}
        {selectedBookings.size > 0 && (
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {selectedBookings.size}개 선택됨
            </span>
            <button
              onClick={() => handleBulkStatusChange('CONFIRMED')}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              일괄 확정
            </button>
            <button
              onClick={() => handleBulkStatusChange('CANCELLED')}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              일괄 취소
            </button>
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* 예약 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedBookings.size === bookings.length && bookings.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('bookingDate')}
              >
                예약 날짜
                {filters.sortBy === 'bookingDate' && (
                  <span className="ml-1">
                    {filters.sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('customerName')}
              >
                고객 정보
                {filters.sortBy === 'customerName' && (
                  <span className="ml-1">
                    {filters.sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                시간 / 인원
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalAmount')}
              >
                결제 정보
                {filters.sortBy === 'totalAmount' && (
                  <span className="ml-1">
                    {filters.sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-500">로딩 중...</span>
                  </div>
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  예약 내역이 없습니다.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr 
                  key={booking.id}
                  className={`hover:bg-gray-50 ${selectedBookings.has(booking.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedBookings.has(booking.id)}
                      onChange={() => handleBookingSelect(booking.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(booking.bookingDate)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {booking.customerName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {booking.customerPhone}
                    </div>
                    {booking.customerEmail && (
                      <div className="text-sm text-gray-500">
                        {booking.customerEmail}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {booking.numberOfPlayers}명
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {formatPrice(booking.totalAmount)}
                    </div>
                    <div className="text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusStyle(booking.paymentStatus)}`}>
                        {getPaymentStatusLabel(booking.paymentStatus)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {onBookingSelect && (
                        <button
                          onClick={() => onBookingSelect(booking)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          보기
                        </button>
                      )}
                      {onBookingEdit && booking.status === 'PENDING' && (
                        <button
                          onClick={() => onBookingEdit(booking)}
                          className="text-green-600 hover:text-green-900"
                        >
                          수정
                        </button>
                      )}
                      {onBookingCancel && ['PENDING', 'CONFIRMED'].includes(booking.status) && (
                        <button
                          onClick={() => onBookingCancel(booking)}
                          className="text-red-600 hover:text-red-900"
                        >
                          취소
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-700">
              <span>
                전체 {totalBookings}개 중 {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalBookings)}개 표시
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 text-sm border rounded-md ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};