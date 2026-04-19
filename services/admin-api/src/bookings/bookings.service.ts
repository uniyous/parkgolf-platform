import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { ApiResponse, SagaMeta } from '../common/types';
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
  ): Promise<ApiResponse<BookingListResponse>> {
    this.logger.log('Fetching bookings');
    return this.natsClient.send('bookings.list', {
      filters,
      page,
      limit,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getBookingById(bookingId: string, adminToken: string): Promise<ApiResponse<BookingResponseDto>> {
    this.logger.log(`Fetching booking: ${bookingId}`);
    return this.natsClient.send('bookings.findById', {
      bookingId,
      token: adminToken,
    }, NATS_TIMEOUTS.QUICK);
  }

  async createBooking(bookingData: CreateBookingDto, adminToken: string): Promise<ApiResponse<BookingResponseDto>> {
    this.logger.log('Creating booking via saga');
    const result = await this.natsClient.send<ApiResponse<Record<string, unknown>>>('saga.booking.create', {
      ...bookingData,
      token: adminToken,
    });
    return this.resolveSagaBookingResponse(result, '예약 생성에 실패했습니다', adminToken);
  }

  async updateBooking(
    bookingId: string,
    updateData: UpdateBookingDto,
    adminToken: string,
  ): Promise<ApiResponse<BookingResponseDto>> {
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
  ): Promise<ApiResponse<BookingResponseDto>> {
    this.logger.log(`Cancelling booking: ${bookingId}`);
    const params: { bookingId: string; reason?: string; token?: string } = { bookingId };
    if (reason) params.reason = reason;
    if (adminToken) params.token = adminToken;
    const result = await this.natsClient.send<ApiResponse<Record<string, unknown>>>('saga.booking.cancel', params);
    return this.resolveSagaBookingResponse(result, '예약 취소에 실패했습니다', adminToken);
  }

  async confirmBooking(bookingId: string, adminToken: string): Promise<ApiResponse<BookingResponseDto>> {
    this.logger.log(`Confirming booking: ${bookingId}`);
    return this.natsClient.send('bookings.confirm', {
      bookingId,
      token: adminToken,
    });
  }

  async completeBooking(bookingId: string, adminToken: string): Promise<ApiResponse<BookingResponseDto>> {
    this.logger.log(`Completing booking: ${bookingId}`);
    return this.natsClient.send('bookings.complete', {
      bookingId,
      token: adminToken,
    });
  }

  async markNoShow(bookingId: string, adminToken: string): Promise<ApiResponse<BookingResponseDto>> {
    this.logger.log(`Marking no-show: ${bookingId}`);
    return this.natsClient.send('bookings.noShow', {
      bookingId,
      token: adminToken,
    });
  }

  // Club Operation Stats
  async getClubOperationStats(
    clubId: number,
    dateRange: { startDate: string; endDate: string },
    adminToken: string,
  ): Promise<ApiResponse<unknown>> {
    this.logger.log(`Fetching club operation stats for clubId: ${clubId}`);
    return this.natsClient.send('bookings.clubOperationStats', {
      clubId,
      dateRange,
      token: adminToken,
    }, NATS_TIMEOUTS.ANALYTICS);
  }

  // Payment Management
  async getPayments(
    filters: Record<string, unknown> = {},
    page = 1,
    limit = 20,
    adminToken: string,
  ): Promise<ApiResponse<PaymentListResponse>> {
    this.logger.log('Fetching payments');
    return this.natsClient.send('payments.list', {
      filters,
      page,
      limit,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getPaymentById(paymentId: string, adminToken: string): Promise<ApiResponse<PaymentResponseDto>> {
    this.logger.log(`Fetching payment: ${paymentId}`);
    return this.natsClient.send('payments.findById', {
      paymentId,
      token: adminToken,
    }, NATS_TIMEOUTS.QUICK);
  }

  async processRefund(
    bookingId: string,
    refundData: { cancelAmount?: number; cancelReason: string; adminNote?: string },
    adminToken: string,
  ): Promise<ApiResponse<PaymentResponseDto>> {
    this.logger.log(`Processing refund for booking: ${bookingId}`);
    const result = await this.natsClient.send<ApiResponse<Record<string, unknown>>>(
      'saga.booking.adminRefund',
      {
        bookingId: parseInt(bookingId, 10),
        cancelAmount: refundData.cancelAmount,
        cancelReason: refundData.cancelReason,
        token: adminToken,
      },
      NATS_TIMEOUTS.LIST_QUERY,
    );

    const sagaMeta = result.saga;
    if (sagaMeta && (sagaMeta.status === 'FAILED' || sagaMeta.status === 'REQUIRES_MANUAL')) {
      throw new BadRequestException({
        code: 'SAGA_FAILED',
        message: sagaMeta.failReason || '환불 처리에 실패했습니다',
        saga: sagaMeta,
      });
    }

    // 환불 saga는 payment 결과가 관심이므로 현재 payload를 그대로 반환하되 saga 메타 포함
    return {
      success: true,
      data: (result.data as unknown as PaymentResponseDto) ?? ({} as PaymentResponseDto),
      saga: sagaMeta,
    };
  }

  /**
   * Saga 응답을 표준 BookingResponseDto 형태로 정규화.
   * - 성공: bookingId로 booking.findById 재조회 → {success, data, saga}
   * - 실패: BadRequestException → UnifiedExceptionFilter가 4xx 표준 에러로 변환
   */
  private async resolveSagaBookingResponse(
    result: ApiResponse<Record<string, unknown>>,
    fallbackErrorMessage: string,
    adminToken?: string,
  ): Promise<ApiResponse<BookingResponseDto>> {
    const sagaMeta = result.saga;
    const sagaStatus = sagaMeta?.status;
    const isFailure = sagaStatus === 'FAILED' || sagaStatus === 'COMPENSATED' || sagaStatus === 'REQUIRES_MANUAL';

    if (isFailure) {
      const failReason = sagaMeta?.failReason || fallbackErrorMessage;
      this.logger.warn(`Booking saga ${sagaStatus}: ${failReason}`);
      throw new BadRequestException({
        code: 'SAGA_FAILED',
        message: failReason,
        saga: sagaMeta,
      });
    }

    const payload = (result.data ?? {}) as Record<string, unknown>;
    const bookingId = (payload.bookingId as number) ?? (payload.id as number);

    if (!bookingId) {
      this.logger.error(`Saga success but bookingId missing: ${JSON.stringify(payload).slice(0, 300)}`);
      throw new BadRequestException({
        code: 'SAGA_RESPONSE_INVALID',
        message: 'Saga 응답에서 예약 ID를 찾을 수 없습니다',
        saga: sagaMeta,
      });
    }

    const refetch = await this.natsClient.send<ApiResponse<BookingResponseDto>>(
      'bookings.findById',
      { bookingId: String(bookingId), token: adminToken },
      NATS_TIMEOUTS.QUICK,
    );

    if (!refetch?.success || !refetch.data) {
      this.logger.error(`Failed to refetch booking ${bookingId} after saga success`);
      throw new BadRequestException({
        code: 'BOOKING_REFETCH_FAILED',
        message: '예약 정보 조회에 실패했습니다',
        saga: sagaMeta,
      });
    }

    return {
      success: true,
      data: refetch.data,
      saga: sagaMeta,
    };
  }

  // Booking History and Analytics
  async getBookingHistory(
    filters: Record<string, unknown> = {},
    page = 1,
    limit = 20,
    adminToken: string,
  ): Promise<ApiResponse<BookingListResponse>> {
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
  ): Promise<ApiResponse<BookingStatsResponse>> {
    this.logger.log('Fetching booking statistics');
    return this.natsClient.send('bookings.stats', {
      dateRange,
      token: adminToken,
    }, NATS_TIMEOUTS.ANALYTICS);
  }

  async getRevenueStats(
    dateRange: { startDate: string; endDate: string },
    adminToken: string,
  ): Promise<ApiResponse<RevenueStatsResponse>> {
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
  ): Promise<ApiResponse<BookingListResponse>> {
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
  ): Promise<ApiResponse<BookingListResponse>> {
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
  ): Promise<ApiResponse<unknown>> {
    this.logger.log('Fetching dashboard statistics');
    return this.natsClient.send('dashboard.stats', {
      dateRange,
      token: adminToken,
    }, NATS_TIMEOUTS.ANALYTICS);
  }
}
