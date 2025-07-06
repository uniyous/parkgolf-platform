import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingService } from '../service/booking.service';
import { CreateBookingRequestDto, BookingResponseDto } from '../dto/booking.dto';

@Controller()
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly bookingService: BookingService) {}

  @MessagePattern('booking.create')
  async createBooking(@Payload() data: CreateBookingRequestDto): Promise<BookingResponseDto> {
    try {
      this.logger.log(`NATS: Received booking.create request: ${JSON.stringify(data)}`);
      const booking = await this.bookingService.createBooking(data);
      const response = BookingResponseDto.fromEntity(booking);
      this.logger.log(`NATS: Booking created with ID: ${booking.id}`);
      return response;
    } catch (error) {
      this.logger.error(`NATS: Error creating booking: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('booking.findById')
  async findBookingById(@Payload() data: { id: number }): Promise<BookingResponseDto> {
    try {
      this.logger.log(`NATS: Received booking.findById request for ID: ${data.id}`);
      const booking = await this.bookingService.getBookingById(data.id);
      if (!booking) {
        throw new Error('Booking not found');
      }
      return BookingResponseDto.fromEntity(booking);
    } catch (error) {
      this.logger.error(`NATS: Error finding booking by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('booking.findByUserId')
  async findBookingsByUserId(@Payload() data: { userId: number }): Promise<BookingResponseDto[]> {
    try {
      this.logger.log(`NATS: Received booking.findByUserId request for user: ${data.userId}`);
      const bookings = await this.bookingService.getBookingsByUserId(data.userId);
      return bookings.map(booking => BookingResponseDto.fromEntity(booking));
    } catch (error) {
      this.logger.error(`NATS: Error finding bookings by user ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('booking.updateStatus')
  async updateBookingStatus(@Payload() data: { id: number; status: string }): Promise<BookingResponseDto> {
    try {
      this.logger.log(`NATS: Received booking.updateStatus request for ID: ${data.id}, status: ${data.status}`);
      const booking = await this.bookingService.updateBookingStatus(data.id, data.status);
      const response = BookingResponseDto.fromEntity(booking);
      this.logger.log(`NATS: Booking status updated for ID: ${booking.id}`);
      return response;
    } catch (error) {
      this.logger.error(`NATS: Error updating booking status: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('booking.cancel')
  async cancelBooking(@Payload() data: { id: number; reason?: string }): Promise<BookingResponseDto> {
    try {
      this.logger.log(`NATS: Received booking.cancel request for ID: ${data.id}`);
      const booking = await this.bookingService.cancelBooking(data.id, data.reason);
      const response = BookingResponseDto.fromEntity(booking);
      this.logger.log(`NATS: Booking cancelled for ID: ${booking.id}`);
      return response;
    } catch (error) {
      this.logger.error(`NATS: Error cancelling booking: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('booking.confirm')
  async confirmBooking(@Payload() data: { id: number }): Promise<BookingResponseDto> {
    try {
      this.logger.log(`NATS: Received booking.confirm request for ID: ${data.id}`);
      const booking = await this.bookingService.confirmBooking(data.id);
      const response = BookingResponseDto.fromEntity(booking);
      this.logger.log(`NATS: Booking confirmed for ID: ${booking.id}`);
      return response;
    } catch (error) {
      this.logger.error(`NATS: Error confirming booking: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('booking.getAll')
  async getAllBookings(@Payload() data: { 
    page?: number; 
    limit?: number; 
    status?: string;
    courseId?: number;
  }): Promise<{ bookings: BookingResponseDto[]; total: number; page: number; limit: number }> {
    try {
      this.logger.log(`NATS: Received booking.getAll request: ${JSON.stringify(data)}`);
      const result = await this.bookingService.getAllBookings(data);
      const response = {
        bookings: result.bookings.map(booking => BookingResponseDto.fromEntity(booking)),
        total: result.total,
        page: result.page,
        limit: result.limit
      };
      this.logger.log(`NATS: Retrieved ${result.bookings.length} bookings`);
      return response;
    } catch (error) {
      this.logger.error(`NATS: Error getting all bookings: ${error.message}`, error.stack);
      throw error;
    }
  }
}