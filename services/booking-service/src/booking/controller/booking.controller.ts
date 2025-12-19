import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingService } from '../service/booking.service';
import {
  CreateBookingRequestDto,
  UpdateBookingDto,
  SearchBookingDto,
  BookingResponseDto
} from '../dto/booking.dto';
import { successResponse, errorResponse, paginationMeta } from '../../common/utils/response.util';

@Controller()
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly bookingService: BookingService) {}

  @MessagePattern('booking.create')
  async createBooking(@Payload() data: CreateBookingRequestDto) {
    try {
      this.logger.log(`NATS: Received booking.create request`);
      this.logger.debug(`NATS: booking.create data: ${JSON.stringify(data)}`);
      const booking = await this.bookingService.createBooking(data);
      this.logger.log(`NATS: Booking created with number: ${booking.bookingNumber}`);
      return successResponse(booking);
    } catch (error) {
      this.logger.error(`NATS: Error creating booking: ${error.message}`, error.stack);
      return errorResponse('BOOKING_CREATE_FAILED', error.message || 'Failed to create booking');
    }
  }

  @MessagePattern('booking.findById')
  async findBookingById(@Payload() data: { id: number }) {
    try {
      this.logger.log(`NATS: Received booking.findById request for ID: ${data.id}`);
      const booking = await this.bookingService.getBookingById(data.id);
      if (!booking) {
        return errorResponse('BOOKING_NOT_FOUND', 'Booking not found');
      }
      return successResponse(booking);
    } catch (error) {
      this.logger.error(`NATS: Error finding booking by ID: ${error.message}`, error.stack);
      return errorResponse('BOOKING_FIND_FAILED', error.message || 'Failed to find booking');
    }
  }

  @MessagePattern('booking.findByNumber')
  async findBookingByNumber(@Payload() data: { bookingNumber: string }) {
    try {
      this.logger.log(`NATS: Received booking.findByNumber request for: ${data.bookingNumber}`);
      const booking = await this.bookingService.getBookingByNumber(data.bookingNumber);
      if (!booking) {
        return errorResponse('BOOKING_NOT_FOUND', 'Booking not found');
      }
      return successResponse(booking);
    } catch (error) {
      this.logger.error(`NATS: Error finding booking by number: ${error.message}`, error.stack);
      return errorResponse('BOOKING_FIND_FAILED', error.message || 'Failed to find booking');
    }
  }

  @MessagePattern('booking.findByUserId')
  async findBookingsByUserId(@Payload() data: { userId: number }) {
    try {
      this.logger.log(`NATS: Received booking.findByUserId request for user: ${data.userId}`);
      const bookings = await this.bookingService.getBookingsByUserId(data.userId);
      return successResponse(bookings);
    } catch (error) {
      this.logger.error(`NATS: Error finding bookings by user ID: ${error.message}`, error.stack);
      return errorResponse('BOOKING_LIST_FAILED', error.message || 'Failed to find bookings');
    }
  }

  @MessagePattern('booking.search')
  async searchBookings(@Payload() data: SearchBookingDto) {
    try {
      this.logger.log(`NATS: Received booking.search request`);
      this.logger.debug(`NATS: booking.search data: ${JSON.stringify(data)}`);
      const result = await this.bookingService.searchBookings(data);
      this.logger.log(`NATS: Found ${result.total} bookings`);
      return successResponse({ bookings: result.bookings }, paginationMeta(result.total, result.page, result.limit));
    } catch (error) {
      this.logger.error(`NATS: Error searching bookings: ${error.message}`, error.stack);
      return errorResponse('BOOKING_SEARCH_FAILED', error.message || 'Failed to search bookings');
    }
  }

  @MessagePattern('booking.update')
  async updateBooking(@Payload() data: { id: number; dto: UpdateBookingDto }) {
    try {
      this.logger.log(`NATS: Received booking.update request for ID: ${data.id}`);
      const booking = await this.bookingService.updateBooking(data.id, data.dto);
      this.logger.log(`NATS: Booking updated for ID: ${booking.id}`);
      return successResponse(booking);
    } catch (error) {
      this.logger.error(`NATS: Error updating booking: ${error.message}`, error.stack);
      return errorResponse('BOOKING_UPDATE_FAILED', error.message || 'Failed to update booking');
    }
  }

  @MessagePattern('booking.cancel')
  async cancelBooking(@Payload() data: {
    id: number;
    userId: number;
    reason?: string;
  }) {
    try {
      this.logger.log(`NATS: Received booking.cancel request for ID: ${data.id}`);
      const booking = await this.bookingService.cancelBooking(data.id, data.userId, data.reason);
      this.logger.log(`NATS: Booking cancelled for ID: ${booking.id}`);
      return successResponse(booking);
    } catch (error) {
      this.logger.error(`NATS: Error cancelling booking: ${error.message}`, error.stack);
      return errorResponse('BOOKING_CANCEL_FAILED', error.message || 'Failed to cancel booking');
    }
  }

  @MessagePattern('booking.timeSlots.availability')
  async getTimeSlotAvailability(@Payload() data: {
    courseId: number;
    date: string;
  }) {
    try {
      this.logger.log(`NATS: Received timeSlots.availability request for course: ${data.courseId}, date: ${data.date}`);
      const slots = await this.bookingService.getTimeSlotAvailability(data.courseId, data.date);
      this.logger.log(`NATS: Found ${slots.length} time slots`);
      return successResponse(slots);
    } catch (error) {
      this.logger.error(`NATS: Error getting time slot availability: ${error.message}`, error.stack);
      return errorResponse('TIMESLOTS_FETCH_FAILED', error.message || 'Failed to get time slot availability');
    }
  }

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
  }) {
    try {
      this.logger.log(`NATS: Received course.sync request for course: ${data.courseId}`);
      await this.bookingService.syncCourseCache(data);
      this.logger.log(`NATS: Course cache synced for: ${data.courseId}`);
      return successResponse({ synced: true });
    } catch (error) {
      this.logger.error(`NATS: Error syncing course cache: ${error.message}`, error.stack);
      return errorResponse('COURSE_SYNC_FAILED', error.message || 'Failed to sync course cache');
    }
  }
}