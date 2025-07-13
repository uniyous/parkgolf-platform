import { Injectable, HttpException, HttpStatus, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Booking, BookingStatus, BookingHistory } from '@prisma/client';
import { 
  CreateBookingRequestDto, 
  UpdateBookingDto,
  BookingResponseDto,
  SearchBookingDto,
  BookingConfirmedEvent 
} from '../dto/booking.dto';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationPublisher: ClientProxy,
  ) {}

  // 예약번호 생성 함수
  private generateBookingNumber(): string {
    const now = Date.now();
    return `BK${now.toString().slice(-8)}`;
  }

  async createBooking(dto: CreateBookingRequestDto): Promise<BookingResponseDto> {
    try {
      // 1. 타임슬롯 가용성 확인
      const availability = await this.checkTimeSlotAvailability(
        dto.courseId,
        dto.bookingDate,
        dto.timeSlot,
        dto.playerCount
      );

      if (!availability.available) {
        throw new HttpException(
          'Selected time slot is not available',
          HttpStatus.BAD_REQUEST
        );
      }

      // 2. 코스 정보 가져오기 (캐시에서)
      const courseInfo = await this.prisma.courseCache.findUnique({
        where: { courseId: dto.courseId }
      });

      if (!courseInfo) {
        throw new HttpException(
          'Course information not found',
          HttpStatus.NOT_FOUND
        );
      }

      // 3. 가격 계산
      const pricePerPerson = Number(availability.price);
      const totalAmount = pricePerPerson * dto.playerCount;
      const serviceFee = Math.floor(totalAmount * 0.03); // 3% 서비스 수수료
      const totalPrice = totalAmount + serviceFee;

      // 4. 예약 생성
      const booking = await this.prisma.$transaction(async (prisma) => {
        // 예약 생성
        const newBooking = await prisma.booking.create({
          data: {
            userId: dto.userId,
            courseId: dto.courseId,
            courseName: courseInfo.name,
            courseLocation: courseInfo.location,
            bookingDate: new Date(dto.bookingDate),
            timeSlot: dto.timeSlot,
            playerCount: dto.playerCount,
            pricePerPerson,
            serviceFee,
            totalPrice,
            status: BookingStatus.CONFIRMED,
            paymentMethod: dto.paymentMethod,
            specialRequests: dto.specialRequests,
            bookingNumber: this.generateBookingNumber(),
            userEmail: dto.userEmail,
            userName: dto.userName,
            userPhone: dto.userPhone,
          },
        });

        // 타임슬롯 업데이트
        await prisma.timeSlotAvailability.update({
          where: {
            courseId_date_timeSlot: {
              courseId: dto.courseId,
              date: new Date(dto.bookingDate),
              timeSlot: dto.timeSlot
            }
          },
          data: {
            booked: {
              increment: dto.playerCount
            },
            isAvailable: availability.remaining - dto.playerCount > 0
          }
        });

        // 예약 히스토리 생성
        await prisma.bookingHistory.create({
          data: {
            bookingId: newBooking.id,
            action: 'CREATED',
            userId: dto.userId,
            details: {
              playerCount: dto.playerCount,
              totalPrice: totalPrice.toString(),
              paymentMethod: dto.paymentMethod
            }
          }
        });

        return newBooking;
      });

      this.logger.log(`Booking ${booking.bookingNumber} created successfully.`);

      // 5. 예약 확정 이벤트 발행
      const eventPayload: BookingConfirmedEvent = {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        userId: booking.userId,
        courseId: booking.courseId,
        courseName: booking.courseName,
        bookingDate: booking.bookingDate.toISOString(),
        timeSlot: booking.timeSlot,
        playerCount: booking.playerCount,
        totalPrice: Number(booking.totalPrice),
        userEmail: booking.userEmail,
        userName: booking.userName,
      };

      this.notificationPublisher.emit('booking.confirmed', eventPayload);
      this.logger.log(`'booking.confirmed' event emitted for booking ${booking.bookingNumber}`);

      return this.toResponseDto(booking);
    } catch (error) {
      this.logger.error(`Failed to create booking: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to create booking.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getBookingById(id: number): Promise<BookingResponseDto | null> {
    const booking = await this.prisma.booking.findUnique({ 
      where: { id },
      include: {
        payments: true,
        histories: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    return booking ? this.toResponseDto(booking) : null;
  }

  async getBookingByNumber(bookingNumber: string): Promise<BookingResponseDto | null> {
    const booking = await this.prisma.booking.findUnique({ 
      where: { bookingNumber },
      include: {
        payments: true,
        histories: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    return booking ? this.toResponseDto(booking) : null;
  }

  async getBookingsByUserId(userId: number): Promise<BookingResponseDto[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        payments: true
      }
    });
    
    return bookings.map(booking => this.toResponseDto(booking));
  }

  async searchBookings(searchDto: SearchBookingDto): Promise<{
    bookings: BookingResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, status, courseId, userId, startDate, endDate } = searchDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status as BookingStatus;
    }
    if (courseId) {
      where.courseId = courseId;
    }
    if (userId) {
      where.userId = userId;
    }
    if (startDate || endDate) {
      where.bookingDate = {};
      if (startDate) {
        where.bookingDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.bookingDate.lte = new Date(endDate);
      }
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          payments: true
        }
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { 
      bookings: bookings.map(booking => this.toResponseDto(booking)), 
      total, 
      page, 
      limit 
    };
  }

  async updateBooking(id: number, dto: UpdateBookingDto): Promise<BookingResponseDto> {
    const booking = await this.prisma.$transaction(async (prisma) => {
      const existingBooking = await prisma.booking.findUnique({
        where: { id }
      });

      if (!existingBooking) {
        throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
      }

      // 변경 가능한 상태인지 확인
      if (existingBooking.status === BookingStatus.CANCELLED || 
          existingBooking.status === BookingStatus.COMPLETED) {
        throw new HttpException(
          'Cannot update cancelled or completed booking',
          HttpStatus.BAD_REQUEST
        );
      }

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          playerCount: dto.playerCount,
          specialRequests: dto.specialRequests,
          userPhone: dto.userPhone,
        },
      });

      // 히스토리 추가
      await prisma.bookingHistory.create({
        data: {
          bookingId: id,
          action: 'UPDATED',
          userId: existingBooking.userId,
          details: JSON.parse(JSON.stringify(dto))
        }
      });

      return updatedBooking;
    });

    return this.toResponseDto(booking);
  }

  async cancelBooking(id: number, userId: number, reason?: string): Promise<BookingResponseDto> {
    const booking = await this.prisma.$transaction(async (prisma) => {
      const existingBooking = await prisma.booking.findUnique({
        where: { id }
      });

      if (!existingBooking) {
        throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
      }

      // 권한 확인
      if (existingBooking.userId !== userId) {
        throw new HttpException('Unauthorized to cancel this booking', HttpStatus.FORBIDDEN);
      }

      // 취소 가능한 상태인지 확인
      if (existingBooking.status === BookingStatus.CANCELLED) {
        throw new HttpException('Booking is already cancelled', HttpStatus.BAD_REQUEST);
      }

      // 예약일 3일 전까지만 취소 가능
      const bookingDate = new Date(existingBooking.bookingDate);
      const threeDaysBefore = new Date();
      threeDaysBefore.setDate(threeDaysBefore.getDate() + 3);
      
      if (bookingDate < threeDaysBefore) {
        throw new HttpException(
          'Cannot cancel booking less than 3 days before the booking date',
          HttpStatus.BAD_REQUEST
        );
      }

      // 예약 취소
      const cancelledBooking = await prisma.booking.update({
        where: { id },
        data: { 
          status: BookingStatus.CANCELLED,
        },
      });

      // 타임슬롯 가용성 복구
      await prisma.timeSlotAvailability.update({
        where: {
          courseId_date_timeSlot: {
            courseId: existingBooking.courseId,
            date: existingBooking.bookingDate,
            timeSlot: existingBooking.timeSlot
          }
        },
        data: {
          booked: {
            decrement: existingBooking.playerCount
          },
          isAvailable: true
        }
      });

      // 히스토리 추가
      await prisma.bookingHistory.create({
        data: {
          bookingId: id,
          action: 'CANCELLED',
          userId: userId,
          details: {
            reason: reason || 'User requested cancellation'
          }
        }
      });

      return cancelledBooking;
    });

    // 예약 취소 이벤트 발행
    this.notificationPublisher.emit('booking.cancelled', {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      userId: booking.userId,
      courseId: booking.courseId,
      courseName: booking.courseName,
      bookingDate: booking.bookingDate.toISOString(),
      timeSlot: booking.timeSlot,
      reason: reason || 'No reason provided',
      cancelledAt: new Date().toISOString(),
      userEmail: booking.userEmail,
      userName: booking.userName,
    });
    this.logger.log(`'booking.cancelled' event emitted for booking ${booking.bookingNumber}`);

    return this.toResponseDto(booking);
  }

  // 타임슬롯 가용성 조회
  async getTimeSlotAvailability(
    courseId: number,
    date: string
  ): Promise<any[]> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const slots = await this.prisma.timeSlotAvailability.findMany({
      where: {
        courseId,
        date: targetDate
      },
      orderBy: {
        timeSlot: 'asc'
      }
    });

    // 슬롯이 없으면 생성
    if (slots.length === 0) {
      return this.generateDefaultTimeSlots(courseId, targetDate);
    }

    return slots.map(slot => ({
      id: slot.id,
      time: slot.timeSlot,
      date: slot.date.toISOString().split('T')[0],
      available: slot.isAvailable,
      price: Number(slot.price),
      isPremium: slot.isPremium,
      remaining: slot.maxCapacity - slot.booked
    }));
  }

  // 프라이빗 헬퍼 메서드들
  private async checkTimeSlotAvailability(
    courseId: number,
    date: string,
    timeSlot: string,
    playerCount: number
  ): Promise<{available: boolean; price: number; remaining: number}> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    let slot = await this.prisma.timeSlotAvailability.findUnique({
      where: {
        courseId_date_timeSlot: {
          courseId,
          date: targetDate,
          timeSlot
        }
      }
    });

    // 슬롯이 없으면 기본 슬롯 생성
    if (!slot) {
      const defaultSlots = await this.generateDefaultTimeSlots(courseId, targetDate);
      slot = defaultSlots.find(s => s.timeSlot === timeSlot);
      
      if (!slot) {
        return { available: false, price: 0, remaining: 0 };
      }
    }

    const remaining = slot.maxCapacity - slot.booked;
    const available = slot.isAvailable && remaining >= playerCount;

    return {
      available,
      price: Number(slot.price),
      remaining
    };
  }

  private async generateDefaultTimeSlots(
    courseId: number,
    date: Date
  ): Promise<any[]> {
    const course = await this.prisma.courseCache.findUnique({
      where: { courseId }
    });

    if (!course) {
      return [];
    }

    const slots = [];
    const startHour = parseInt(course.openTime.split(':')[0]);
    const endHour = parseInt(course.closeTime.split(':')[0]);
    const basePrice = Number(course.pricePerHour);

    for (let hour = startHour; hour < endHour; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      const isPremium = hour >= 12 && hour <= 16;
      const price = isPremium ? Math.floor(basePrice * 1.2) : basePrice;

      const newSlot = await this.prisma.timeSlotAvailability.create({
        data: {
          courseId,
          date,
          timeSlot,
          maxCapacity: 4,
          booked: 0,
          isAvailable: true,
          isPremium,
          price
        }
      });

      slots.push(newSlot);
    }

    return slots;
  }

  // 코스 캐시 동기화 메서드
  async syncCourseCache(data: {
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
  }): Promise<void> {
    await this.prisma.courseCache.upsert({
      where: { courseId: data.courseId },
      update: {
        name: data.name,
        location: data.location,
        description: data.description,
        rating: data.rating,
        pricePerHour: data.pricePerHour,
        imageUrl: data.imageUrl,
        amenities: data.amenities,
        openTime: data.openTime,
        closeTime: data.closeTime,
        isActive: data.isActive,
      },
      create: {
        courseId: data.courseId,
        name: data.name,
        location: data.location,
        description: data.description,
        rating: data.rating,
        pricePerHour: data.pricePerHour,
        imageUrl: data.imageUrl,
        amenities: data.amenities,
        openTime: data.openTime,
        closeTime: data.closeTime,
        isActive: data.isActive,
      }
    });
  }

  private toResponseDto(booking: any): BookingResponseDto {
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      userId: booking.userId,
      courseId: booking.courseId,
      courseName: booking.courseName,
      courseLocation: booking.courseLocation,
      bookingDate: booking.bookingDate.toISOString(),
      timeSlot: booking.timeSlot,
      playerCount: booking.playerCount,
      pricePerPerson: Number(booking.pricePerPerson),
      serviceFee: Number(booking.serviceFee),
      totalPrice: Number(booking.totalPrice),
      status: booking.status,
      paymentMethod: booking.paymentMethod,
      specialRequests: booking.specialRequests,
      userEmail: booking.userEmail,
      userName: booking.userName,
      userPhone: booking.userPhone,
      payments: booking.payments || [],
      histories: booking.histories || [],
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  }
}