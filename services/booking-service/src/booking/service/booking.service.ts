import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { eq, and, or, inArray, gte, lte, lt, count, sum, asc, desc, sql, type SQL } from 'drizzle-orm';
import { DrizzleService, type DrizzleTx } from '../../db/drizzle.service';
import { bookings, bookingHistory, bookingParticipants, gameCache, gameTimeSlotCache, bookingOutboxEvents, teamSelections } from '../../db/schema';
import { BookingStatus, ParticipantStatus, ParticipantRole, TimeSlotCacheStatus, TeamSelectionStatus } from '../../contracts/enums';
import { UpdateBookingDto, BookingResponseDto, SearchBookingDto, GameTimeSlotAvailabilityDto } from '../dto/booking.dto';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { randomUUID } from 'crypto';
import { OutboxProcessorService } from './outbox-processor.service';
import { AppException } from '../../common/exceptions/app.exception';
import { Errors } from '../../common/exceptions/catalog/error-catalog';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly outboxProcessor: OutboxProcessorService,
    @Optional() @Inject('NOTIFICATION_SERVICE') private readonly notificationPublisher?: ClientProxy,
    @Optional() @Inject('CLUB_SERVICE') private readonly courseServiceClient?: ClientProxy,
    @Optional() @Inject('IAM_SERVICE') private readonly iamService?: ClientProxy,
    @Optional() @Inject('CHAT_SERVICE') private readonly chatClient?: ClientProxy,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  private generateBookingNumber(): string {
    const uuid = randomUUID().replace(/-/g, '').toUpperCase();
    return `BK-${uuid.slice(0, 8)}-${uuid.slice(8, 12)}`;
  }

  async getBookingById(id: number): Promise<BookingResponseDto | null> {
    const booking = await this.db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: { payments: true, participants: { orderBy: asc(bookingParticipants.id) }, histories: { orderBy: desc(bookingHistory.createdAt) } },
    });
    return booking ? BookingResponseDto.fromEntity(booking) : null;
  }

  async getBookingByNumber(bookingNumber: string): Promise<BookingResponseDto | null> {
    const booking = await this.db.query.bookings.findFirst({
      where: eq(bookings.bookingNumber, bookingNumber),
      with: { payments: true, participants: { orderBy: asc(bookingParticipants.id) }, histories: { orderBy: desc(bookingHistory.createdAt) } },
    });
    return booking ? BookingResponseDto.fromEntity(booking) : null;
  }

  async getBookingsByUserId(userId: number): Promise<BookingResponseDto[]> {
    const participantBookingIds = this.db.select({ id: bookingParticipants.bookingId }).from(bookingParticipants).where(eq(bookingParticipants.userId, userId));
    const rows = await this.db.query.bookings.findMany({
      where: or(eq(bookings.userId, userId), inArray(bookings.id, participantBookingIds)),
      orderBy: desc(bookings.createdAt),
      with: { payments: true, participants: { orderBy: asc(bookingParticipants.id) } },
    });
    return rows.map((booking) => BookingResponseDto.fromEntity(booking, false, userId));
  }

  async searchBookings(searchDto: SearchBookingDto): Promise<{ bookings: BookingResponseDto[]; total: number; page: number; limit: number }> {
    const {
      page = 1, limit = 10, status, gameId, clubId, companyId, userId, paymentMethod,
      startDate, endDate, sortBy = 'bookingDate', sortOrder = 'desc', timeFilter = 'all', includeAsParticipant = false,
    } = searchDto;

    const conds: SQL[] = [];
    if (status) conds.push(eq(bookings.status, status as BookingStatus));
    if (gameId) conds.push(eq(bookings.gameId, gameId));
    if (clubId) conds.push(eq(bookings.clubId, clubId));

    if (companyId && !clubId && this.courseServiceClient) {
      try {
        const clubsResult = await firstValueFrom(this.courseServiceClient.send('club.findByCompany', { companyId }).pipe(timeout(5000)));
        const clubIds = (clubsResult?.data || []).map((c: any) => c.id);
        if (clubIds.length > 0) conds.push(inArray(bookings.clubId, clubIds));
        else return { bookings: [], total: 0, page, limit };
      } catch (error) {
        this.logger.warn(`Failed to resolve clubIds for companyId=${companyId}: ${error.message}`);
      }
    }

    if (userId) {
      if (includeAsParticipant) {
        const participantBookingIds = this.db.select({ id: bookingParticipants.bookingId }).from(bookingParticipants).where(eq(bookingParticipants.userId, userId));
        conds.push(or(eq(bookings.userId, userId), inArray(bookings.id, participantBookingIds))!);
      } else {
        conds.push(eq(bookings.userId, userId));
      }
    }
    if (paymentMethod) conds.push(eq(bookings.paymentMethod, paymentMethod));

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (timeFilter === 'upcoming') conds.push(gte(bookings.bookingDate, now));
    else if (timeFilter === 'past') conds.push(lt(bookings.bookingDate, now));
    else {
      if (startDate) conds.push(gte(bookings.bookingDate, new Date(startDate)));
      if (endDate) conds.push(lte(bookings.bookingDate, new Date(endDate)));
    }

    const where = conds.length ? and(...conds) : undefined;
    const sortCol = (bookings as Record<string, any>)[sortBy] ?? bookings.bookingDate;
    const orderBy = sortOrder === 'asc' ? asc(sortCol) : desc(sortCol);

    const [rows, totalRows] = await Promise.all([
      this.db.query.bookings.findMany({
        where, orderBy, limit, offset: (page - 1) * limit,
        with: { payments: true, ...(includeAsParticipant ? { participants: { orderBy: asc(bookingParticipants.id) } } : {}) },
      }),
      this.db.select({ value: count() }).from(bookings).where(where),
    ]);

    const currentUserId = includeAsParticipant ? userId : undefined;
    return { bookings: BookingResponseDto.fromEntities(rows, true, currentUserId), total: totalRows[0].value, page, limit };
  }

  async updateBooking(id: number, dto: UpdateBookingDto): Promise<BookingResponseDto> {
    const booking = await this.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(bookings).where(eq(bookings.id, id)).limit(1);
      if (!existing) throw new AppException(Errors.Booking.NOT_FOUND);
      if (existing.status === BookingStatus.CANCELLED || existing.status === BookingStatus.COMPLETED) {
        throw new AppException(Errors.Booking.INVALID_STATUS);
      }
      const [updated] = await tx.update(bookings).set({ playerCount: dto.playerCount, specialRequests: dto.specialRequests, userPhone: dto.userPhone }).where(eq(bookings.id, id)).returning();
      await tx.insert(bookingHistory).values({ bookingId: id, action: 'UPDATED', userId: existing.userId!, details: JSON.parse(JSON.stringify(dto)) });
      return updated;
    });
    return BookingResponseDto.fromEntity(booking);
  }

  // 예약 취소 공통 로직 (트랜잭션 내에서 호출)
  private async executeCancellation(tx: DrizzleTx, existing: typeof bookings.$inferSelect, reason: string, historyDetails: Record<string, any>) {
    const [cancelled] = await tx.update(bookings).set({ status: BookingStatus.CANCELLED }).where(eq(bookings.id, existing.id)).returning();

    const [slotCache] = await tx.select().from(gameTimeSlotCache).where(eq(gameTimeSlotCache.gameTimeSlotId, existing.gameTimeSlotId)).limit(1);
    if (slotCache) {
      const newBookedPlayers = Math.max(0, slotCache.bookedPlayers - existing.playerCount);
      const newAvailablePlayers = slotCache.maxPlayers - newBookedPlayers;
      await tx.update(gameTimeSlotCache).set({
        bookedPlayers: newBookedPlayers, availablePlayers: newAvailablePlayers, isAvailable: true, status: TimeSlotCacheStatus.AVAILABLE, lastSyncAt: new Date(),
      }).where(eq(gameTimeSlotCache.gameTimeSlotId, existing.gameTimeSlotId));
    }

    await tx.insert(bookingHistory).values({ bookingId: existing.id, action: 'CANCELLED', userId: existing.userId!, details: { reason, ...historyDetails } });

    if (existing.paymentMethod === 'card' || existing.paymentMethod === 'dutchpay') {
      await tx.insert(bookingOutboxEvents).values({
        aggregateType: 'Booking', aggregateId: String(existing.id), eventType: 'payment.cancelByBookingId',
        payload: { bookingId: existing.id, cancelReason: reason }, status: 'PENDING',
      });
    }
    return cancelled;
  }

  async confirmBooking(id: number): Promise<BookingResponseDto> {
    const booking = await this.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(bookings).where(eq(bookings.id, id)).limit(1);
      if (!existing) throw new AppException(Errors.Booking.NOT_FOUND);
      if (existing.status !== BookingStatus.PENDING) throw new AppException(Errors.Booking.INVALID_STATUS, `현재 상태(${existing.status})에서는 확정할 수 없습니다`);
      const [confirmed] = await tx.update(bookings).set({ status: BookingStatus.CONFIRMED }).where(eq(bookings.id, id)).returning();
      await tx.insert(bookingHistory).values({ bookingId: id, action: 'CONFIRMED', userId: existing.userId!, details: { confirmedBy: 'admin' } });
      return confirmed;
    });
    await this.registerCompanyMember(booking.clubId, booking.userId);
    return BookingResponseDto.fromEntity(booking);
  }

  async completeBooking(id: number): Promise<BookingResponseDto> {
    const booking = await this.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(bookings).where(eq(bookings.id, id)).limit(1);
      if (!existing) throw new AppException(Errors.Booking.NOT_FOUND);
      if (existing.status !== BookingStatus.CONFIRMED) throw new AppException(Errors.Booking.INVALID_STATUS, `현재 상태(${existing.status})에서는 완료 처리할 수 없습니다`);
      const [completed] = await tx.update(bookings).set({ status: BookingStatus.COMPLETED }).where(eq(bookings.id, id)).returning();
      await tx.insert(bookingHistory).values({ bookingId: id, action: 'COMPLETED', userId: existing.userId!, details: { completedBy: 'admin' } });
      return completed;
    });
    return BookingResponseDto.fromEntity(booking);
  }

  async markNoShow(id: number): Promise<BookingResponseDto> {
    const booking = await this.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(bookings).where(eq(bookings.id, id)).limit(1);
      if (!existing) throw new AppException(Errors.Booking.NOT_FOUND);
      if (existing.status !== BookingStatus.CONFIRMED) throw new AppException(Errors.Booking.INVALID_STATUS, `현재 상태(${existing.status})에서는 노쇼 처리할 수 없습니다`);
      const [noShow] = await tx.update(bookings).set({ status: BookingStatus.NO_SHOW }).where(eq(bookings.id, id)).returning();
      await tx.insert(bookingHistory).values({ bookingId: id, action: 'NO_SHOW', userId: existing.userId!, details: { markedBy: 'admin' } });
      return noShow;
    });
    return BookingResponseDto.fromEntity(booking);
  }

  async getGameTimeSlotAvailability(gameId: number, date: string): Promise<GameTimeSlotAvailabilityDto[]> {
    const targetDate = new Date(date + 'T00:00:00.000Z');
    const slots = await this.db.select().from(gameTimeSlotCache).where(and(eq(gameTimeSlotCache.gameId, gameId), eq(gameTimeSlotCache.date, targetDate))).orderBy(asc(gameTimeSlotCache.startTime));
    return GameTimeSlotAvailabilityDto.fromEntities(slots);
  }

  async syncGameCache(data: {
    gameId: number; name: string; code: string; description?: string; frontNineCourseId: number; frontNineCourseName: string;
    backNineCourseId: number; backNineCourseName: string; totalHoles: number; estimatedDuration: number; breakDuration: number;
    maxPlayers: number; basePrice: number; weekendPrice?: number; holidayPrice?: number; clubId: number; clubName: string; isActive: boolean;
  }): Promise<void> {
    const values = {
      gameId: data.gameId, name: data.name, code: data.code, description: data.description,
      frontNineCourseId: data.frontNineCourseId, frontNineCourseName: data.frontNineCourseName, backNineCourseId: data.backNineCourseId, backNineCourseName: data.backNineCourseName,
      totalHoles: data.totalHoles, estimatedDuration: data.estimatedDuration, breakDuration: data.breakDuration, maxPlayers: data.maxPlayers,
      basePrice: data.basePrice, weekendPrice: data.weekendPrice, holidayPrice: data.holidayPrice, clubId: data.clubId, clubName: data.clubName, isActive: data.isActive,
    };
    await this.db.insert(gameCache).values(values).onConflictDoUpdate({ target: gameCache.gameId, set: { ...values, lastSyncAt: new Date(), updatedAt: new Date() } });
    this.logger.log(`Game cache synced for gameId: ${data.gameId}`);
  }

  async syncGameTimeSlotCache(data: {
    gameTimeSlotId: number; gameId: number; gameName?: string; gameCode?: string; frontNineCourseName?: string; backNineCourseName?: string;
    clubId?: number; clubName?: string; date: string; startTime: string; endTime: string; maxPlayers: number; bookedPlayers: number; price: number; isPremium: boolean; status: string;
  }): Promise<void> {
    const availablePlayers = data.maxPlayers - data.bookedPlayers;
    const status = (data.status as TimeSlotCacheStatus) || TimeSlotCacheStatus.AVAILABLE;
    const isAvailable = availablePlayers > 0 && status === TimeSlotCacheStatus.AVAILABLE;
    const values = {
      gameTimeSlotId: data.gameTimeSlotId, gameId: data.gameId, gameName: data.gameName, gameCode: data.gameCode,
      frontNineCourseName: data.frontNineCourseName, backNineCourseName: data.backNineCourseName, clubId: data.clubId, clubName: data.clubName,
      date: new Date(data.date), startTime: data.startTime, endTime: data.endTime, maxPlayers: data.maxPlayers, bookedPlayers: data.bookedPlayers,
      availablePlayers, isAvailable, price: data.price, isPremium: data.isPremium, status,
    };
    await this.db.insert(gameTimeSlotCache).values(values).onConflictDoUpdate({ target: gameTimeSlotCache.gameTimeSlotId, set: { ...values, lastSyncAt: new Date(), updatedAt: new Date() } });
    this.logger.log(`GameTimeSlot cache synced for gameTimeSlotId: ${data.gameTimeSlotId}`);
  }

  private async registerCompanyMember(clubId: number | null, userId: number | null): Promise<void> {
    if (!clubId || !userId || !this.courseServiceClient || !this.iamService) return;
    try {
      const clubResponse = await firstValueFrom(this.courseServiceClient.send('club.findOne', { id: clubId }));
      const companyId = clubResponse?.data?.companyId;
      if (!companyId) return;
      await firstValueFrom(this.iamService.send('iam.companyMembers.addByBooking', { companyId, userId }));
      this.logger.log(`CompanyMember registered: companyId=${companyId}, userId=${userId}`);
    } catch (error) {
      this.logger.warn(`Failed to register CompanyMember: clubId=${clubId}, userId=${userId}`, error?.message);
    }
  }

  async getBookingStats(dateRange: { startDate: string; endDate: string }) {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);
    const where = and(gte(bookings.bookingDate, startDate), lte(bookings.bookingDate, endDate));

    const [totalRows, statusGroups, revenueRows] = await Promise.all([
      this.db.select({ value: count() }).from(bookings).where(where),
      this.db.select({ status: bookings.status, count: count() }).from(bookings).where(where).groupBy(bookings.status),
      this.db.select({ sum: sum(bookings.totalPrice) }).from(bookings).where(where),
    ]);
    const totalBookings = totalRows[0].value;
    const statusMap = new Map(statusGroups.map((g) => [g.status, g.count]));
    const confirmedBookings = statusMap.get(BookingStatus.CONFIRMED) ?? 0;
    const cancelledBookings = statusMap.get(BookingStatus.CANCELLED) ?? 0;
    const completedBookings = statusMap.get(BookingStatus.COMPLETED) ?? 0;
    const pendingBookings = (statusMap.get(BookingStatus.PENDING) ?? 0) + (statusMap.get(BookingStatus.SLOT_RESERVED) ?? 0);
    const noShowBookings = statusMap.get(BookingStatus.NO_SHOW) ?? 0;

    const periodMs = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodMs - 1);
    const prevEnd = new Date(startDate.getTime() - 1);
    const [prevTotalRows] = await this.db.select({ value: count() }).from(bookings).where(and(gte(bookings.bookingDate, prevStart), lte(bookings.bookingDate, prevEnd)));
    const prevTotal = prevTotalRows.value;

    const bookingGrowthRate = prevTotal > 0 ? Math.round(((totalBookings - prevTotal) / prevTotal) * 100 * 10) / 10 : 0;
    const days = Math.max(1, Math.ceil(periodMs / (1000 * 60 * 60 * 24)));
    const averageBookingsPerDay = Math.round((totalBookings / days) * 10) / 10;
    const revenue = Number(revenueRows[0].sum ?? 0);

    return { totalBookings, confirmedBookings, cancelledBookings, completedBookings, pendingBookings, noShowBookings, bookingGrowthRate, averageBookingsPerDay, count: totalBookings, revenue };
  }

  async getClubOperationStats(clubId: number, dateRange: { startDate: string; endDate: string }) {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);
    const validStatuses = ['CONFIRMED', 'COMPLETED'];

    const gameStats = (await this.db.execute(sql`
      SELECT game_id AS "gameId", game_name AS "gameName", COUNT(*)::int AS "totalBookings",
        COALESCE(SUM(total_price), 0)::float AS "totalRevenue", COALESCE(AVG(price_per_person), 0)::float AS "averagePrice",
        COUNT(DISTINCT game_time_slot_id)::int AS "bookedSlots",
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM booking_date) IN (0, 6))::int AS "weekendBookings",
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM booking_date) NOT IN (0, 6))::int AS "weekdayBookings"
      FROM bookings WHERE club_id = ${clubId} AND booking_date >= ${startDate} AND booking_date <= ${endDate} AND status::text = ANY(${validStatuses})
      GROUP BY game_id, game_name ORDER BY COUNT(*) DESC
    `)) as unknown as Array<{ gameId: number; gameName: string | null; totalBookings: number; totalRevenue: number; averagePrice: number; bookedSlots: number; weekendBookings: number; weekdayBookings: number }>;

    const peakHoursRaw = (await this.db.execute(sql`
      SELECT game_id AS "gameId", start_time AS "startTime", COUNT(*)::int AS cnt
      FROM bookings WHERE club_id = ${clubId} AND booking_date >= ${startDate} AND booking_date <= ${endDate} AND status::text = ANY(${validStatuses})
      GROUP BY game_id, start_time ORDER BY game_id, cnt DESC
    `)) as unknown as Array<{ gameId: number; startTime: string; cnt: number }>;

    const peakHoursMap = new Map<number, string[]>();
    for (const row of peakHoursRaw) {
      const list = peakHoursMap.get(row.gameId) ?? [];
      if (list.length < 3) list.push(row.startTime);
      peakHoursMap.set(row.gameId, list);
    }

    const overallPeakTimes = (await this.db.execute(sql`
      SELECT start_time AS "startTime" FROM bookings
      WHERE club_id = ${clubId} AND booking_date >= ${startDate} AND booking_date <= ${endDate} AND status::text = ANY(${validStatuses})
      GROUP BY start_time ORDER BY COUNT(*) DESC LIMIT 3
    `)) as unknown as Array<{ startTime: string }>;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const [todayRows] = await this.db.select({ value: count() }).from(bookings).where(and(eq(bookings.clubId, clubId), gte(bookings.bookingDate, today), lte(bookings.bookingDate, todayEnd), inArray(bookings.status, [BookingStatus.CONFIRMED, BookingStatus.COMPLETED])));
    const todayBookings = todayRows.value;

    const totalBookings = gameStats.reduce((s, g) => s + g.totalBookings, 0);
    const totalRevenue = gameStats.reduce((s, g) => s + g.totalRevenue, 0);
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const monthlyRevenue = Math.round((totalRevenue / days) * 30);
    const topCourses = gameStats.filter((g) => g.gameName).slice(0, 3).map((g) => g.gameName as string);
    const totalBookedSlots = gameStats.reduce((s, g) => s + g.bookedSlots, 0);
    let averageUtilization = 0;

    if (this.courseServiceClient) {
      try {
        const slotStats = await firstValueFrom(this.courseServiceClient.send('gameTimeSlots.stats', { startDate: dateRange.startDate, endDate: dateRange.endDate, clubId }).pipe(timeout(5000), catchError(() => of(null))));
        const totalSlots = slotStats?.data?.totalSlots ?? slotStats?.totalSlots ?? 0;
        if (totalSlots > 0) averageUtilization = Math.round((totalBookedSlots / totalSlots) * 100 * 10) / 10;
      } catch {
        this.logger.warn(`Failed to fetch slot stats from club-service for clubId=${clubId}`);
      }
    }

    const analytics = gameStats.map((g) => ({
      gameId: g.gameId, gameName: g.gameName ?? `Game #${g.gameId}`, totalBookings: g.totalBookings, totalRevenue: g.totalRevenue,
      averagePrice: Math.round(g.averagePrice), bookedSlots: g.bookedSlots, weekdayBookings: g.weekdayBookings, weekendBookings: g.weekendBookings, peakHours: peakHoursMap.get(g.gameId) ?? [],
    }));

    return {
      stats: { totalBookings, totalRevenue, averageUtilization, monthlyRevenue, topCourses, peakTimes: overallPeakTimes.map((r) => r.startTime) },
      analytics,
      availability: { bookedToday: todayBookings },
    };
  }

  async getDashboardStats(dateRange: { startDate: string; endDate: string }) {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);

    const dailyGroups = await this.db
      .select({ bookingDate: bookings.bookingDate, count: count(), sum: sum(bookings.totalPrice) })
      .from(bookings)
      .where(and(gte(bookings.bookingDate, startDate), lte(bookings.bookingDate, endDate)))
      .groupBy(bookings.bookingDate)
      .orderBy(asc(bookings.bookingDate));

    const bookingsByDay = dailyGroups.map((g) => ({ date: g.bookingDate.toISOString().split('T')[0], count: g.count }));
    const revenue = dailyGroups.map((g) => ({ date: g.bookingDate.toISOString().split('T')[0], amount: Number(g.sum ?? 0) }));
    return { bookings: bookingsByDay, revenue, users: [], courseUtilization: [] };
  }

  async getUserStats(userId: number): Promise<{ totalBookings: number }> {
    const [row] = await this.db.select({ value: count() }).from(bookings).where(eq(bookings.userId, userId));
    return { totalBookings: row.value };
  }

  async hasActiveBookings(userId: number): Promise<boolean> {
    const [row] = await this.db.select({ value: count() }).from(bookings).where(and(eq(bookings.userId, userId), inArray(bookings.status, [BookingStatus.PENDING, BookingStatus.SLOT_RESERVED, BookingStatus.CONFIRMED])));
    return row.value > 0;
  }

  async anonymizeUserBookings(userId: number): Promise<number> {
    const rows = await this.db.update(bookings).set({ userName: '[삭제된 사용자]', userEmail: null, userPhone: null }).where(eq(bookings.userId, userId)).returning({ id: bookings.id });
    return rows.length;
  }

  async markParticipantPaid(bookingId: number, userId: number, userName?: string, userEmail?: string, amount?: number) {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) throw new AppException(Errors.Booking.NOT_FOUND);

    let [participant] = await this.db.select().from(bookingParticipants).where(and(eq(bookingParticipants.bookingId, bookingId), eq(bookingParticipants.userId, userId))).limit(1);

    if (!participant) {
      if (!userName || !userEmail) {
        this.logger.warn(`Participant not found and missing info: booking=${bookingId}, user=${userId}`);
        throw new AppException(Errors.Group.PARTICIPANT_NOT_FOUND);
      }
      const isBooker = booking.userId === userId;
      [participant] = await this.db.insert(bookingParticipants).values({
        bookingId, userId, userName, userEmail, role: isBooker ? ParticipantRole.BOOKER : ParticipantRole.MEMBER, status: ParticipantStatus.PENDING, amount: amount ?? Number(booking.pricePerPerson),
      }).returning();
      this.logger.log(`Auto-created participant: booking=${bookingId}, user=${userId} (${userName})`);
    }

    if (participant.status !== ParticipantStatus.PAID) {
      await this.db.update(bookingParticipants).set({ status: ParticipantStatus.PAID, paidAt: new Date() }).where(eq(bookingParticipants.id, participant.id));
    }

    const allParticipants = await this.db.select().from(bookingParticipants).where(eq(bookingParticipants.bookingId, bookingId));
    const paidCount = allParticipants.filter((p) => p.status === ParticipantStatus.PAID).length;
    const totalCount = allParticipants.length;
    const allPaid = paidCount === totalCount && totalCount >= booking.playerCount;

    if (allPaid && booking.status === BookingStatus.SLOT_RESERVED) {
      await this.db.transaction(async (tx) => {
        await tx.update(bookings).set({ status: BookingStatus.CONFIRMED }).where(eq(bookings.id, bookingId));
        await tx.insert(bookingHistory).values({ bookingId, action: 'PAYMENT_CONFIRMED', userId: booking.userId!, details: { paidCount, totalCount, confirmedAt: new Date().toISOString(), splitPayment: true } });
        await tx.insert(bookingHistory).values({ bookingId, action: 'CONFIRMED', userId: booking.userId!, details: { confirmedAt: new Date().toISOString(), paymentMethod: booking.paymentMethod, splitPayment: true } });
      });
      this.logger.log(`Booking ${bookingId} CONFIRMED — all ${totalCount} participants paid (split payment)`);
    }

    const settlementStatus = allPaid ? 'COMPLETED' : paidCount > 0 ? 'PARTIAL' : 'PENDING';
    return { settled: allPaid, paidCount, totalCount, settlementStatus };
  }

  async getSettlementStatus(bookingId: number) {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) throw new AppException(Errors.Booking.NOT_FOUND);

    const participants = await this.db.select().from(bookingParticipants).where(eq(bookingParticipants.bookingId, bookingId));
    const paidCount = participants.filter((p) => p.status === ParticipantStatus.PAID).length;
    const totalCount = participants.length;
    const allPaid = paidCount === totalCount && totalCount >= booking.playerCount;

    return {
      bookingId, bookingStatus: booking.status, allPaid, paidCount, totalCount, playerCount: booking.playerCount,
      settlementStatus: allPaid ? 'COMPLETED' : paidCount > 0 ? 'PARTIAL' : 'PENDING',
      participants: participants.map((p) => ({ userId: p.userId, userName: p.userName, amount: Number(p.amount), status: p.status, paidAt: p.paidAt?.toISOString() || null })),
    };
  }

  async cancelGroupBookings(groupId: string) {
    const groupBookings = await this.db.select().from(bookings).where(eq(bookings.groupId, groupId));
    if (groupBookings.length === 0) throw new AppException(Errors.Group.NOT_FOUND);

    const cancelledBookings = await this.db.transaction(async (tx) => {
      const results = [];
      for (const booking of groupBookings) {
        if (booking.status === BookingStatus.CANCELLED) continue;
        const cancelled = await this.executeCancellation(tx, booking, 'Group booking cancelled', { groupId });
        results.push(cancelled);
        await tx.update(bookingParticipants).set({ status: ParticipantStatus.CANCELLED }).where(eq(bookingParticipants.bookingId, booking.id));
      }
      await tx.update(teamSelections).set({ status: TeamSelectionStatus.CANCELLED }).where(eq(teamSelections.groupId, groupId));
      return results;
    });

    for (const booking of cancelledBookings) {
      if (this.courseServiceClient) {
        this.courseServiceClient.emit('gameTimeSlots.release', { timeSlotId: booking.gameTimeSlotId, playerCount: booking.playerCount });
      }
      if (this.notificationPublisher) {
        this.notificationPublisher.emit('booking.cancelled', {
          bookingId: booking.id, bookingNumber: booking.bookingNumber, userId: booking.userId, gameId: booking.gameId, gameName: booking.gameName,
          bookingDate: booking.bookingDate.toISOString(), timeSlot: booking.startTime, reason: 'Group booking cancelled', cancelledAt: new Date().toISOString(), userEmail: booking.userEmail, userName: booking.userName,
        });
      }
    }

    const hasCardPayment = cancelledBookings.some((b) => b.paymentMethod === 'card' || b.paymentMethod === 'dutchpay');
    if (hasCardPayment) setImmediate(() => this.outboxProcessor.triggerImmediate());

    return { cancelled: true, groupId };
  }
}
