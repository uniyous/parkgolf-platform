import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import {
  CreateBookingDto,
  SearchBookingDto,
  UpdateBookingDto,
} from './dto/booking.dto';

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
  async createBooking(userId: number, dto: CreateBookingDto) {
    // 멱등성 키 생성 (클라이언트가 제공하지 않은 경우 서버에서 생성)
    const idempotencyKey = dto.idempotencyKey || randomUUID();
    this.logger.log(`Creating booking for user ${userId} with idempotencyKey: ${idempotencyKey}`);

    const result = await this.natsClient.send<any>('booking.create', {
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

    this.logger.log(`Booking request submitted: ${result.bookingNumber} (status: ${result.status})`);
    return result;
  }

  async getBookingById(id: number) {
    return this.natsClient.send('booking.findById', { id }, NATS_TIMEOUTS.QUICK);
  }

  async getBookingByNumber(bookingNumber: string) {
    return this.natsClient.send('booking.findByNumber', { bookingNumber }, NATS_TIMEOUTS.QUICK);
  }

  async getBookingsByUserId(userId: number) {
    return this.natsClient.send('booking.findByUserId', { userId }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async searchBookings(searchDto: SearchBookingDto) {
    return this.natsClient.send('booking.search', searchDto, NATS_TIMEOUTS.LIST_QUERY);
  }

  async updateBooking(id: number, dto: UpdateBookingDto) {
    return this.natsClient.send('booking.update', { id, dto }, NATS_TIMEOUTS.QUICK);
  }

  async cancelBooking(id: number, userId: number, reason?: string) {
    return this.natsClient.send('booking.cancel', { id, userId, reason }, NATS_TIMEOUTS.QUICK);
  }

  async getTimeSlotAvailability(gameId: number, date: string) {
    return this.natsClient.send('booking.gameTimeSlots.availability', { gameId, date }, NATS_TIMEOUTS.QUICK);
  }
}
