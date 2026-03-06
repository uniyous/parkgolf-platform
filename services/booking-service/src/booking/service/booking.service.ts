import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingStatus, OutboxStatus, TimeSlotCacheStatus, ParticipantStatus, ParticipantRole, TeamSelectionStatus } from '@prisma/client';
import {
  UpdateBookingDto,
  BookingResponseDto,
  SearchBookingDto,
  BookingWithRelations,
  GameTimeSlotAvailabilityDto,
} from '../dto/booking.dto';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { randomUUID } from 'crypto';
import { NATS_TIMEOUTS } from '../../common/constants';
import { OutboxProcessorService } from './outbox-processor.service';
import { AppException } from '../../common/exceptions/app.exception';
import { Errors } from '../../common/exceptions/catalog/error-catalog';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxProcessor: OutboxProcessorService,
    @Optional() @Inject('NOTIFICATION_SERVICE') private readonly notificationPublisher?: ClientProxy,
    @Optional() @Inject('COURSE_SERVICE') private readonly courseServiceClient?: ClientProxy,
    @Optional() @Inject('IAM_SERVICE') private readonly iamService?: ClientProxy,
    @Optional() @Inject('CHAT_SERVICE') private readonly chatClient?: ClientProxy,
  ) {}

  // 예약번호 생성 함수 - UUID 기반으로 예측 불가능하고 충돌 없는 번호 생성
  private generateBookingNumber(): string {
    const uuid = randomUUID().replace(/-/g, '').toUpperCase();
    return `BK-${uuid.slice(0, 8)}-${uuid.slice(8, 12)}`;
  }

  async getBookingById(id: number): Promise<BookingResponseDto | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        payments: true,
        participants: {
          orderBy: { id: 'asc' }
        },
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
        participants: {
          orderBy: { id: 'asc' }
        },
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
      companyId,
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
    // companyId 필터: course-service에서 해당 회사의 clubId 목록을 조회하여 필터링
    if (companyId && !clubId && this.courseServiceClient) {
      try {
        const clubsResult = await firstValueFrom(
          this.courseServiceClient.send('club.findByCompany', { companyId }).pipe(timeout(5000)),
        );
        const clubIds = (clubsResult?.data || []).map((c: any) => c.id);
        if (clubIds.length > 0) {
          where.clubId = { in: clubIds };
        } else {
          // 해당 회사에 클럽이 없으면 빈 결과 반환
          return { bookings: [], total: 0, page, limit };
        }
      } catch (error) {
        this.logger.warn(`Failed to resolve clubIds for companyId=${companyId}: ${error.message}`);
      }
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
        throw new AppException(Errors.Booking.NOT_FOUND);
      }

      // 변경 가능한 상태인지 확인
      if (existingBooking.status === BookingStatus.CANCELLED ||
          existingBooking.status === BookingStatus.COMPLETED) {
        throw new AppException(Errors.Booking.INVALID_STATUS);
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


  // 예약 취소 공통 로직 (트랜잭션 내에서 호출)
  private async executeCancellation(
    prisma: any,
    existingBooking: any,
    reason: string,
    historyDetails: Record<string, any>,
  ) {
    // 예약 취소
    const cancelledBooking = await prisma.booking.update({
      where: { id: existingBooking.id },
      data: { status: BookingStatus.CANCELLED },
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
          status: TimeSlotCacheStatus.AVAILABLE,
          lastSyncAt: new Date(),
        }
      });
    }

    // 히스토리 추가
    await prisma.bookingHistory.create({
      data: {
        bookingId: existingBooking.id,
        action: 'CANCELLED',
        userId: existingBooking.userId,
        details: { reason, ...historyDetails },
      }
    });

    // 카드/더치페이인 경우 환불 OutboxEvent 생성
    if (existingBooking.paymentMethod === 'card' || existingBooking.paymentMethod === 'dutchpay') {
      await prisma.outboxEvent.create({
        data: {
          aggregateType: 'Booking',
          aggregateId: String(existingBooking.id),
          eventType: 'payment.cancelByBookingId',
          payload: {
            bookingId: existingBooking.id,
            cancelReason: reason,
          } as any,
          status: OutboxStatus.PENDING,
        },
      });
    }

    return cancelledBooking;
  }

  // 예약 확정 (PENDING -> CONFIRMED)
  async confirmBooking(id: number): Promise<BookingResponseDto> {
    const booking = await this.prisma.$transaction(async (prisma) => {
      const existingBooking = await prisma.booking.findUnique({
        where: { id }
      });

      if (!existingBooking) {
        throw new AppException(Errors.Booking.NOT_FOUND);
      }

      if (existingBooking.status !== BookingStatus.PENDING) {
        throw new AppException(Errors.Booking.INVALID_STATUS,
          `현재 상태(${existingBooking.status})에서는 확정할 수 없습니다`);
      }

      const confirmedBooking = await prisma.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CONFIRMED,
        },
      });

      await prisma.bookingHistory.create({
        data: {
          bookingId: id,
          action: 'CONFIRMED',
          userId: existingBooking.userId,
          details: {
            confirmedBy: 'admin'
          }
        }
      });

      return confirmedBooking;
    });

    // CompanyMember 자동 등록 (트랜잭션 밖에서 비동기 호출)
    await this.registerCompanyMember(booking.clubId, booking.userId);

    return BookingResponseDto.fromEntity(booking);
  }

  // 예약 완료 (CONFIRMED -> COMPLETED)
  async completeBooking(id: number): Promise<BookingResponseDto> {
    const booking = await this.prisma.$transaction(async (prisma) => {
      const existingBooking = await prisma.booking.findUnique({
        where: { id }
      });

      if (!existingBooking) {
        throw new AppException(Errors.Booking.NOT_FOUND);
      }

      if (existingBooking.status !== BookingStatus.CONFIRMED) {
        throw new AppException(Errors.Booking.INVALID_STATUS,
          `현재 상태(${existingBooking.status})에서는 완료 처리할 수 없습니다`);
      }

      const completedBooking = await prisma.booking.update({
        where: { id },
        data: {
          status: BookingStatus.COMPLETED,
        },
      });

      await prisma.bookingHistory.create({
        data: {
          bookingId: id,
          action: 'COMPLETED',
          userId: existingBooking.userId,
          details: {
            completedBy: 'admin'
          }
        }
      });

      return completedBooking;
    });

    return BookingResponseDto.fromEntity(booking);
  }

  // 노쇼 처리 (CONFIRMED -> NO_SHOW)
  async markNoShow(id: number): Promise<BookingResponseDto> {
    const booking = await this.prisma.$transaction(async (prisma) => {
      const existingBooking = await prisma.booking.findUnique({
        where: { id }
      });

      if (!existingBooking) {
        throw new AppException(Errors.Booking.NOT_FOUND);
      }

      if (existingBooking.status !== BookingStatus.CONFIRMED) {
        throw new AppException(Errors.Booking.INVALID_STATUS,
          `현재 상태(${existingBooking.status})에서는 노쇼 처리할 수 없습니다`);
      }

      const noShowBooking = await prisma.booking.update({
        where: { id },
        data: {
          status: BookingStatus.NO_SHOW,
        },
      });

      await prisma.bookingHistory.create({
        data: {
          bookingId: id,
          action: 'NO_SHOW',
          userId: existingBooking.userId,
          details: {
            markedBy: 'admin'
          }
        }
      });

      return noShowBooking;
    });

    return BookingResponseDto.fromEntity(booking);
  }

  // GameTimeSlot 가용성 조회 (Game 기반)
  async getGameTimeSlotAvailability(
    gameId: number,
    date: string
  ): Promise<GameTimeSlotAvailabilityDto[]> {
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

    return GameTimeSlotAvailabilityDto.fromEntities(slots);
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
    const status = (data.status as TimeSlotCacheStatus) || TimeSlotCacheStatus.AVAILABLE;

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
        isAvailable: availablePlayers > 0 && status === TimeSlotCacheStatus.AVAILABLE,
        price: data.price,
        isPremium: data.isPremium,
        status,
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
        isAvailable: availablePlayers > 0 && status === TimeSlotCacheStatus.AVAILABLE,
        price: data.price,
        isPremium: data.isPremium,
        status,
      }
    });
    this.logger.log(`GameTimeSlot cache synced for gameTimeSlotId: ${data.gameTimeSlotId}`);
  }

  /**
   * 예약 확정 시 CompanyMember 자동 등록
   * clubId → companyId 조회 → iam.companyMembers.addByBooking 호출
   */
  private async registerCompanyMember(clubId: number | null, userId: number | null): Promise<void> {
    if (!clubId || !userId || !this.courseServiceClient || !this.iamService) return;

    try {
      const clubResponse = await firstValueFrom(
        this.courseServiceClient.send('club.findOne', { id: clubId }),
      );
      const companyId = clubResponse?.data?.companyId;
      if (!companyId) return;

      await firstValueFrom(
        this.iamService.send('iam.companyMembers.addByBooking', { companyId, userId }),
      );
      this.logger.log(`CompanyMember registered: companyId=${companyId}, userId=${userId}`);
    } catch (error) {
      this.logger.warn(`Failed to register CompanyMember: clubId=${clubId}, userId=${userId}`, error?.message);
    }
  }

  // 관리자 대시보드 - 예약 통계
  async getBookingStats(dateRange: { startDate: string; endDate: string }) {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);

    const dateFilter = { bookingDate: { gte: startDate, lte: endDate } };

    const [totalBookings, statusGroups, revenueAgg] = await Promise.all([
      this.prisma.booking.count({ where: dateFilter }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: dateFilter,
        _count: true,
      }),
      this.prisma.booking.aggregate({
        where: dateFilter,
        _sum: { totalPrice: true },
      }),
    ]);

    const statusMap = new Map(statusGroups.map((g) => [g.status, g._count]));
    const confirmedBookings = statusMap.get(BookingStatus.CONFIRMED) ?? 0;
    const cancelledBookings = statusMap.get(BookingStatus.CANCELLED) ?? 0;
    const completedBookings = statusMap.get(BookingStatus.COMPLETED) ?? 0;
    const pendingBookings = (statusMap.get(BookingStatus.PENDING) ?? 0)
      + (statusMap.get(BookingStatus.SLOT_RESERVED) ?? 0);
    const noShowBookings = statusMap.get(BookingStatus.NO_SHOW) ?? 0;

    // 이전 동일 기간 계산
    const periodMs = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodMs - 1);
    const prevEnd = new Date(startDate.getTime() - 1);
    const prevTotal = await this.prisma.booking.count({
      where: { bookingDate: { gte: prevStart, lte: prevEnd } },
    });

    const bookingGrowthRate = prevTotal > 0
      ? Math.round(((totalBookings - prevTotal) / prevTotal) * 100 * 10) / 10
      : 0;

    const days = Math.max(1, Math.ceil(periodMs / (1000 * 60 * 60 * 24)));
    const averageBookingsPerDay = Math.round((totalBookings / days) * 10) / 10;
    const revenue = Number(revenueAgg._sum.totalPrice ?? 0);

    return {
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      completedBookings,
      pendingBookings,
      noShowBookings,
      bookingGrowthRate,
      averageBookingsPerDay,
      count: totalBookings,
      revenue,
    };
  }

  // 클럽 운영 통계 (OperationInfoTab용)
  async getClubOperationStats(clubId: number, dateRange: { startDate: string; endDate: string }) {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);

    const validStatuses = ['CONFIRMED', 'COMPLETED'];

    // 1. 게임별 예약 통계 (주중/주말 포함)
    const gameStats: Array<{
      gameId: number;
      gameName: string | null;
      totalBookings: number;
      totalRevenue: number;
      averagePrice: number;
      bookedSlots: number;
      weekdayBookings: number;
      weekendBookings: number;
    }> = await this.prisma.$queryRaw`
      SELECT
        game_id AS "gameId",
        game_name AS "gameName",
        COUNT(*)::int AS "totalBookings",
        COALESCE(SUM(total_price), 0)::float AS "totalRevenue",
        COALESCE(AVG(price_per_person), 0)::float AS "averagePrice",
        COUNT(DISTINCT game_time_slot_id)::int AS "bookedSlots",
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM booking_date) IN (0, 6))::int AS "weekendBookings",
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM booking_date) NOT IN (0, 6))::int AS "weekdayBookings"
      FROM bookings
      WHERE club_id = ${clubId}
        AND booking_date >= ${startDate}
        AND booking_date <= ${endDate}
        AND status::text = ANY(${validStatuses})
      GROUP BY game_id, game_name
      ORDER BY COUNT(*) DESC
    `;

    // 2. 게임별 인기 시간대 (start_time 기준 top 3)
    const peakHoursRaw: Array<{ gameId: number; startTime: string; cnt: number }> = await this.prisma.$queryRaw`
      SELECT
        game_id AS "gameId",
        start_time AS "startTime",
        COUNT(*)::int AS cnt
      FROM bookings
      WHERE club_id = ${clubId}
        AND booking_date >= ${startDate}
        AND booking_date <= ${endDate}
        AND status::text = ANY(${validStatuses})
      GROUP BY game_id, start_time
      ORDER BY game_id, cnt DESC
    `;

    // 게임별 top 3 시간대 매핑
    const peakHoursMap = new Map<number, string[]>();
    for (const row of peakHoursRaw) {
      const list = peakHoursMap.get(row.gameId) ?? [];
      if (list.length < 3) list.push(row.startTime);
      peakHoursMap.set(row.gameId, list);
    }

    // 3. 전체 인기 시간대 top 3 (stats.peakTimes)
    const overallPeakTimes: Array<{ startTime: string }> = await this.prisma.$queryRaw`
      SELECT start_time AS "startTime"
      FROM bookings
      WHERE club_id = ${clubId}
        AND booking_date >= ${startDate}
        AND booking_date <= ${endDate}
        AND status::text = ANY(${validStatuses})
      GROUP BY start_time
      ORDER BY COUNT(*) DESC
      LIMIT 3
    `;

    // 4. 오늘 예약 현황
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayBookings = await this.prisma.booking.count({
      where: {
        clubId,
        bookingDate: { gte: today, lte: todayEnd },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      },
    });

    // 5. 집계
    const totalBookings = gameStats.reduce((sum, g) => sum + g.totalBookings, 0);
    const totalRevenue = gameStats.reduce((sum, g) => sum + g.totalRevenue, 0);
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const monthlyRevenue = Math.round((totalRevenue / days) * 30);

    // 인기 코스 top 3 (gameName 기준)
    const topCourses = gameStats
      .filter((g) => g.gameName)
      .slice(0, 3)
      .map((g) => g.gameName as string);

    // 전체 가동률 (예약된 슬롯 / 전체 슬롯)
    const totalBookedSlots = gameStats.reduce((sum, g) => sum + g.bookedSlots, 0);
    let averageUtilization = 0;

    // course-service에서 전체 슬롯 수 조회
    if (this.courseServiceClient) {
      try {
        const slotStats = await firstValueFrom(
          this.courseServiceClient.send('gameTimeSlots.stats', {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            clubId,
          }).pipe(timeout(5000), catchError(() => of(null))),
        );
        const totalSlots = slotStats?.data?.totalSlots ?? slotStats?.totalSlots ?? 0;
        if (totalSlots > 0) {
          averageUtilization = Math.round((totalBookedSlots / totalSlots) * 100 * 10) / 10;
        }
      } catch {
        this.logger.warn(`Failed to fetch slot stats from course-service for clubId=${clubId}`);
      }
    }

    const analytics = gameStats.map((g) => ({
      gameId: g.gameId,
      gameName: g.gameName ?? `Game #${g.gameId}`,
      totalBookings: g.totalBookings,
      totalRevenue: g.totalRevenue,
      averagePrice: Math.round(g.averagePrice),
      bookedSlots: g.bookedSlots,
      weekdayBookings: g.weekdayBookings,
      weekendBookings: g.weekendBookings,
      peakHours: peakHoursMap.get(g.gameId) ?? [],
    }));

    return {
      stats: {
        totalBookings,
        totalRevenue,
        averageUtilization,
        monthlyRevenue,
        topCourses,
        peakTimes: overallPeakTimes.map((r) => r.startTime),
      },
      analytics,
      availability: {
        bookedToday: todayBookings,
      },
    };
  }

  // 관리자 대시보드 - 트렌드 차트 데이터
  async getDashboardStats(dateRange: { startDate: string; endDate: string }) {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);

    const dailyGroups = await this.prisma.booking.groupBy({
      by: ['bookingDate'],
      where: { bookingDate: { gte: startDate, lte: endDate } },
      _count: true,
      _sum: { totalPrice: true },
      orderBy: { bookingDate: 'asc' },
    });

    const bookings = dailyGroups.map((g) => ({
      date: g.bookingDate.toISOString().split('T')[0],
      count: g._count,
    }));

    const revenue = dailyGroups.map((g) => ({
      date: g.bookingDate.toISOString().split('T')[0],
      amount: Number(g._sum.totalPrice ?? 0),
    }));

    return {
      bookings,
      revenue,
      users: [],
      courseUtilization: [],
    };
  }

  // 사용자 예약 통계 조회
  async getUserStats(userId: number): Promise<{ totalBookings: number }> {
    const totalBookings = await this.prisma.booking.count({
      where: { userId },
    });

    return { totalBookings };
  }

  /**
   * 진행 중인 예약 존재 여부 확인 (계정 삭제 제한 조건)
   */
  async hasActiveBookings(userId: number): Promise<boolean> {
    const count = await this.prisma.booking.count({
      where: {
        userId,
        status: { in: ['PENDING', 'SLOT_RESERVED', 'CONFIRMED'] },
      },
    });
    return count > 0;
  }

  /**
   * 사용자 탈퇴 시 예약 데이터 익명화
   */
  async anonymizeUserBookings(userId: number): Promise<number> {
    const result = await this.prisma.booking.updateMany({
      where: { userId },
      data: {
        userName: '[삭제된 사용자]',
        userEmail: null,
        userPhone: null,
      },
    });
    return result.count;
  }

  /**
   * 참여자 결제 완료 처리
   * - 참여자 미존재 시 split 데이터로 자동 생성 (upsert)
   * - 전원 결제 완료 시 SLOT_RESERVED → CONFIRMED 전환
   */
  async markParticipantPaid(
    bookingId: number,
    userId: number,
    userName?: string,
    userEmail?: string,
    amount?: number,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new AppException(Errors.Booking.NOT_FOUND);
    }

    // 참여자 조회 → 없으면 split 데이터로 자동 생성
    let participant = await this.prisma.bookingParticipant.findUnique({
      where: { bookingId_userId: { bookingId, userId } },
    });

    if (!participant) {
      if (!userName || !userEmail) {
        this.logger.warn(
          `Participant not found and missing info: booking=${bookingId}, user=${userId}`,
        );
        throw new AppException(Errors.Group.PARTICIPANT_NOT_FOUND);
      }

      const isBooker = booking.userId === userId;
      participant = await this.prisma.bookingParticipant.create({
        data: {
          bookingId,
          userId,
          userName,
          userEmail,
          role: isBooker ? ParticipantRole.BOOKER : ParticipantRole.MEMBER,
          status: ParticipantStatus.PENDING,
          amount: amount ?? Number(booking.pricePerPerson),
        },
      });
      this.logger.log(
        `Auto-created participant: booking=${bookingId}, user=${userId} (${userName})`,
      );
    }

    // 결제 완료 처리
    if (participant.status !== ParticipantStatus.PAID) {
      await this.prisma.bookingParticipant.update({
        where: { id: participant.id },
        data: {
          status: ParticipantStatus.PAID,
          paidAt: new Date(),
        },
      });
    }

    // 해당 booking의 모든 참여자 정산 상태 확인
    const allParticipants = await this.prisma.bookingParticipant.findMany({
      where: { bookingId },
    });

    const paidCount = allParticipants.filter(
      (p) => p.status === ParticipantStatus.PAID,
    ).length;
    const totalCount = allParticipants.length;
    const allPaid = paidCount === totalCount && totalCount >= booking.playerCount;

    // 전원 결제 완료 → SLOT_RESERVED → CONFIRMED
    if (allPaid && booking.status === BookingStatus.SLOT_RESERVED) {
      await this.prisma.$transaction(async (prisma) => {
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.CONFIRMED },
        });

        await prisma.bookingHistory.create({
          data: {
            bookingId,
            action: 'PAYMENT_CONFIRMED',
            userId: booking.userId,
            details: {
              paidCount,
              totalCount,
              confirmedAt: new Date().toISOString(),
              splitPayment: true,
            },
          },
        });

        await prisma.bookingHistory.create({
          data: {
            bookingId,
            action: 'CONFIRMED',
            userId: booking.userId,
            details: {
              confirmedAt: new Date().toISOString(),
              paymentMethod: booking.paymentMethod,
              splitPayment: true,
            },
          },
        });
      });

      this.logger.log(
        `Booking ${bookingId} CONFIRMED — all ${totalCount} participants paid (split payment)`,
      );

      // 예약 확정 이벤트 발행 (알림용)
      if (this.notificationPublisher) {
        this.notificationPublisher.emit('booking.confirmed', {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          userId: booking.userId,
          gameId: booking.gameId,
          gameName: booking.gameName,
          bookingDate: booking.bookingDate.toISOString(),
          timeSlot: booking.startTime,
          confirmedAt: new Date().toISOString(),
          userEmail: booking.userEmail,
          userName: booking.userName,
          paymentMethod: booking.paymentMethod,
        });
      }

      // CompanyMember 자동 등록
      if (booking.clubId && booking.userId && this.courseServiceClient && this.iamService) {
        try {
          const clubResponse = await firstValueFrom(
            this.courseServiceClient.send('club.findOne', { id: booking.clubId }).pipe(
              timeout(NATS_TIMEOUTS.DEFAULT),
              catchError(() => of(null)),
            ),
          );
          const companyId = clubResponse?.data?.companyId;
          if (companyId) {
            await firstValueFrom(
              this.iamService.send('iam.companyMembers.addByBooking', {
                companyId,
                userId: booking.userId,
              }).pipe(
                timeout(NATS_TIMEOUTS.DEFAULT),
                catchError(() => of(null)),
              ),
            );
          }
        } catch (err) {
          this.logger.warn(`CompanyMember registration failed: ${err?.message}`);
        }
      }
    }

    const settlementStatus =
      allPaid ? 'COMPLETED' :
      paidCount > 0 ? 'PARTIAL' : 'PENDING';

    return {
      settled: allPaid,
      paidCount,
      totalCount,
      settlementStatus,
    };
  }

  /**
   * 정산 상태 조회 (READ-ONLY)
   * markParticipantPaid의 allPaid 공식을 재사용하는 단일 진실 공급원
   */
  async getSettlementStatus(bookingId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new AppException(Errors.Booking.NOT_FOUND);
    }

    const participants = await this.prisma.bookingParticipant.findMany({
      where: { bookingId },
    });

    const paidCount = participants.filter(
      (p) => p.status === ParticipantStatus.PAID,
    ).length;
    const totalCount = participants.length;
    const allPaid = paidCount === totalCount && totalCount >= booking.playerCount;

    return {
      bookingId,
      bookingStatus: booking.status,
      allPaid,
      paidCount,
      totalCount,
      playerCount: booking.playerCount,
      settlementStatus: allPaid ? 'COMPLETED' : paidCount > 0 ? 'PARTIAL' : 'PENDING',
      participants: participants.map((p) => ({
        userId: p.userId,
        userName: p.userName,
        amount: Number(p.amount),
        status: p.status,
        paidAt: p.paidAt?.toISOString() || null,
      })),
    };
  }

  /**
   * 그룹 예약 취소 (groupId 기반)
   * executeCancellation 재사용 → 슬롯 캐시 복구 + 카드 환불 Outbox 포함
   */
  async cancelGroupBookings(groupId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { groupId },
    });

    if (bookings.length === 0) {
      throw new AppException(Errors.Group.NOT_FOUND);
    }

    const cancelledBookings = await this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const booking of bookings) {
        if (booking.status === BookingStatus.CANCELLED) continue;

        const cancelled = await this.executeCancellation(
          tx,
          booking,
          'Group booking cancelled',
          { groupId },
        );
        results.push(cancelled);

        // 참여자 전원 취소
        await tx.bookingParticipant.updateMany({
          where: { bookingId: booking.id },
          data: { status: ParticipantStatus.CANCELLED },
        });
      }

      // TeamSelection도 취소
      await tx.teamSelection.updateMany({
        where: { groupId },
        data: { status: TeamSelectionStatus.CANCELLED },
      });

      return results;
    });

    // 트랜잭션 후: course-service 슬롯 해제 + 예약 취소 이벤트
    for (const booking of cancelledBookings) {
      if (this.courseServiceClient) {
        this.courseServiceClient.emit('gameTimeSlots.release', {
          timeSlotId: booking.gameTimeSlotId,
          playerCount: booking.playerCount,
        });
      }

      if (this.notificationPublisher) {
        this.notificationPublisher.emit('booking.cancelled', {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          userId: booking.userId,
          gameId: booking.gameId,
          gameName: booking.gameName,
          bookingDate: booking.bookingDate.toISOString(),
          timeSlot: booking.startTime,
          reason: 'Group booking cancelled',
          cancelledAt: new Date().toISOString(),
          userEmail: booking.userEmail,
          userName: booking.userName,
        });
      }
    }

    // 카드/더치페이 환불 Outbox 트리거
    const hasCardPayment = cancelledBookings.some((b) => b.paymentMethod === 'card' || b.paymentMethod === 'dutchpay');
    if (hasCardPayment) {
      setImmediate(() => this.outboxProcessor.triggerImmediate());
    }

    return { cancelled: true, groupId };
  }
}
