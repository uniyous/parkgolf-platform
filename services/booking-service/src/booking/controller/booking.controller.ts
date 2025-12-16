import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingService } from '../service/booking.service';
import { 
  CreateBookingRequestDto, 
  UpdateBookingDto,
  SearchBookingDto,
  BookingResponseDto 
} from '../dto/booking.dto';

@Controller()
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly bookingService: BookingService) {}

  @MessagePattern('booking.create')
  async createBooking(@Payload() data: CreateBookingRequestDto): Promise<BookingResponseDto> {
    try {
      this.logger.log(`NATS: Received booking.create request: ${JSON.stringify(data)}`);
      const booking = await this.bookingService.createBooking(data);
      this.logger.log(`NATS: Booking created with number: ${booking.bookingNumber}`);
      return booking;
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
      return booking;
    } catch (error) {
      this.logger.error(`NATS: Error finding booking by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('booking.findByNumber')
  async findBookingByNumber(@Payload() data: { bookingNumber: string }): Promise<BookingResponseDto> {
    try {
      this.logger.log(`NATS: Received booking.findByNumber request for: ${data.bookingNumber}`);
      const booking = await this.bookingService.getBookingByNumber(data.bookingNumber);
      if (!booking) {
        throw new Error('Booking not found');
      }
      return booking;
    } catch (error) {
      this.logger.error(`NATS: Error finding booking by number: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('booking.findByUserId')
  async findBookingsByUserId(@Payload() data: { userId: number }): Promise<BookingResponseDto[]> {
    try {
      this.logger.log(`NATS: Received booking.findByUserId request for user: ${data.userId}`);
      const bookings = await this.bookingService.getBookingsByUserId(data.userId);
      return bookings;
    } catch (error) {
      this.logger.error(`NATS: Error finding bookings by user ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('booking.search')
  async searchBookings(@Payload() data: SearchBookingDto): Promise<{
    bookings: BookingResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      this.logger.log(`NATS: Received booking.search request: ${JSON.stringify(data)}`);
      const result = await this.bookingService.searchBookings(data);
      this.logger.log(`NATS: Found ${result.total} bookings`);
      return result;
    } catch (error) {
      this.logger.error(`NATS: Error searching bookings: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('booking.update')
  async updateBooking(@Payload() data: { id: number; dto: UpdateBookingDto }): Promise<BookingResponseDto> {
    try {
      this.logger.log(`NATS: Received booking.update request for ID: ${data.id}`);
      const booking = await this.bookingService.updateBooking(data.id, data.dto);
      this.logger.log(`NATS: Booking updated for ID: ${booking.id}`);
      return booking;
    } catch (error) {
      this.logger.error(`NATS: Error updating booking: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('booking.cancel')
  async cancelBooking(@Payload() data: { 
    id: number; 
    userId: number;
    reason?: string 
  }): Promise<BookingResponseDto> {
    try {
      this.logger.log(`NATS: Received booking.cancel request for ID: ${data.id}`);
      const booking = await this.bookingService.cancelBooking(data.id, data.userId, data.reason);
      this.logger.log(`NATS: Booking cancelled for ID: ${booking.id}`);
      return booking;
    } catch (error) {
      this.logger.error(`NATS: Error cancelling booking: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('booking.timeSlots.availability')
  async getTimeSlotAvailability(@Payload() data: { 
    courseId: number;
    date: string;
  }): Promise<any[]> {
    try {
      this.logger.log(`NATS: Received timeSlots.availability request for course: ${data.courseId}, date: ${data.date}`);
      const slots = await this.bookingService.getTimeSlotAvailability(data.courseId, data.date);
      this.logger.log(`NATS: Found ${slots.length} time slots`);
      return slots;
    } catch (error) {
      this.logger.error(`NATS: Error getting time slot availability: ${error.message}`, error.stack);
      throw error;
    }
  }

  // 코스 캐시 업데이트 (course-service에서 호출)
  @MessagePattern('booking.course.sync')
  async syncCourseCache(@Payload() data: {
    courseId: number;
    name: string;
    location: string;
    description?: string;
    rating: number;
    pricePerHour: number;
    imageUrl?: string;
    amenities: string[];
    openTime: string;
    closeTime: string;
    isActive: boolean;
  }): Promise<{ success: boolean }> {
    try {
      this.logger.log(`NATS: Received course.sync request for course: ${data.courseId}`);
      
      await this.bookingService.syncCourseCache(data);
      
      this.logger.log(`NATS: Course cache synced for: ${data.courseId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`NATS: Error syncing course cache: ${error.message}`, error.stack);
      throw error;
    }
  }
}