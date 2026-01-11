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
  async getBookings(filters: BookingFilters = {}, page = 1, limit = 20): Promise<BookingListResponse> {
    try {
      const params = {
        page,
        limit,
        ...filters
      };
      console.log('Fetching bookings from BFF API with params:', params);
      const response = await apiClient.get<unknown>('/admin/bookings', params);
      console.log('Bookings fetched successfully:', response.data);

      return extractPaginatedList<Booking>(response.data, 'bookings', { page, limit });
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      throw error;
    }
  },

  async getBookingById(id: number): Promise<Booking> {
    try {
      const response = await apiClient.get<unknown>(`/admin/bookings/${id}`);
      const booking = extractSingle<Booking>(response.data);
      if (!booking) {
        throw new Error(`Booking ${id} not found`);
      }
      return booking;
    } catch (error) {
      console.error(`Failed to fetch booking ${id}:`, error);
      throw error;
    }
  },

  async createBooking(bookingData: CreateBookingDto): Promise<Booking> {
    try {
      const response = await apiClient.post<unknown>('/admin/bookings', bookingData);
      const booking = extractSingle<Booking>(response.data);
      if (!booking) {
        throw new Error('Failed to create booking');
      }
      return booking;
    } catch (error) {
      console.error('Failed to create booking:', error);
      throw error;
    }
  },

  async updateBooking(id: number, data: UpdateBookingDto): Promise<Booking> {
    try {
      const response = await apiClient.patch<unknown>(`/admin/bookings/${id}`, data);
      const booking = extractSingle<Booking>(response.data);
      if (!booking) {
        throw new Error(`Failed to update booking ${id}`);
      }
      return booking;
    } catch (error) {
      console.error(`Failed to update booking ${id}:`, error);
      throw error;
    }
  },

  async updateBookingStatus(id: number, status: string): Promise<Booking> {
    try {
      const response = await apiClient.patch<unknown>(`/admin/bookings/${id}`, { status });
      const booking = extractSingle<Booking>(response.data);
      if (!booking) {
        throw new Error(`Failed to update booking ${id} status`);
      }
      return booking;
    } catch (error) {
      console.error(`Failed to update booking ${id} status:`, error);
      throw error;
    }
  },

  async cancelBooking(id: number, reason?: string): Promise<Booking> {
    try {
      const response = await apiClient.patch<unknown>(`/admin/bookings/${id}/cancel`, { reason });
      const booking = extractSingle<Booking>(response.data);
      if (!booking) {
        throw new Error(`Failed to cancel booking ${id}`);
      }
      return booking;
    } catch (error) {
      console.error(`Failed to cancel booking ${id}:`, error);
      throw error;
    }
  },

  async confirmBooking(id: number): Promise<Booking> {
    try {
      const response = await apiClient.patch<unknown>(`/admin/bookings/${id}/confirm`);
      const booking = extractSingle<Booking>(response.data);
      if (!booking) {
        throw new Error(`Failed to confirm booking ${id}`);
      }
      return booking;
    } catch (error) {
      console.error(`Failed to confirm booking ${id}:`, error);
      throw error;
    }
  },

  async completeBooking(id: number): Promise<Booking> {
    try {
      const response = await apiClient.patch<unknown>(`/admin/bookings/${id}/complete`);
      const booking = extractSingle<Booking>(response.data);
      if (!booking) {
        throw new Error(`Failed to complete booking ${id}`);
      }
      return booking;
    } catch (error) {
      console.error(`Failed to complete booking ${id}:`, error);
      throw error;
    }
  },

  async markNoShow(id: number): Promise<Booking> {
    try {
      const response = await apiClient.patch<unknown>(`/admin/bookings/${id}/no-show`);
      const booking = extractSingle<Booking>(response.data);
      if (!booking) {
        throw new Error(`Failed to mark booking ${id} as no-show`);
      }
      return booking;
    } catch (error) {
      console.error(`Failed to mark booking ${id} as no-show:`, error);
      throw error;
    }
  },

  // ===== 코스별 예약 조회 =====
  async getBookingsByCourse(courseId: number, filters: BookingFilters = {}): Promise<Booking[]> {
    try {
      const response = await this.getBookings({ ...filters, courseId });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch bookings for course ${courseId}:`, error);
      throw error;
    }
  },

  async getBookingsByUser(userId: number, filters: BookingFilters = {}): Promise<Booking[]> {
    try {
      const response = await this.getBookings({ ...filters, userId });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch bookings for user ${userId}:`, error);
      throw error;
    }
  },

  // ===== 일별 예약 현황 =====
  async getDailyBookings(courseId: number, date: string): Promise<DailyBookingData> {
    try {
      console.log('Fetching daily bookings for course:', courseId, 'on date:', date);

      // 해당 날짜의 예약 목록 조회
      const bookingsResponse = await this.getBookingsByCourse(courseId, {
        dateFrom: date,
        dateTo: date
      });

      return {
        date,
        bookings: bookingsResponse,
        availability: []
      };
    } catch (error) {
      console.error(`Failed to fetch daily bookings for course ${courseId} on ${date}:`, error);
      throw error;
    }
  },

  // ===== 캘린더 데이터 =====
  async getCalendarData(courseId: number, month: string): Promise<DailyBookingData[]> {
    try {
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
    } catch (error) {
      console.error(`Failed to fetch calendar data for course ${courseId} on ${month}:`, error);
      throw error;
    }
  },

  // ===== 예약 통계 =====
  async getBookingStats(filters: BookingFilters = {}): Promise<BookingStats> {
    try {
      console.log('Fetching booking stats with filters:', filters);
      const response = await apiClient.get<unknown>('/admin/bookings/stats/overview', filters);
      console.log('Booking stats fetched successfully:', response.data);
      const stats = extractSingle<BookingStats>(response.data);
      if (!stats) {
        throw new Error('Failed to fetch booking stats');
      }
      return stats;
    } catch (error) {
      console.error('Failed to fetch booking stats:', error);
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
  },

  // ===== 예약 가능 여부 확인 =====
  async checkAvailability(_courseId: number, _date: string, _timeSlot: string): Promise<boolean> {
    // TODO: Implement with gamesApi when available
    return true;
  },

  // ===== 벌크 작업 =====
  async bulkUpdateBookingStatus(bookingIds: number[], status: string): Promise<Booking[]> {
    try {
      const response = await apiClient.patch<unknown>('/admin/bookings/bulk-update', {
        bookingIds,
        status
      });
      return extractList<Booking>(response.data, 'bookings');
    } catch (error) {
      console.error('Failed to bulk update booking status:', error);
      throw error;
    }
  },

  async bulkCancelBookings(bookingIds: number[], reason?: string): Promise<Booking[]> {
    try {
      const response = await apiClient.patch<unknown>('/admin/bookings/bulk-cancel', {
        bookingIds,
        reason
      });
      return extractList<Booking>(response.data, 'bookings');
    } catch (error) {
      console.error('Failed to bulk cancel bookings:', error);
      throw error;
    }
  },

  // ===== 예약 내역 조회 =====
  async getBookingHistory(filters: BookingFilters = {}): Promise<Booking[]> {
    try {
      const response = await apiClient.get<unknown>('/admin/bookings/history/list', filters);
      return extractList<Booking>(response.data, 'bookings');
    } catch (error) {
      console.error('Failed to fetch booking history:', error);
      throw error;
    }
  }
} as const;
