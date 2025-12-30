import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { NatsSuccessResponse } from '../common/types';
import { CreateBookingDto, UpdateBookingDto, BookingStatusType } from './dto/booking.dto';
import { BookingFilterDto } from './dto/booking-filter.dto';

/** Booking 응답 DTO - booking-service의 BookingResponseDto와 일치 */
export interface BookingResponseDto {
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
  status: BookingStatusType;
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

/** Booking 목록 응답 타입 */
export interface BookingListResponse {
  bookings: BookingResponseDto[];
  total: number;
  page: number;
  limit: number;
}

/** Booking 통계 응답 타입 */
export interface BookingStatsResponse {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  revenue: number;
}

/** Payment 응답 DTO */
export interface PaymentResponseDto {
  id: number;
  bookingId: number;
  amount: number;
  method: string;
  status: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Payment 목록 응답 타입 */
export interface PaymentListResponse {
  payments: PaymentResponseDto[];
  total: number;
  page: number;
  limit: number;
}

/** Revenue 통계 응답 타입 */
export interface RevenueStatsResponse {
  totalRevenue: number;
  dailyRevenue: Record<string, number>;
  averageBookingValue: number;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // Booking Management
  async getBookings(
    filters: BookingFilterDto = {},
    page = 1,
    limit = 20,
    adminToken: string,
  ): Promise<NatsSuccessResponse<BookingListResponse>> {
    this.logger.log('Fetching bookings');
    return this.natsClient.send('bookings.list', {
      filters,
      page,
      limit,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getBookingById(bookingId: string, adminToken: string): Promise<NatsSuccessResponse<BookingResponseDto>> {
    this.logger.log(`Fetching booking: ${bookingId}`);
    return this.natsClient.send('bookings.findById', {
      bookingId,
      token: adminToken,
    }, NATS_TIMEOUTS.QUICK);
  }

  async createBooking(bookingData: CreateBookingDto, adminToken: string): Promise<NatsSuccessResponse<BookingResponseDto>> {
    this.logger.log('Creating booking');
    return this.natsClient.send('bookings.create', {
      data: bookingData,
      token: adminToken,
    });
  }

  async updateBooking(
    bookingId: string,
    updateData: UpdateBookingDto,
    adminToken: string,
  ): Promise<NatsSuccessResponse<BookingResponseDto>> {
    this.logger.log(`Updating booking: ${bookingId}`);
    return this.natsClient.send('bookings.update', {
      bookingId,
      data: updateData,
      token: adminToken,
    });
  }

  async cancelBooking(
    bookingId: string,
    reason?: string,
    adminToken?: string,
  ): Promise<NatsSuccessResponse<BookingResponseDto>> {
    this.logger.log(`Cancelling booking: ${bookingId}`);
    const params: { bookingId: string; reason?: string; token?: string } = { bookingId };
    if (reason) params.reason = reason;
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('bookings.cancel', params);
  }

  async confirmBooking(bookingId: string, adminToken: string): Promise<NatsSuccessResponse<BookingResponseDto>> {
    this.logger.log(`Confirming booking: ${bookingId}`);
    return this.natsClient.send('bookings.confirm', {
      bookingId,
      token: adminToken,
    });
  }

  async completeBooking(bookingId: string, adminToken: string): Promise<NatsSuccessResponse<BookingResponseDto>> {
    this.logger.log(`Completing booking: ${bookingId}`);
    return this.natsClient.send('bookings.complete', {
      bookingId,
      token: adminToken,
    });
  }

  async markNoShow(bookingId: string, adminToken: string): Promise<NatsSuccessResponse<BookingResponseDto>> {
    this.logger.log(`Marking no-show: ${bookingId}`);
    return this.natsClient.send('bookings.noShow', {
      bookingId,
      token: adminToken,
    });
  }

  // Payment Management
  async getPayments(
    filters: Record<string, unknown> = {},
    page = 1,
    limit = 20,
    adminToken: string,
  ): Promise<NatsSuccessResponse<PaymentListResponse>> {
    this.logger.log('Fetching payments');
    return this.natsClient.send('payments.list', {
      filters,
      page,
      limit,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getPaymentById(paymentId: string, adminToken: string): Promise<NatsSuccessResponse<PaymentResponseDto>> {
    this.logger.log(`Fetching payment: ${paymentId}`);
    return this.natsClient.send('payments.findById', {
      paymentId,
      token: adminToken,
    }, NATS_TIMEOUTS.QUICK);
  }

  async processRefund(
    paymentId: string,
    refundData: { amount?: number; reason?: string },
    adminToken: string,
  ): Promise<NatsSuccessResponse<PaymentResponseDto>> {
    this.logger.log(`Processing refund: ${paymentId}`);
    return this.natsClient.send('payments.refund', {
      paymentId,
      data: refundData,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  // Booking History and Analytics
  async getBookingHistory(
    filters: Record<string, unknown> = {},
    page = 1,
    limit = 20,
    adminToken: string,
  ): Promise<NatsSuccessResponse<BookingListResponse>> {
    this.logger.log('Fetching booking history');
    return this.natsClient.send('bookings.history', {
      filters,
      page,
      limit,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getBookingStats(
    dateRange: { startDate: string; endDate: string },
    adminToken: string,
  ): Promise<NatsSuccessResponse<BookingStatsResponse>> {
    this.logger.log('Fetching booking statistics');
    return this.natsClient.send('bookings.stats', {
      dateRange,
      token: adminToken,
    }, NATS_TIMEOUTS.ANALYTICS);
  }

  async getRevenueStats(
    dateRange: { startDate: string; endDate: string },
    adminToken: string,
  ): Promise<NatsSuccessResponse<RevenueStatsResponse>> {
    this.logger.log('Fetching revenue statistics');
    return this.natsClient.send('payments.revenueStats', {
      dateRange,
      token: adminToken,
    }, NATS_TIMEOUTS.ANALYTICS);
  }

  // User Booking Management
  async getUserBookings(
    userId: string,
    page = 1,
    limit = 20,
    adminToken: string,
  ): Promise<NatsSuccessResponse<BookingListResponse>> {
    this.logger.log(`Fetching user bookings: ${userId}`);
    return this.natsClient.send('bookings.user', {
      userId,
      page,
      limit,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  // Game Booking Management
  async getGameBookings(
    gameId: string,
    date?: string,
    page = 1,
    limit = 20,
    adminToken?: string,
  ): Promise<NatsSuccessResponse<BookingListResponse>> {
    this.logger.log(`Fetching game bookings: ${gameId}`);
    const params: { gameId: string; page: number; limit: number; date?: string; token?: string } = {
      gameId,
      page,
      limit,
    };
    if (date) params.date = date;
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('bookings.game', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  // Dashboard Analytics
  async getDashboardStats(
    dateRange: { startDate: string; endDate: string },
    adminToken: string,
  ): Promise<NatsSuccessResponse<unknown>> {
    this.logger.log('Fetching dashboard statistics');
    return this.natsClient.send('dashboard.stats', {
      dateRange,
      token: adminToken,
    }, NATS_TIMEOUTS.ANALYTICS);
  }
}
