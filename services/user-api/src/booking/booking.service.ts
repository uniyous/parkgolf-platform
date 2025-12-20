import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../shared/nats';
import {
  CreateBookingDto,
  SearchBookingDto,
  UpdateBookingDto,
} from './dto/booking.dto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async createBooking(userId: number, dto: CreateBookingDto) {
    this.logger.log(`Creating booking for user ${userId}`);

    const result = await this.natsClient.send<any>('booking.create', {
      userId,
      courseId: dto.courseId,
      bookingDate: dto.bookingDate,
      timeSlot: dto.timeSlot,
      playerCount: dto.playerCount,
      paymentMethod: dto.paymentMethod,
      specialRequests: dto.specialRequests,
      userEmail: dto.userEmail,
      userName: dto.userName,
      userPhone: dto.userPhone,
    });

    this.logger.log(`Booking created successfully: ${result.bookingNumber}`);
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

  async getTimeSlotAvailability(courseId: number, date: string) {
    return this.natsClient.send('booking.timeSlots.availability', { courseId, date }, NATS_TIMEOUTS.QUICK);
  }
}
