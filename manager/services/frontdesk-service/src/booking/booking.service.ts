import { Injectable, Logger } from '@nestjs/common';
import { eq, and, count, desc, type SQL } from 'drizzle-orm';
import { NatsResponse } from '@uniyous/nats-common';
import { DrizzleService } from '../db/drizzle.service';
import { bookings, bookingPlayers } from '../db/schema';

type Channel = 'DESK' | 'PHONE' | 'WALK_IN' | 'KIOSK';

interface CreateBookingInput {
  clubId: number;
  companyId?: number;
  gameTimeSlotId: number;
  playerCount: number;
  channel: Channel;
  staffId?: number;
  kioskId?: string;
  totalPrice: number;
}

/**
 * 부킹 도메인 (UNI-114) — manager-saga CREATE_DESK_BOOKING·KIOSK_CHECKIN 계약 구현.
 * 슬롯 인벤토리는 club-service(slot.reserve), 수납은 payment-service. 여기선 예약 레코드·플레이어 단위.
 * ⚠️ totalPrice·플레이어 chargeAmount는 현재 입력 기반 placeholder — 요금 계산엔진은 UNI-132.
 */
@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  // ===== saga: 데스크 부킹 =====

  /** CREATE_DESK_BOOKING_RECORD — deskBookingData에서 예약 생성. saga mergeResponse가 clubId/totalPrice hoist */
  async createDeskBooking(input: { deskBookingData?: Record<string, unknown>; channel?: Channel; staffId?: number }) {
    const d = input.deskBookingData ?? {};
    return this.createBooking({
      clubId: Number(d.clubId),
      companyId: d.companyId != null ? Number(d.companyId) : undefined,
      gameTimeSlotId: Number(d.gameTimeSlotId),
      playerCount: Number(d.playerCount ?? 1),
      channel: input.channel ?? 'DESK',
      staffId: input.staffId,
      totalPrice: this.placeholderTotal(d),
    });
  }

  /** KIOSK_CHECKIN — 키오스크 체크인 예약 */
  async createKioskCheckin(input: {
    kioskId?: string;
    clubId: number;
    gameTimeSlotId: number;
    playerCount: number;
    companyId?: number;
    unitPrice?: number;
    totalPrice?: number;
  }) {
    return this.createBooking({
      clubId: Number(input.clubId),
      companyId: input.companyId != null ? Number(input.companyId) : undefined,
      gameTimeSlotId: Number(input.gameTimeSlotId),
      playerCount: Number(input.playerCount ?? 1),
      channel: 'KIOSK',
      kioskId: input.kioskId,
      totalPrice: this.placeholderTotal(input as Record<string, unknown>),
    });
  }

  /** 예약 확정 (CONFIRM_BOOKING / CONFIRM_CHECKIN) */
  async confirm(bookingId: number) {
    await this.db.update(bookings).set({ status: 'CONFIRMED' }).where(eq(bookings.id, bookingId));
    this.logger.log(`[Booking] confirmed: bookingId=${bookingId}`);
    return NatsResponse.success({ bookingId, status: 'CONFIRMED' });
  }

  /** 보상: 예약 실패 처리 (markFailed) — 멱등. bookingId 없으면 no-op(보상 payload 누락 대비) */
  async markFailed(bookingId?: number) {
    if (!bookingId) {
      this.logger.warn('[Booking] markFailed no-op: bookingId 누락');
      return NatsResponse.success({ skipped: true });
    }
    await this.db.update(bookings).set({ status: 'FAILED' }).where(eq(bookings.id, bookingId));
    this.logger.log(`[Booking] markFailed: bookingId=${bookingId}`);
    return NatsResponse.success({ bookingId, status: 'FAILED' });
  }

  // ===== 조회 (manager-bff) =====

  async list(filters: { clubId?: number; status?: string; channel?: Channel; page?: number; limit?: number }) {
    const { clubId, status, channel, page = 1, limit = 20 } = filters;
    const conds: SQL[] = [];
    if (clubId) conds.push(eq(bookings.clubId, clubId));
    if (status) conds.push(eq(bookings.status, status as 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED'));
    if (channel) conds.push(eq(bookings.channel, channel));
    const where = conds.length ? and(...conds) : undefined;

    const [rows, totalRows] = await Promise.all([
      this.db.select().from(bookings).where(where).orderBy(desc(bookings.createdAt)).limit(limit).offset((page - 1) * limit),
      this.db.select({ value: count() }).from(bookings).where(where),
    ]);
    return NatsResponse.paginated(rows, totalRows[0].value, page, limit);
  }

  async get(id: number) {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!booking) return NatsResponse.success({ error: 'Booking not found' });
    const players = await this.db.select().from(bookingPlayers).where(eq(bookingPlayers.bookingId, id));
    return NatsResponse.success({ ...booking, players });
  }

  // ===== 내부 =====

  /** 요금 계산엔진(UNI-132) 전까지 입력값 기반 placeholder */
  private placeholderTotal(d: Record<string, unknown>): number {
    const players = Number(d.playerCount ?? 1);
    if (d.totalPrice != null) return Number(d.totalPrice);
    return Number(d.unitPrice ?? 0) * players;
  }

  private async createBooking(b: CreateBookingInput) {
    const bookingNumber = `FD-${b.channel}-${Date.now()}`;
    const [created] = await this.db
      .insert(bookings)
      .values({
        bookingNumber,
        clubId: b.clubId,
        companyId: b.companyId,
        gameTimeSlotId: b.gameTimeSlotId,
        channel: b.channel,
        playerCount: b.playerCount,
        staffId: b.staffId,
        kioskId: b.kioskId,
        status: 'PENDING',
        totalPrice: b.totalPrice,
      })
      .returning();

    // 플레이어별 원장 단위 — chargeAmount는 균등 분할 placeholder(UNI-132에서 정식 계산)
    const unit = b.playerCount > 0 ? Math.floor(b.totalPrice / b.playerCount) : 0;
    const playerRows = Array.from({ length: b.playerCount }, (_, i) => ({
      bookingId: created.id,
      playerNo: i + 1,
      chargeAmount: i === b.playerCount - 1 ? b.totalPrice - unit * (b.playerCount - 1) : unit,
    }));
    if (playerRows.length) await this.db.insert(bookingPlayers).values(playerRows);

    this.logger.log(
      `[Booking] created: id=${created.id} ${bookingNumber} club=${b.clubId} slot=${b.gameTimeSlotId} players=${b.playerCount} total=${b.totalPrice}`,
    );
    return NatsResponse.success({
      bookingId: created.id,
      bookingNumber: created.bookingNumber,
      gameTimeSlotId: created.gameTimeSlotId,
      playerCount: created.playerCount,
      clubId: created.clubId,
      totalPrice: created.totalPrice,
    });
  }
}
