import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { NatsClientService } from '../shared/nats';
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
    try {
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
      }, 10000);

      this.logger.log(`Booking created successfully: ${result.bookingNumber}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create booking: ${error.message}`);
      throw new HttpException('Failed to create booking', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getBookingById(id: number) {
    try {
      return await this.natsClient.send('booking.findById', { id }, 5000);
    } catch (error) {
      this.logger.error(`Failed to get booking by ID: ${error.message}`);
      throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
    }
  }

  async getBookingByNumber(bookingNumber: string) {
    try {
      return await this.natsClient.send('booking.findByNumber', { bookingNumber }, 5000);
    } catch (error) {
      this.logger.error(`Failed to get booking by number: ${error.message}`);
      throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
    }
  }

  async getBookingsByUserId(userId: number) {
    try {
      return await this.natsClient.send('booking.findByUserId', { userId }, 5000);
    } catch (error) {
      this.logger.error(`Failed to get bookings by user ID: ${error.message}`);
      throw new HttpException('Failed to get user bookings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async searchBookings(searchDto: SearchBookingDto) {
    try {
      return await this.natsClient.send('booking.search', searchDto, 10000);
    } catch (error) {
      this.logger.error(`Failed to search bookings: ${error.message}`);
      throw new HttpException('Failed to search bookings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateBooking(id: number, dto: UpdateBookingDto) {
    try {
      return await this.natsClient.send('booking.update', { id, dto }, 5000);
    } catch (error) {
      this.logger.error(`Failed to update booking: ${error.message}`);
      throw new HttpException('Failed to update booking', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async cancelBooking(id: number, userId: number, reason?: string) {
    try {
      return await this.natsClient.send('booking.cancel', { id, userId, reason }, 5000);
    } catch (error) {
      this.logger.error(`Failed to cancel booking: ${error.message}`);
      throw new HttpException('Failed to cancel booking', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getTimeSlotAvailability(courseId: number, date: string) {
    try {
      return await this.natsClient.send('booking.timeSlots.availability', { courseId, date }, 5000);
    } catch (error) {
      this.logger.error(`Failed to get time slot availability: ${error.message}`);
      throw new HttpException('Failed to get time slot availability', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
