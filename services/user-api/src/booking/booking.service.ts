import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { ApiResponse } from '../common/types';
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
   * 예약 생성 (Saga 패턴)
   *
   * 멱등성 키를 생성하여 booking-service로 전달
   * booking-service에서 PENDING 상태로 예약이 생성되고,
   * 백그라운드에서 course-service와의 Saga가 진행됨
   */
  async createBooking(userId: number, dto: CreateBookingDto): Promise<ApiResponse<BookingResponseDto>> {
    // 멱등성 키 생성 (클라이언트가 제공하지 않은 경우 서버에서 생성)
    const idempotencyKey = dto.idempotencyKey || randomUUID();
    this.logger.log(`Creating booking for user ${userId} with idempotencyKey: ${idempotencyKey}`);

    const result = await this.natsClient.send<ApiResponse<BookingResponseDto>>('booking.create', {
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

    if (result.success && result.data) {
      this.logger.log(`Booking request submitted: ${result.data.bookingNumber} (status: ${result.data.status})`);
    }
    return result;
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
    return this.natsClient.send('booking.cancel', { id, userId, reason }, NATS_TIMEOUTS.QUICK);
  }

  async getTimeSlotAvailability(gameId: number, date: string): Promise<ApiResponse<TimeSlotAvailabilityDto[]>> {
    return this.natsClient.send('booking.gameTimeSlots.availability', { gameId, date }, NATS_TIMEOUTS.QUICK);
  }
}
