import { Injectable, HttpException, HttpStatus, Logger, Inject, Optional } from '@nestjs/common';
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
import { randomUUID } from 'crypto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('NOTIFICATION_SERVICE') private readonly notificationPublisher?: ClientProxy,
    @Optional() @Inject('COURSE_SERVICE') private readonly courseServiceClient?: ClientProxy,
  ) {}

  // 예약번호 생성 함수 - UUID 기반으로 예측 불가능하고 충돌 없는 번호 생성
  private generateBookingNumber(): string {
    const uuid = randomUUID().replace(/-/g, '').toUpperCase();
    return `BK-${uuid.slice(0, 8)}-${uuid.slice(8, 12)}`;
  }

  async createBooking(dto: CreateBookingRequestDto): Promise<BookingResponseDto> {
    try {
      // 1. GameTimeSlot 캐시에서 가용성 확인
      const slotCache = await this.prisma.gameTimeSlotCache.findUnique({
        where: { gameTimeSlotId: dto.gameTimeSlotId }
      });

      if (!slotCache) {
        throw new HttpException('Game time slot not found', HttpStatus.NOT_FOUND);
      }

      if (!slotCache.isAvailable || slotCache.status !== 'AVAILABLE') {
        throw new HttpException('Selected time slot is not available', HttpStatus.BAD_REQUEST);
      }

      if (slotCache.availablePlayers < dto.playerCount) {
        throw new HttpException(
          `Not enough capacity. Available: ${slotCache.availablePlayers}, Requested: ${dto.playerCount}`,
          HttpStatus.BAD_REQUEST
        );
      }

      // 2. Game 정보 가져오기 (캐시에서)
      const gameInfo = await this.prisma.gameCache.findUnique({
        where: { gameId: slotCache.gameId }
      });

      if (!gameInfo) {
        throw new HttpException('Game information not found', HttpStatus.NOT_FOUND);
      }

      // 3. 가격 계산
      const pricePerPerson = Number(slotCache.price);
      const totalAmount = pricePerPerson * dto.playerCount;
      const serviceFee = Math.floor(totalAmount * 0.03); // 3% 서비스 수수료
      const totalPrice = totalAmount + serviceFee;

      // 4. 예약 생성
      const booking = await this.prisma.$transaction(async (prisma) => {
        // Race Condition 방지를 위해 SELECT FOR UPDATE
        const slotLock = await prisma.$queryRaw<Array<{id: number, available_players: number}>>`
          SELECT id, "availablePlayers" as available_players
          FROM "game_time_slot_cache"
          WHERE "gameTimeSlotId" = ${dto.gameTimeSlotId}
          FOR UPDATE
        `;

        if (slotLock.length === 0 || slotLock[0].available_players < dto.playerCount) {
          throw new HttpException(
            'Selected time slot is no longer available',
            HttpStatus.CONFLICT
          );
        }

        // 예약 생성
        const newBooking = await prisma.booking.create({
          data: {
            gameTimeSlotId: dto.gameTimeSlotId,
            gameId: slotCache.gameId,
            gameName: slotCache.gameName,
            gameCode: slotCache.gameCode,
            frontNineCourseId: gameInfo.frontNineCourseId,
            frontNineCourseName: gameInfo.frontNineCourseName,
            backNineCourseId: gameInfo.backNineCourseId,
            backNineCourseName: gameInfo.backNineCourseName,
            bookingDate: slotCache.date,
            startTime: slotCache.startTime,
            endTime: slotCache.endTime,
            clubId: slotCache.clubId,
            clubName: slotCache.clubName,
            userId: dto.userId,
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

        // 로컬 캐시 업데이트
        const newBookedPlayers = slotCache.bookedPlayers + dto.playerCount;
        const newAvailablePlayers = slotCache.maxPlayers - newBookedPlayers;
        const newStatus = newAvailablePlayers <= 0 ? 'FULLY_BOOKED' : 'AVAILABLE';

        await prisma.gameTimeSlotCache.update({
          where: { gameTimeSlotId: dto.gameTimeSlotId },
          data: {
            bookedPlayers: newBookedPlayers,
            availablePlayers: newAvailablePlayers,
            isAvailable: newAvailablePlayers > 0,
            status: newStatus,
            lastSyncAt: new Date(),
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
              paymentMethod: dto.paymentMethod,
              gameName: slotCache.gameName,
              gameTimeSlotId: dto.gameTimeSlotId,
            }
          }
        });

        return newBooking;
      });

      this.logger.log(`Booking ${booking.bookingNumber} created successfully.`);

      // 5. course-service에 예약 알림 (슬롯 업데이트)
      if (this.courseServiceClient) {
        this.courseServiceClient.emit('gameTimeSlots.book', {
          timeSlotId: dto.gameTimeSlotId,
          playerCount: dto.playerCount,
        });
      }

      // 6. 예약 확정 이벤트 발행
      const eventPayload: BookingConfirmedEvent = {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        userId: booking.userId,
        gameId: booking.gameId,
        gameName: booking.gameName,
        frontNineCourseName: booking.frontNineCourseName,
        backNineCourseName: booking.backNineCourseName,
        bookingDate: booking.bookingDate.toISOString(),
        timeSlot: booking.startTime,
        playerCount: booking.playerCount,
        totalPrice: Number(booking.totalPrice),
        userEmail: booking.userEmail,
        userName: booking.userName,
      };

      if (this.notificationPublisher) {
        this.notificationPublisher.emit('booking.confirmed', eventPayload);
        this.logger.log(`'booking.confirmed' event emitted for booking ${booking.bookingNumber}`);
      }

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
    const { page = 1, limit = 10, status, gameId, clubId, userId, startDate, endDate } = searchDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status as BookingStatus;
    }
    if (gameId) {
      where.gameId = gameId;
    }
    if (clubId) {
      where.clubId = clubId;
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

      // 로컬 캐시 가용성 복구
      const slotCache = await prisma.gameTimeSlotCache.findUnique({
        where: { gameTimeSlotId: existingBooking.gameTimeSlotId }
      });

      if (slotCache) {
        const newBookedPlayers = Math.max(0, slotCache.bookedPlayers - existingBooking.playerCount);
        const newAvailablePlayers = slotCache.maxPlayers - newBookedPlayers;

        await prisma.gameTimeSlotCache.update({
          where: { gameTimeSlotId: existingBooking.gameTimeSlotId },
          data: {
            bookedPlayers: newBookedPlayers,
            availablePlayers: newAvailablePlayers,
            isAvailable: true,
            status: 'AVAILABLE',
            lastSyncAt: new Date(),
          }
        });
      }

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

    // course-service에 취소 알림
    if (this.courseServiceClient) {
      this.courseServiceClient.emit('gameTimeSlots.release', {
        timeSlotId: booking.gameTimeSlotId,
        playerCount: booking.playerCount,
      });
    }

    // 예약 취소 이벤트 발행
    if (this.notificationPublisher) {
      this.notificationPublisher.emit('booking.cancelled', {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        userId: booking.userId,
        gameId: booking.gameId,
        gameName: booking.gameName,
        bookingDate: booking.bookingDate.toISOString(),
        timeSlot: booking.startTime,
        reason: reason || 'No reason provided',
        cancelledAt: new Date().toISOString(),
        userEmail: booking.userEmail,
        userName: booking.userName,
      });
      this.logger.log(`'booking.cancelled' event emitted for booking ${booking.bookingNumber}`);
    }

    return this.toResponseDto(booking);
  }

  // GameTimeSlot 가용성 조회 (Game 기반)
  async getGameTimeSlotAvailability(
    gameId: number,
    date: string
  ): Promise<any[]> {
    const targetDate = new Date(date + 'T00:00:00.000Z');

    const slots = await this.prisma.gameTimeSlotCache.findMany({
      where: {
        gameId,
        date: targetDate
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    return slots.map(slot => ({
      id: slot.id,
      gameTimeSlotId: slot.gameTimeSlotId,
      gameId: slot.gameId,
      gameName: slot.gameName,
      gameCode: slot.gameCode,
      frontNineCourseName: slot.frontNineCourseName,
      backNineCourseName: slot.backNineCourseName,
      clubId: slot.clubId,
      clubName: slot.clubName,
      date: slot.date.toISOString().split('T')[0],
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxPlayers: slot.maxPlayers,
      bookedPlayers: slot.bookedPlayers,
      availablePlayers: slot.availablePlayers,
      isAvailable: slot.isAvailable,
      price: Number(slot.price),
      isPremium: slot.isPremium,
      status: slot.status,
    }));
  }

  // Game 캐시 동기화 메서드
  async syncGameCache(data: {
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
  }): Promise<void> {
    await this.prisma.gameCache.upsert({
      where: { gameId: data.gameId },
      update: {
        name: data.name,
        code: data.code,
        description: data.description,
        frontNineCourseId: data.frontNineCourseId,
        frontNineCourseName: data.frontNineCourseName,
        backNineCourseId: data.backNineCourseId,
        backNineCourseName: data.backNineCourseName,
        totalHoles: data.totalHoles,
        estimatedDuration: data.estimatedDuration,
        breakDuration: data.breakDuration,
        maxPlayers: data.maxPlayers,
        basePrice: data.basePrice,
        weekendPrice: data.weekendPrice,
        holidayPrice: data.holidayPrice,
        clubId: data.clubId,
        clubName: data.clubName,
        isActive: data.isActive,
        lastSyncAt: new Date(),
      },
      create: {
        gameId: data.gameId,
        name: data.name,
        code: data.code,
        description: data.description,
        frontNineCourseId: data.frontNineCourseId,
        frontNineCourseName: data.frontNineCourseName,
        backNineCourseId: data.backNineCourseId,
        backNineCourseName: data.backNineCourseName,
        totalHoles: data.totalHoles,
        estimatedDuration: data.estimatedDuration,
        breakDuration: data.breakDuration,
        maxPlayers: data.maxPlayers,
        basePrice: data.basePrice,
        weekendPrice: data.weekendPrice,
        holidayPrice: data.holidayPrice,
        clubId: data.clubId,
        clubName: data.clubName,
        isActive: data.isActive,
      }
    });
    this.logger.log(`Game cache synced for gameId: ${data.gameId}`);
  }

  // GameTimeSlot 캐시 동기화 메서드
  async syncGameTimeSlotCache(data: {
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
    price: number;
    isPremium: boolean;
    status: string;
  }): Promise<void> {
    const availablePlayers = data.maxPlayers - data.bookedPlayers;

    await this.prisma.gameTimeSlotCache.upsert({
      where: { gameTimeSlotId: data.gameTimeSlotId },
      update: {
        gameId: data.gameId,
        gameName: data.gameName,
        gameCode: data.gameCode,
        frontNineCourseName: data.frontNineCourseName,
        backNineCourseName: data.backNineCourseName,
        clubId: data.clubId,
        clubName: data.clubName,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        maxPlayers: data.maxPlayers,
        bookedPlayers: data.bookedPlayers,
        availablePlayers,
        isAvailable: availablePlayers > 0 && data.status === 'AVAILABLE',
        price: data.price,
        isPremium: data.isPremium,
        status: data.status,
        lastSyncAt: new Date(),
      },
      create: {
        gameTimeSlotId: data.gameTimeSlotId,
        gameId: data.gameId,
        gameName: data.gameName,
        gameCode: data.gameCode,
        frontNineCourseName: data.frontNineCourseName,
        backNineCourseName: data.backNineCourseName,
        clubId: data.clubId,
        clubName: data.clubName,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        maxPlayers: data.maxPlayers,
        bookedPlayers: data.bookedPlayers,
        availablePlayers,
        isAvailable: availablePlayers > 0 && data.status === 'AVAILABLE',
        price: data.price,
        isPremium: data.isPremium,
        status: data.status,
      }
    });
    this.logger.log(`GameTimeSlot cache synced for gameTimeSlotId: ${data.gameTimeSlotId}`);
  }

  private toResponseDto(booking: any): BookingResponseDto {
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      userId: booking.userId,
      gameId: booking.gameId,
      gameTimeSlotId: booking.gameTimeSlotId,
      gameName: booking.gameName,
      gameCode: booking.gameCode,
      frontNineCourseId: booking.frontNineCourseId,
      frontNineCourseName: booking.frontNineCourseName,
      backNineCourseId: booking.backNineCourseId,
      backNineCourseName: booking.backNineCourseName,
      clubId: booking.clubId,
      clubName: booking.clubName,
      bookingDate: booking.bookingDate.toISOString(),
      startTime: booking.startTime,
      endTime: booking.endTime,
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
