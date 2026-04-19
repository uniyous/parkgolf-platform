import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { ApiResponse, SagaMeta } from '../common/types';
import {
  CreateBookingDto,
  SearchBookingDto,
  UpdateBookingDto,
} from './dto/booking.dto';

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
  status: string;
  paymentMethod?: string;
  specialRequests?: string;
  notes?: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
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

/** TimeSlot 가용성 응답 타입 */
export interface TimeSlotAvailabilityDto {
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
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  /**
   * 예약 생성 (Saga Orchestrator)
   *
   * saga-service로 트랜잭션 위임 후, 성공 시 bookingId로 재조회하여 표준 BookingResponseDto shape로 반환.
   * 응답 구조: { success, data: BookingResponseDto, saga: SagaMeta }
   * 실패 시 BadRequestException → 표준 4xx 에러 응답.
   */
  async createBooking(userId: number, dto: CreateBookingDto): Promise<ApiResponse<BookingResponseDto>> {
    const idempotencyKey = dto.idempotencyKey || randomUUID();
    this.logger.log(`Creating booking for user ${userId} with idempotencyKey: ${idempotencyKey}`);

    const result = await this.natsClient.send<ApiResponse<Record<string, unknown>>>('saga.booking.create', {
      idempotencyKey,
      userId,
      gameId: dto.gameId,
      gameTimeSlotId: dto.gameTimeSlotId,
      bookingDate: dto.bookingDate,
      playerCount: dto.playerCount,
      paymentMethod: dto.paymentMethod,
      specialRequests: dto.specialRequests,
      userEmail: dto.userEmail,
      userName: dto.userName,
      userPhone: dto.userPhone,
    });

    return this.resolveSagaResponse(result, '예약 처리에 실패했습니다');
  }

  async getBookingById(id: number): Promise<ApiResponse<BookingResponseDto>> {
    return this.natsClient.send('booking.findById', { id }, NATS_TIMEOUTS.QUICK);
  }

  async getBookingByNumber(bookingNumber: string): Promise<ApiResponse<BookingResponseDto>> {
    return this.natsClient.send('booking.findByNumber', { bookingNumber }, NATS_TIMEOUTS.QUICK);
  }

  async getBookingsByUserId(userId: number): Promise<ApiResponse<BookingResponseDto[]>> {
    return this.natsClient.send('booking.findByUserId', { userId }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async searchBookings(searchDto: SearchBookingDto): Promise<ApiResponse<BookingListResponse>> {
    return this.natsClient.send('booking.search', searchDto, NATS_TIMEOUTS.LIST_QUERY);
  }

  async updateBooking(id: number, dto: UpdateBookingDto): Promise<ApiResponse<BookingResponseDto>> {
    return this.natsClient.send('booking.update', { id, dto }, NATS_TIMEOUTS.QUICK);
  }

  async cancelBooking(id: number, userId: number, reason?: string): Promise<ApiResponse<BookingResponseDto>> {
    const result = await this.natsClient.send<ApiResponse<Record<string, unknown>>>(
      'saga.booking.cancel',
      { id, userId, reason },
      NATS_TIMEOUTS.DEFAULT,
    );

    return this.resolveSagaResponse(result, '예약 취소에 실패했습니다');
  }

  /**
   * Saga 응답을 표준 BookingResponseDto 형태로 정규화.
   * - 성공: bookingId로 booking.findById 재조회 → {success, data, saga}
   * - 실패: BadRequestException (HTTP 400 + UnifiedExceptionFilter로 표준 에러 응답)
   */
  private async resolveSagaResponse(
    result: ApiResponse<Record<string, unknown>>,
    fallbackErrorMessage: string,
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

    // bookingId 추출 (data 내부에 있을 수도, legacy shape에 있을 수도)
    const payload = (result.data ?? {}) as Record<string, unknown>;
    const bookingId = (payload.bookingId as number) ?? (payload.id as number);

    if (!bookingId) {
      this.logger.error(`Saga success but bookingId missing in payload: ${JSON.stringify(payload).slice(0, 300)}`);
      throw new BadRequestException({
        code: 'SAGA_RESPONSE_INVALID',
        message: 'Saga 응답에서 예약 ID를 찾을 수 없습니다',
        saga: sagaMeta,
      });
    }

    // 표준 shape로 재조회
    const refetch = await this.natsClient.send<ApiResponse<BookingResponseDto>>(
      'booking.findById',
      { id: bookingId },
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

    this.logger.log(`Booking ${refetch.data.bookingNumber} (status: ${refetch.data.status}) returned with saga meta`);

    return {
      success: true,
      data: refetch.data,
      saga: sagaMeta,
    };
  }

  async getTimeSlotAvailability(gameId: number, date: string): Promise<ApiResponse<TimeSlotAvailabilityDto[]>> {
    return this.natsClient.send('booking.gameTimeSlots.availability', { gameId, date }, NATS_TIMEOUTS.QUICK);
  }
}
