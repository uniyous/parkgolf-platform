import { Injectable, HttpException, HttpStatus, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Booking, BookingStatus, BookingHistory, OutboxStatus } from '@prisma/client';
import {
  CreateBookingRequestDto,
  UpdateBookingDto,
  BookingResponseDto,
  SearchBookingDto,
  BookingConfirmedEvent,
  SlotReserveRequest,
  BookingWithRelations,
} from '../dto/booking.dto';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, retry, catchError, of } from 'rxjs';
import { randomUUID } from 'crypto';

// NATS 호출 설정
const NATS_TIMEOUT_MS = 5000;  // 5초 타임아웃
const NATS_RETRY_COUNT = 2;    // 2회 재시도

// 캐시 설정
const CACHE_TTL_MS = 5 * 60 * 1000;  // 5분 캐시 유효 기간

// 멱등성 키 설정
const IDEMPOTENCY_KEY_TTL_HOURS = 24;  // 24시간 TTL

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

  // course-service에서 슬롯 정보 조회 후 캐시 동기화
  private async fetchAndSyncSlotFromCourseService(gameTimeSlotId: number): Promise<any> {
    if (!this.courseServiceClient) {
      this.logger.error('COURSE_SERVICE client is not available');
      return null;
    }

    try {
      // course-service에서 슬롯 정보 조회 (timeout + retry)
      const slotResponse = await firstValueFrom(
        this.courseServiceClient.send('gameTimeSlots.get', { timeSlotId: gameTimeSlotId }).pipe(
          timeout(NATS_TIMEOUT_MS),
          retry(NATS_RETRY_COUNT),
          catchError((err) => {
            this.logger.error(`gameTimeSlots.get failed after retries: ${err.message}`);
            return of(null);
          })
        )
      );

      if (!slotResponse?.success || !slotResponse?.data) {
        this.logger.error(`Failed to fetch slot from course-service: ${JSON.stringify(slotResponse)}`);
        return null;
      }

      const slot = slotResponse.data;
      this.logger.log(`Fetched slot from course-service: gameTimeSlotId=${slot.id}, gameId=${slot.gameId}`);

      // game 정보도 조회해서 GameCache 동기화 (timeout + retry)
      const gameResponse = await firstValueFrom(
        this.courseServiceClient.send('games.get', { gameId: slot.gameId }).pipe(
          timeout(NATS_TIMEOUT_MS),
          retry(NATS_RETRY_COUNT),
          catchError((err) => {
            this.logger.error(`games.get failed after retries: ${err.message}`);
            return of(null);
          })
        )
      );

      if (gameResponse?.success && gameResponse?.data) {
        const game = gameResponse.data;

        // GameCache 동기화
        await this.prisma.gameCache.upsert({
          where: { gameId: game.id },
          update: {
            name: game.name,
            code: game.code,
            description: game.description,
            frontNineCourseId: game.frontNineCourseId,
            frontNineCourseName: game.frontNineCourseName,
            backNineCourseId: game.backNineCourseId,
            backNineCourseName: game.backNineCourseName,
            totalHoles: game.totalHoles,
            estimatedDuration: game.estimatedDuration,
            breakDuration: game.breakDuration,
            maxPlayers: game.maxPlayers,
            basePrice: game.basePrice,
            weekendPrice: game.weekendPrice,
            holidayPrice: game.holidayPrice,
            clubId: game.clubId,
            clubName: game.clubName,
            isActive: game.isActive,
            lastSyncAt: new Date(),
          },
          create: {
            gameId: game.id,
            name: game.name,
            code: game.code,
            description: game.description,
            frontNineCourseId: game.frontNineCourseId,
            frontNineCourseName: game.frontNineCourseName,
            backNineCourseId: game.backNineCourseId,
            backNineCourseName: game.backNineCourseName,
            totalHoles: game.totalHoles,
            estimatedDuration: game.estimatedDuration,
            breakDuration: game.breakDuration,
            maxPlayers: game.maxPlayers,
            basePrice: game.basePrice,
            weekendPrice: game.weekendPrice,
            holidayPrice: game.holidayPrice,
            clubId: game.clubId,
            clubName: game.clubName,
            isActive: game.isActive,
          }
        });
        this.logger.log(`GameCache synced for gameId: ${game.id}`);
      }

      // GameTimeSlotCache 동기화
      const maxPlayers = slot.maxPlayers ?? 4;
      const bookedPlayers = slot.bookedPlayers ?? slot.currentBookings ?? 0;
      const availablePlayers = maxPlayers - bookedPlayers;
      const isAvailable = availablePlayers > 0 && slot.status === 'AVAILABLE';

      const slotCache = await this.prisma.gameTimeSlotCache.upsert({
        where: { gameTimeSlotId: slot.id },
        update: {
          gameId: slot.gameId,
          gameName: slot.gameName,
          gameCode: slot.gameCode,
          frontNineCourseName: slot.frontNineCourseName,
          backNineCourseName: slot.backNineCourseName,
          clubId: gameResponse?.data?.clubId,
          clubName: slot.clubName,
          date: new Date(slot.date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxPlayers,
          bookedPlayers,
          availablePlayers,
          isAvailable,
          price: slot.price || 0,
          isPremium: slot.isPremium || false,
          status: slot.status || 'AVAILABLE',
          lastSyncAt: new Date(),
        },
        create: {
          gameTimeSlotId: slot.id,
          gameId: slot.gameId,
          gameName: slot.gameName,
          gameCode: slot.gameCode,
          frontNineCourseName: slot.frontNineCourseName,
          backNineCourseName: slot.backNineCourseName,
          clubId: gameResponse?.data?.clubId,
          clubName: slot.clubName,
          date: new Date(slot.date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxPlayers,
          bookedPlayers,
          availablePlayers,
          isAvailable,
          price: slot.price || 0,
          isPremium: slot.isPremium || false,
          status: slot.status || 'AVAILABLE',
        }
      });

      this.logger.log(`GameTimeSlotCache synced for gameTimeSlotId: ${slot.id}`);
      return slotCache;
    } catch (error) {
      this.logger.error(`Failed to fetch and sync slot from course-service: ${error.message}`);
      return null;
    }
  }

  /**
   * 예약 생성 (Saga 패턴)
   *
   * 흐름:
   * 1. 멱등성 키 확인 → 중복이면 기존 응답 반환
   * 2. 슬롯 정보 조회 및 기본 검증
   * 3. PENDING 상태로 예약 생성 + OutboxEvent 저장 (같은 트랜잭션)
   * 4. OutboxProcessor가 slot.reserve 이벤트 발행
   * 5. course-service 응답에 따라 CONFIRMED 또는 FAILED로 전이
   */
  async createBooking(dto: CreateBookingRequestDto): Promise<BookingResponseDto> {
    try {
      // =====================================================
      // 1. 멱등성 키 확인
      // =====================================================
      const existingIdempotencyKey = await this.prisma.idempotencyKey.findUnique({
        where: { key: dto.idempotencyKey },
      });

      if (existingIdempotencyKey) {
        // 이미 처리된 요청 - 기존 예약 반환
        if (existingIdempotencyKey.aggregateId) {
          this.logger.log(`Idempotency key ${dto.idempotencyKey} already processed, returning cached response`);
          const existingBooking = await this.getBookingById(Number(existingIdempotencyKey.aggregateId));
          if (existingBooking) {
            return existingBooking;
          }
        }
        // aggregateId가 없으면 진행 중인 요청 - 에러 반환
        throw new HttpException('Request is already being processed', HttpStatus.CONFLICT);
      }

      // =====================================================
      // 2. 슬롯 정보 조회 및 기본 검증
      // =====================================================
      let slotCache = await this.prisma.gameTimeSlotCache.findUnique({
        where: { gameTimeSlotId: dto.gameTimeSlotId }
      });

      // 캐시에 없으면 course-service에서 조회
      if (!slotCache) {
        this.logger.log(`Slot cache miss for gameTimeSlotId: ${dto.gameTimeSlotId}, fetching from course-service`);
        slotCache = await this.fetchAndSyncSlotFromCourseService(dto.gameTimeSlotId);
      }

      if (!slotCache) {
        throw new HttpException('Game time slot not found', HttpStatus.NOT_FOUND);
      }

      // 기본 가용성 검증 (최종 검증은 course-service에서)
      if (!slotCache.isAvailable || slotCache.status !== 'AVAILABLE') {
        throw new HttpException('Selected time slot is not available', HttpStatus.BAD_REQUEST);
      }

      if (slotCache.availablePlayers < dto.playerCount) {
        throw new HttpException(
          `Not enough capacity. Available: ${slotCache.availablePlayers}, Requested: ${dto.playerCount}`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Game 정보 조회
      const gameInfo = await this.prisma.gameCache.findUnique({
        where: { gameId: slotCache.gameId }
      });

      if (!gameInfo) {
        throw new HttpException('Game information not found', HttpStatus.NOT_FOUND);
      }

      // 가격 계산
      const pricePerPerson = Number(slotCache.price);
      const totalAmount = pricePerPerson * dto.playerCount;
      const serviceFee = Math.floor(totalAmount * 0.03);
      const totalPrice = totalAmount + serviceFee;

      // =====================================================
      // 3. PENDING 예약 + OutboxEvent 생성 (Transactional Outbox)
      // =====================================================
      const bookingNumber = this.generateBookingNumber();
      const idempotencyKeyExpiry = new Date();
      idempotencyKeyExpiry.setHours(idempotencyKeyExpiry.getHours() + IDEMPOTENCY_KEY_TTL_HOURS);

      const booking = await this.prisma.$transaction(async (prisma) => {
        // 예약 생성 (PENDING 상태)
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
            status: BookingStatus.PENDING,  // Saga 시작: PENDING
            paymentMethod: dto.paymentMethod,
            specialRequests: dto.specialRequests,
            bookingNumber,
            idempotencyKey: dto.idempotencyKey,
            userEmail: dto.userEmail,
            userName: dto.userName,
            userPhone: dto.userPhone,
          },
        });

        // OutboxEvent 생성 (slot.reserve 요청)
        const slotReservePayload = {
          bookingId: newBooking.id,
          bookingNumber: newBooking.bookingNumber,
          gameTimeSlotId: dto.gameTimeSlotId,
          playerCount: dto.playerCount,
          requestedAt: new Date().toISOString(),
        };

        await prisma.outboxEvent.create({
          data: {
            aggregateType: 'Booking',
            aggregateId: String(newBooking.id),
            eventType: 'slot.reserve',
            payload: slotReservePayload as any,
            status: OutboxStatus.PENDING,
          },
        });

        // 멱등성 키 저장
        await prisma.idempotencyKey.create({
          data: {
            key: dto.idempotencyKey,
            aggregateType: 'Booking',
            aggregateId: String(newBooking.id),
            expiresAt: idempotencyKeyExpiry,
          },
        });

        // 예약 히스토리 생성
        await prisma.bookingHistory.create({
          data: {
            bookingId: newBooking.id,
            action: 'SAGA_STARTED',
            userId: dto.userId,
            details: {
              playerCount: dto.playerCount,
              totalPrice: totalPrice.toString(),
              paymentMethod: dto.paymentMethod,
              gameName: slotCache.gameName,
              gameTimeSlotId: dto.gameTimeSlotId,
              idempotencyKey: dto.idempotencyKey,
            }
          }
        });

        return newBooking;
      });

      this.logger.log(`Booking ${booking.bookingNumber} created with PENDING status (Saga started)`);

      return BookingResponseDto.fromEntity(booking);
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

    return booking ? BookingResponseDto.fromEntity(booking) : null;
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

    return booking ? BookingResponseDto.fromEntity(booking) : null;
  }

  async getBookingsByUserId(userId: number): Promise<BookingResponseDto[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        payments: true
      }
    });

    return bookings.map(booking => BookingResponseDto.fromEntity(booking));
  }

  async searchBookings(searchDto: SearchBookingDto): Promise<{
    bookings: BookingResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      status,
      gameId,
      clubId,
      userId,
      startDate,
      endDate,
      sortBy = 'bookingDate',
      sortOrder = 'desc',
      timeFilter = 'all'
    } = searchDto;
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

    // timeFilter 적용
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (timeFilter === 'upcoming') {
      where.bookingDate = { gte: now };
    } else if (timeFilter === 'past') {
      where.bookingDate = { lt: now };
    } else if (startDate || endDate) {
      // timeFilter가 'all'이고 날짜 범위가 지정된 경우
      where.bookingDate = {};
      if (startDate) {
        where.bookingDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.bookingDate.lte = new Date(endDate);
      }
    }

    // 정렬 설정
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          payments: true
        }
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      bookings: BookingResponseDto.fromEntities(bookings, true),
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

    return BookingResponseDto.fromEntity(booking);
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

    return BookingResponseDto.fromEntity(booking);
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
}
