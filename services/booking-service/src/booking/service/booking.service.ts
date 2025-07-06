import { Injectable, HttpException, HttpStatus, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Booking, BookingStatus } from '@prisma/client';
import { CreateBookingRequestDto, BookingConfirmedEvent } from '../dto/booking.dto';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationPublisher: ClientProxy,
  ) {}

  async createBooking(dto: CreateBookingRequestDto): Promise<Booking> {
    try {
      const booking = await this.prisma.booking.create({
        data: {
          userId: dto.userId,
          courseId: dto.courseId,
          bookingDate: new Date(dto.bookingDate),
          timeSlot: dto.timeSlot,
          playerCount: dto.playerCount,
          totalPrice: dto.totalPrice,
          notes: dto.notes,
          status: BookingStatus.PENDING,
        },
      });

      this.logger.log(`Booking ${booking.id} created successfully.`);

      // 예약 확정 이벤트 발행
      const eventPayload: BookingConfirmedEvent = {
        bookingId: booking.id,
        userId: booking.userId,
        courseId: booking.courseId,
        bookingDate: booking.bookingDate.toISOString(),
        timeSlot: booking.timeSlot,
        playerCount: booking.playerCount,
        totalPrice: Number(booking.totalPrice),
      };

      this.notificationPublisher.emit('booking.confirmed', eventPayload);
      this.logger.log(`'booking.confirmed' event emitted for booking ${booking.id}`);

      return booking;
    } catch (error) {
      this.logger.error(`Failed to create booking: ${error.message}`);
      throw new HttpException('Failed to create booking.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getBookingById(id: number): Promise<Booking | null> {
    return this.prisma.booking.findUnique({ where: { id } });
  }

  async getBookingsByUserId(userId: number): Promise<Booking[]> {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllBookings(options: {
    page?: number;
    limit?: number;
    status?: string;
    courseId?: number;
  } = {}): Promise<{ bookings: Booking[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, status, courseId } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status as BookingStatus;
    }
    if (courseId) {
      where.courseId = courseId;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { bookings, total, page, limit };
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking> {
    const booking = await this.prisma.booking.update({
      where: { id },
      data: { status: status as BookingStatus },
    });

    // 상태 변경 이벤트 발행
    this.notificationPublisher.emit('booking.status.updated', {
      bookingId: booking.id,
      userId: booking.userId,
      oldStatus: status,
      newStatus: booking.status,
      updatedAt: booking.updatedAt.toISOString(),
    });
    this.logger.log(`'booking.status.updated' event emitted for booking ${booking.id}`);

    return booking;
  }

  async cancelBooking(id: number, reason?: string): Promise<Booking> {
    const booking = await this.prisma.booking.update({
      where: { id },
      data: { 
        status: BookingStatus.CANCELLED,
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled'
      },
    });

    // 예약 취소 이벤트 발행
    this.notificationPublisher.emit('booking.cancelled', {
      bookingId: booking.id,
      userId: booking.userId,
      courseId: booking.courseId,
      bookingDate: booking.bookingDate.toISOString(),
      timeSlot: booking.timeSlot,
      reason: reason || 'No reason provided',
      cancelledAt: new Date().toISOString(),
    });
    this.logger.log(`'booking.cancelled' event emitted for booking ${booking.id}`);

    return booking;
  }

  async confirmBooking(id: number): Promise<Booking> {
    const booking = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CONFIRMED },
    });

    // 예약 확정 이벤트 발행 (재확정 시)
    this.notificationPublisher.emit('booking.confirmed', {
      bookingId: booking.id,
      userId: booking.userId,
      courseId: booking.courseId,
      bookingDate: booking.bookingDate.toISOString(),
      timeSlot: booking.timeSlot,
      playerCount: booking.playerCount,
      totalPrice: Number(booking.totalPrice),
      confirmedAt: new Date().toISOString(),
    });
    this.logger.log(`'booking.confirmed' event emitted for booking ${booking.id}`);

    return booking;
  }
}