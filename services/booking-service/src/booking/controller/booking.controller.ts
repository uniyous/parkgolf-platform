import { Controller, Logger, NotFoundException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingService } from '../service/booking.service';
import {
  CreateBookingRequestDto,
  UpdateBookingDto,
  SearchBookingDto,
} from '../dto/booking.dto';
import { NatsResponse } from '../../common/types/response.types';

@Controller()
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly bookingService: BookingService) {}

  @MessagePattern('booking.create')
  async createBooking(@Payload() data: CreateBookingRequestDto) {
    this.logger.log(`NATS: Received booking.create request`);
    this.logger.debug(`NATS: booking.create data: ${JSON.stringify(data)}`);
    const booking = await this.bookingService.createBooking(data);
    this.logger.log(`NATS: Booking created with number: ${booking.bookingNumber}`);
    return NatsResponse.success(booking);
  }

  @MessagePattern('booking.findById')
  async findBookingById(@Payload() data: { id: number }) {
    this.logger.log(`NATS: Received booking.findById request for ID: ${data.id}`);
    const booking = await this.bookingService.getBookingById(data.id);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return NatsResponse.success(booking);
  }

  @MessagePattern('booking.findByNumber')
  async findBookingByNumber(@Payload() data: { bookingNumber: string }) {
    this.logger.log(`NATS: Received booking.findByNumber request for: ${data.bookingNumber}`);
    const booking = await this.bookingService.getBookingByNumber(data.bookingNumber);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return NatsResponse.success(booking);
  }

  @MessagePattern('booking.findByUserId')
  async findBookingsByUserId(@Payload() data: { userId: number }) {
    this.logger.log(`NATS: Received booking.findByUserId request for user: ${data.userId}`);
    const bookings = await this.bookingService.getBookingsByUserId(data.userId);
    return NatsResponse.success(bookings);
  }

  @MessagePattern('booking.search')
  async searchBookings(@Payload() data: SearchBookingDto) {
    this.logger.log(`NATS: Received booking.search request`);
    this.logger.debug(`NATS: booking.search data: ${JSON.stringify(data)}`);
    const result = await this.bookingService.searchBookings(data);
    this.logger.log(`NATS: Found ${result.total} bookings`);
    return NatsResponse.paginated(result.bookings, result.total, result.page, result.limit);
  }

  @MessagePattern('booking.update')
  async updateBooking(@Payload() data: { id: number; dto: UpdateBookingDto }) {
    this.logger.log(`NATS: Received booking.update request for ID: ${data.id}`);
    const booking = await this.bookingService.updateBooking(data.id, data.dto);
    this.logger.log(`NATS: Booking updated for ID: ${booking.id}`);
    return NatsResponse.success(booking);
  }

  @MessagePattern('booking.cancel')
  async cancelBooking(@Payload() data: {
    id: number;
    userId: number;
    reason?: string;
  }) {
    this.logger.log(`NATS: Received booking.cancel request for ID: ${data.id}`);
    const booking = await this.bookingService.cancelBooking(data.id, data.userId, data.reason);
    this.logger.log(`NATS: Booking cancelled for ID: ${booking.id}`);
    return NatsResponse.success(booking);
  }

  @MessagePattern('booking.gameTimeSlots.availability')
  async getGameTimeSlotAvailability(@Payload() data: {
    gameId: number;
    date: string;
  }) {
    this.logger.log(`NATS: Received gameTimeSlots.availability request for game: ${data.gameId}, date: ${data.date}`);
    const slots = await this.bookingService.getGameTimeSlotAvailability(data.gameId, data.date);
    this.logger.log(`NATS: Found ${slots.length} game time slots`);
    return NatsResponse.success(slots);
  }

  @MessagePattern('booking.game.sync')
  async syncGameCache(@Payload() data: {
    gameId: number;
    name: string;
    code: string;
    description?: string;
    frontNineCourseId: number;
    frontNineCourseName: string;
    backNineCourseId: number;
    backNineCourseName: string;
    totalHoles: number;
    estimatedDuration: number;
    breakDuration: number;
    maxPlayers: number;
    basePrice: number;
    weekendPrice?: number;
    holidayPrice?: number;
    clubId: number;
    clubName: string;
    isActive: boolean;
  }) {
    this.logger.log(`NATS: Received game.sync request for game: ${data.gameId}`);
    await this.bookingService.syncGameCache(data);
    this.logger.log(`NATS: Game cache synced for: ${data.gameId}`);
    return NatsResponse.success({ synced: true });
  }

  @MessagePattern('booking.gameTimeSlot.sync')
  async syncGameTimeSlotCache(@Payload() data: {
    gameTimeSlotId: number;
    gameId: number;
    gameName?: string;
    gameCode?: string;
    frontNineCourseName?: string;
    backNineCourseName?: string;
    clubId?: number;
    clubName?: string;
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
  }) {
    this.logger.log(`NATS: Received gameTimeSlot.sync request for slot: ${data.gameTimeSlotId}`);
    await this.bookingService.syncGameTimeSlotCache(data);
    this.logger.log(`NATS: GameTimeSlot cache synced for: ${data.gameTimeSlotId}`);
    return NatsResponse.success({ synced: true });
  }
}