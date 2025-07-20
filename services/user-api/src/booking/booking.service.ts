import {
  Injectable,
  Logger,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  CreateBookingDto,
  SearchBookingDto,
  UpdateBookingDto,
} from './dto/booking.dto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
  ) {}

  async createBooking(userId: number, dto: CreateBookingDto) {
    try {
      this.logger.log(
        `Creating booking for user ${userId}: ${JSON.stringify(dto)}`,
      );

      const createBookingRequest = {
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
      };

      const result = await firstValueFrom(
        this.bookingClient
          .send('booking.create', createBookingRequest)
          .pipe(timeout(10000)),
      );

      this.logger.log(`Booking created successfully: ${result.bookingNumber}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create booking: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to create booking',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getBookingById(id: number) {
    try {
      this.logger.log(`Getting booking by ID: ${id}`);

      const result = await firstValueFrom(
        this.bookingClient.send('booking.findById', { id }).pipe(timeout(5000)),
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get booking by ID: ${error.message}`,
        error.stack,
      );
      throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
    }
  }

  async getBookingByNumber(bookingNumber: string) {
    try {
      this.logger.log(`Getting booking by number: ${bookingNumber}`);

      const result = await firstValueFrom(
        this.bookingClient
          .send('booking.findByNumber', { bookingNumber })
          .pipe(timeout(5000)),
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get booking by number: ${error.message}`,
        error.stack,
      );
      throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
    }
  }

  async getBookingsByUserId(userId: number) {
    try {
      this.logger.log(`Getting bookings for user: ${userId}`);

      const result = await firstValueFrom(
        this.bookingClient
          .send('booking.findByUserId', { userId })
          .pipe(timeout(5000)),
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get bookings by user ID: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to get user bookings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async searchBookings(searchDto: SearchBookingDto) {
    try {
      this.logger.log(`Searching bookings: ${JSON.stringify(searchDto)}`);

      const result = await firstValueFrom(
        this.bookingClient
          .send('booking.search', searchDto)
          .pipe(timeout(10000)),
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to search bookings: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to search bookings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateBooking(id: number, dto: UpdateBookingDto) {
    try {
      this.logger.log(`Updating booking ${id}: ${JSON.stringify(dto)}`);

      const result = await firstValueFrom(
        this.bookingClient
          .send('booking.update', { id, dto })
          .pipe(timeout(5000)),
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update booking: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to update booking',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async cancelBooking(id: number, userId: number, reason?: string) {
    try {
      this.logger.log(`Cancelling booking ${id} for user ${userId}`);

      const result = await firstValueFrom(
        this.bookingClient
          .send('booking.cancel', { id, userId, reason })
          .pipe(timeout(5000)),
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to cancel booking: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to cancel booking',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTimeSlotAvailability(courseId: number, date: string) {
    try {
      this.logger.log(
        `Getting time slot availability for course ${courseId} on ${date}`,
      );

      const result = await firstValueFrom(
        this.bookingClient
          .send('booking.timeSlots.availability', { courseId, date })
          .pipe(timeout(5000)),
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get time slot availability: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to get time slot availability',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
