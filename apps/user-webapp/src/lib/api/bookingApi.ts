import { apiClient } from './client';

export interface TimeSlot {
  id: number;
  time: string;
  date: string;
  available: boolean;
  price: number;
  isPremium?: boolean;
  remaining: number;
}

export interface CreateBookingRequest {
  gameId: number;
  gameTimeSlotId: number;
  bookingDate: string;
  playerCount: number;
  paymentMethod?: string;
  specialRequests?: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface BookingResponse {
  id: number;
  bookingNumber: string;
  userId: number;
  gameId: number;
  gameTimeSlotId: number;
  gameName: string;
  gameCode: string;
  frontNineCourseId: number;
  frontNineCourseName: string;
  backNineCourseId: number;
  backNineCourseName: string;
  clubId: number;
  clubName: string;
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
  userEmail: string;
  userName: string;
  userPhone?: string;
  payments: unknown[];
  histories: unknown[];
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

// NATS 응답 래퍼 타입
interface NatsResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

// NATS 응답에서 data 추출 헬퍼
function unwrapNatsResponse<T>(response: NatsResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error?.message || 'Request failed');
  }
  return response.data;
}

export const bookingApi = {
  getTimeSlotAvailability: async (gameId: number, date: string) => {
    const response = await apiClient.get<NatsResponse<TimeSlot[]>>(
      `/api/user/bookings/games/${gameId}/time-slots`,
      { date }
    );
    return unwrapNatsResponse(response.data);
  },

  createBooking: async (bookingData: CreateBookingRequest) => {
    const response = await apiClient.post<NatsResponse<BookingResponse>>('/api/user/bookings', bookingData);
    return unwrapNatsResponse(response.data);
  },

  getMyBookings: async () => {
    const response = await apiClient.get<NatsResponse<BookingResponse[]>>('/api/user/bookings');
    return unwrapNatsResponse(response.data);
  },

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

    const response = await apiClient.get<NatsResponse<SearchBookingsResponse>>('/api/user/bookings/search', queryParams);
    return unwrapNatsResponse(response.data);
  },

  getBookingByNumber: async (bookingNumber: string) => {
    const response = await apiClient.get<NatsResponse<BookingResponse>>(
      `/api/user/bookings/number/${bookingNumber}`
    );
    return unwrapNatsResponse(response.data);
  },

  getBookingById: async (id: number) => {
    const response = await apiClient.get<NatsResponse<BookingResponse>>(`/api/user/bookings/${id}`);
    return unwrapNatsResponse(response.data);
  },

  updateBooking: async (id: number, updates: UpdateBookingRequest) => {
    const response = await apiClient.put<NatsResponse<BookingResponse>>(`/api/user/bookings/${id}`, updates);
    return unwrapNatsResponse(response.data);
  },

  cancelBooking: async (id: number, reason?: string) => {
    const response = await apiClient.delete<NatsResponse<BookingResponse>>(`/api/user/bookings/${id}`, {
      reason,
    });
    return unwrapNatsResponse(response.data);
  },
};
