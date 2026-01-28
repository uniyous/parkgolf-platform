import { apiClient } from './client';
import { unwrapResponse, type BffResponse } from './bffParser';

/**
 * TimeSlot 가용성 응답 DTO
 */
export interface TimeSlot {
  id: number;
  gameTimeSlotId: number;
  gameId: number;
  gameName: string;
  gameCode: string;
  frontNineCourseName: string;
  backNineCourseName: string;
  clubId: number;
  clubName: string;
  date: string;
  startTime: string;
  endTime: string;
  maxPlayers: number;
  bookedPlayers: number;
  availablePlayers: number;
  isAvailable: boolean;
  price: number;
  isPremium: boolean;
  status: string;
  // Legacy fields
  time?: string;
  available?: boolean;      // isAvailable alias
  remaining?: number;       // availablePlayers alias
}

/**
 * 예약 생성 요청 DTO
 */
export interface CreateBookingRequest {
  gameId: number;
  gameTimeSlotId: number;
  bookingDate: string;
  playerCount: number;
  paymentMethod?: string;
  specialRequests?: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  idempotencyKey?: string;  // 멱등성 키
}

/**
 * 예약 상태 타입 - booking-service의 BookingStatus와 일치
 */
export type BookingStatus =
  | 'PENDING'         // Saga 시작: 예약 생성됨, 슬롯 예약 대기 중
  | 'SLOT_RESERVED'   // course-service에서 슬롯 예약 완료
  | 'CONFIRMED'       // 최종 확정 (결제 완료 등)
  | 'CANCELLED'       // 취소됨
  | 'COMPLETED'       // 완료됨
  | 'NO_SHOW'         // 노쇼
  | 'FAILED';         // Saga 실패 (슬롯 예약 실패 등)

/**
 * 예약 응답 DTO - booking-service의 BookingResponseDto와 일치
 */
export interface BookingResponse {
  id: number;
  bookingNumber: string;
  userId?: number;
  gameId: number;
  gameTimeSlotId: number;
  gameName?: string;
  gameCode?: string;
  frontNineCourseId?: number;
  frontNineCourseName?: string;
  backNineCourseId?: number;
  backNineCourseName?: string;
  clubId?: number;
  clubName?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  playerCount: number;
  pricePerPerson: number;
  serviceFee: number;
  totalPrice: number;
  status: BookingStatus;
  paymentMethod?: string;
  specialRequests?: string;
  notes?: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  idempotencyKey?: string;
  sagaFailReason?: string;
  payments: unknown[];
  histories: unknown[];
  canCancel?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BookingWithCancel extends BookingResponse {
  canCancel: boolean;
}

export interface UpdateBookingRequest {
  playerCount?: number;
  specialRequests?: string;
  userPhone?: string;
  userName?: string;
  userEmail?: string;
}

export interface SearchBookingParams {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  gameId?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: 'bookingDate' | 'createdAt' | 'totalPrice';
  sortOrder?: 'asc' | 'desc';
  timeFilter?: 'upcoming' | 'past' | 'all';
}

export interface SearchBookingsResponse {
  bookings: BookingWithCancel[];
  total: number;
  page: number;
  limit: number;
}

export const bookingApi = {
  /**
   * 타임슬롯 가용성 조회
   */
  getTimeSlotAvailability: async (gameId: number, date: string): Promise<TimeSlot[]> => {
    const response = await apiClient.get<BffResponse<TimeSlot[]>>(
      `/api/user/bookings/games/${gameId}/time-slots`,
      { date }
    );
    return unwrapResponse(response.data);
  },

  /**
   * 예약 생성
   */
  createBooking: async (bookingData: CreateBookingRequest): Promise<BookingResponse> => {
    const response = await apiClient.post<BffResponse<BookingResponse>>(
      '/api/user/bookings',
      bookingData
    );
    return unwrapResponse(response.data);
  },

  /**
   * 내 예약 목록 조회
   */
  getMyBookings: async (): Promise<BookingResponse[]> => {
    const response = await apiClient.get<BffResponse<BookingResponse[]>>('/api/user/bookings');
    return unwrapResponse(response.data);
  },

  /**
   * 예약 검색
   */
  searchBookings: async (params: SearchBookingParams): Promise<SearchBookingsResponse> => {
    const queryParams: Record<string, string | number | undefined> = {};
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;
    if (params.status) queryParams.status = params.status;
    if (params.gameId) queryParams.gameId = params.gameId;
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params.timeFilter) queryParams.timeFilter = params.timeFilter;

    const response = await apiClient.get<BffResponse<SearchBookingsResponse>>(
      '/api/user/bookings/search',
      queryParams
    );
    return unwrapResponse(response.data);
  },

  /**
   * 예약번호로 예약 조회
   */
  getBookingByNumber: async (bookingNumber: string): Promise<BookingResponse> => {
    const response = await apiClient.get<BffResponse<BookingResponse>>(
      `/api/user/bookings/number/${bookingNumber}`
    );
    return unwrapResponse(response.data);
  },

  /**
   * ID로 예약 조회
   */
  getBookingById: async (id: number): Promise<BookingResponse> => {
    const response = await apiClient.get<BffResponse<BookingResponse>>(
      `/api/user/bookings/${id}`
    );
    return unwrapResponse(response.data);
  },

  /**
   * 예약 수정
   */
  updateBooking: async (id: number, updates: UpdateBookingRequest): Promise<BookingResponse> => {
    const response = await apiClient.put<BffResponse<BookingResponse>>(
      `/api/user/bookings/${id}`,
      updates
    );
    return unwrapResponse(response.data);
  },

  /**
   * 예약 취소
   */
  cancelBooking: async (id: number, reason?: string): Promise<BookingResponse> => {
    const response = await apiClient.delete<BffResponse<BookingResponse>>(
      `/api/user/bookings/${id}`,
      { reason }
    );
    return unwrapResponse(response.data);
  },
};
