import { apiClient } from './client';
import { extractPaginatedList, extractSingle, extractList, type PaginatedResult } from './bffParser';
import type {
  Booking,
  CreateBookingDto,
  UpdateBookingDto,
  TimeSlotAvailability
} from '@/types';

// BFF API 응답 타입
export type BookingListResponse = PaginatedResult<Booking>;

export interface BookingFilters {
  search?: string;
  status?: string;
  courseId?: number;
  userId?: number;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
}

export interface BookingStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
}

export interface DailyBookingData {
  date: string; // YYYY-MM-DD
  bookings: Booking[];
  availability: TimeSlotAvailability[];
}

export const bookingApi = {
  // ===== 예약 CRUD =====

  /**
   * 예약 목록 조회
   */
  async getBookings(filters: BookingFilters = {}, page = 1, limit = 20): Promise<BookingListResponse> {
    const params = { page, limit, ...filters };
    const response = await apiClient.get<unknown>('/admin/bookings', params);
    return extractPaginatedList<Booking>(response.data, 'bookings', { page, limit });
  },

  /**
   * 예약 상세 조회
   */
  async getBookingById(id: number): Promise<Booking> {
    const response = await apiClient.get<unknown>(`/admin/bookings/${id}`);
    const booking = extractSingle<Booking>(response.data);
    if (!booking) {
      throw new Error(`Booking ${id} not found`);
    }
    return booking;
  },

  /**
   * 예약 생성
   */
  async createBooking(bookingData: CreateBookingDto): Promise<Booking> {
    const response = await apiClient.post<unknown>('/admin/bookings', bookingData);
    const booking = extractSingle<Booking>(response.data);
    if (!booking) {
      throw new Error('Failed to create booking');
    }
    return booking;
  },

  /**
   * 예약 수정
   */
  async updateBooking(id: number, data: UpdateBookingDto): Promise<Booking> {
    const response = await apiClient.patch<unknown>(`/admin/bookings/${id}`, data);
    const booking = extractSingle<Booking>(response.data);
    if (!booking) {
      throw new Error(`Failed to update booking ${id}`);
    }
    return booking;
  },

  /**
   * 예약 상태 변경
   */
  async updateBookingStatus(id: number, status: string): Promise<Booking> {
    const response = await apiClient.patch<unknown>(`/admin/bookings/${id}`, { status });
    const booking = extractSingle<Booking>(response.data);
    if (!booking) {
      throw new Error(`Failed to update booking ${id} status`);
    }
    return booking;
  },

  /**
   * 예약 취소
   */
  async cancelBooking(id: number, reason?: string): Promise<Booking> {
    const response = await apiClient.patch<unknown>(`/admin/bookings/${id}/cancel`, { reason });
    const booking = extractSingle<Booking>(response.data);
    if (!booking) {
      throw new Error(`Failed to cancel booking ${id}`);
    }
    return booking;
  },

  /**
   * 예약 확정
   */
  async confirmBooking(id: number): Promise<Booking> {
    const response = await apiClient.patch<unknown>(`/admin/bookings/${id}/confirm`);
    const booking = extractSingle<Booking>(response.data);
    if (!booking) {
      throw new Error(`Failed to confirm booking ${id}`);
    }
    return booking;
  },

  /**
   * 예약 완료 처리
   */
  async completeBooking(id: number): Promise<Booking> {
    const response = await apiClient.patch<unknown>(`/admin/bookings/${id}/complete`);
    const booking = extractSingle<Booking>(response.data);
    if (!booking) {
      throw new Error(`Failed to complete booking ${id}`);
    }
    return booking;
  },

  /**
   * 노쇼 처리
   */
  async markNoShow(id: number): Promise<Booking> {
    const response = await apiClient.patch<unknown>(`/admin/bookings/${id}/no-show`);
    const booking = extractSingle<Booking>(response.data);
    if (!booking) {
      throw new Error(`Failed to mark booking ${id} as no-show`);
    }
    return booking;
  },

  // ===== 코스별 예약 조회 =====

  /**
   * 코스별 예약 목록 조회
   */
  async getBookingsByCourse(courseId: number, filters: BookingFilters = {}): Promise<Booking[]> {
    const response = await this.getBookings({ ...filters, courseId });
    return response.data;
  },

  /**
   * 사용자별 예약 목록 조회
   */
  async getBookingsByUser(userId: number, filters: BookingFilters = {}): Promise<Booking[]> {
    const response = await this.getBookings({ ...filters, userId });
    return response.data;
  },

  // ===== 일별 예약 현황 =====

  /**
   * 일별 예약 현황 조회
   */
  async getDailyBookings(courseId: number, date: string): Promise<DailyBookingData> {
    const bookingsResponse = await this.getBookingsByCourse(courseId, {
      dateFrom: date,
      dateTo: date
    });

    return {
      date,
      bookings: bookingsResponse,
      availability: []
    };
  },

  // ===== 캘린더 데이터 =====

  /**
   * 캘린더 데이터 조회
   */
  async getCalendarData(courseId: number, month: string): Promise<DailyBookingData[]> {
    // month format: YYYY-MM
    const [year, monthNum] = month.split('-');
    const startDate = `${year}-${monthNum}-01`;
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];

    const response = await this.getBookingsByCourse(courseId, {
      dateFrom: startDate,
      dateTo: endDate
    });

    // Group bookings by date
    const bookingsByDate = new Map<string, Booking[]>();
    response.forEach((booking) => {
      const date = booking.bookingDate?.split('T')[0] || '';
      if (!bookingsByDate.has(date)) {
        bookingsByDate.set(date, []);
      }
      bookingsByDate.get(date)!.push(booking);
    });

    // Convert to DailyBookingData array
    return Array.from(bookingsByDate.entries()).map(([date, bookings]) => ({
      date,
      bookings,
      availability: []
    }));
  },

  // ===== 예약 통계 =====

  /**
   * 예약 통계 조회
   */
  async getBookingStats(filters: BookingFilters = {}): Promise<BookingStats> {
    const response = await apiClient.get<unknown>('/admin/bookings/stats/overview', filters);
    const stats = extractSingle<BookingStats>(response.data);
    if (!stats) {
      // 통계 API가 구현되지 않은 경우 기본값 반환
      return {
        totalBookings: 0,
        confirmedBookings: 0,
        pendingBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
        averageBookingValue: 0
      };
    }
    return stats;
  },

  // ===== 예약 가능 여부 확인 =====

  /**
   * 예약 가능 여부 확인
   */
  async checkAvailability(_courseId: number, _date: string, _timeSlot: string): Promise<boolean> {
    // TODO: Implement with gamesApi when available
    return true;
  },

  // ===== 벌크 작업 =====

  /**
   * 벌크 상태 변경
   */
  async bulkUpdateBookingStatus(bookingIds: number[], status: string): Promise<Booking[]> {
    const response = await apiClient.patch<unknown>('/admin/bookings/bulk-update', {
      bookingIds,
      status
    });
    return extractList<Booking>(response.data, 'bookings');
  },

  /**
   * 벌크 취소
   */
  async bulkCancelBookings(bookingIds: number[], reason?: string): Promise<Booking[]> {
    const response = await apiClient.patch<unknown>('/admin/bookings/bulk-cancel', {
      bookingIds,
      reason
    });
    return extractList<Booking>(response.data, 'bookings');
  },

  // ===== 예약 내역 조회 =====

  /**
   * 예약 내역 조회
   */
  async getBookingHistory(filters: BookingFilters = {}): Promise<Booking[]> {
    const response = await apiClient.get<unknown>('/admin/bookings/history/list', filters);
    return extractList<Booking>(response.data, 'bookings');
  }
} as const;
