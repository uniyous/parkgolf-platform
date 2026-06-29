import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { eq, and, count, desc, type SQL } from 'drizzle-orm';
import { NatsResponse } from '@uniyous/nats-common';
import { DrizzleService } from '../db/drizzle.service';
import { AppException, Errors } from '../common/exceptions';
import { bookings, bookingPlayers, bookingChargeLines } from '../db/schema';

type Channel = 'DESK' | 'PHONE' | 'WALK_IN' | 'KIOSK';

interface PlayerInput {
  memberContext?: Record<string, unknown>; // 개인 할인 자격
  surcharges?: Array<{ label: string; amount: number }>; // 부가항목(카트·식음료)
}

interface CreateBookingInput {
  clubId: number;
  companyId?: number;
  gameTimeSlotId: number;
  channel: Channel;
  staffId?: number;
  kioskId?: string;
  players: PlayerInput[]; // 플레이어별(개인차) — length = 인원
}

interface QuoteLine {
  type: 'BASE' | 'DISCOUNT' | 'SURCHARGE';
  label: string;
  qty: number;
  unitAmount: number;
  amount: number;
  source: string | null;
  sourceRef: number | null;
}
interface QuotePlayer {
  playerNo: number;
  unitPrice: number;
  lines: QuoteLine[];
  total: number;
}
interface QuoteResult {
  clubId: number;
  gameTimeSlotId: number;
  playerCount: number;
  unitPrice: number;
  total: number;
  players: QuotePlayer[];
  snapshot: Record<string, unknown>;
}

/**
 * 부킹 도메인 (UNI-114 / UNI-132) — manager-saga CREATE_DESK_BOOKING·KIOSK_CHECKIN 계약 구현.
 * 부킹 시 club-service `pricing.quote`로 항목별 요금 계산 → 예약 원장(booking_charge_lines) 동결.
 * 슬롯 인벤토리는 club(slot.reserve), 수납은 payment-service. PricingSnapshot은 COLLECT_PAYMENT로 전달.
 */
@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    @Inject('CLUB_SERVICE') private readonly clubClient: ClientProxy,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  // ===== saga: 데스크 부킹 =====

  /** CREATE_DESK_BOOKING_RECORD — deskBookingData에서 예약 생성. saga mergeResponse가 clubId/totalPrice/pricingSnapshot hoist */
  async createDeskBooking(input: { deskBookingData?: Record<string, unknown>; channel?: Channel; staffId?: number }) {
    const d = input.deskBookingData ?? {};
    return this.createBooking({
      clubId: Number(d.clubId),
      companyId: d.companyId != null ? Number(d.companyId) : undefined,
      gameTimeSlotId: Number(d.gameTimeSlotId),
      channel: input.channel ?? 'DESK',
      staffId: input.staffId,
      players: this.resolvePlayers(d),
    });
  }

  /** KIOSK_CHECKIN — 키오스크 체크인 예약 */
  async createKioskCheckin(input: {
    kioskId?: string;
    clubId: number;
    gameTimeSlotId: number;
    playerCount: number;
    companyId?: number;
  }) {
    return this.createBooking({
      clubId: Number(input.clubId),
      companyId: input.companyId != null ? Number(input.companyId) : undefined,
      gameTimeSlotId: Number(input.gameTimeSlotId),
      channel: 'KIOSK',
      kioskId: input.kioskId,
      players: Array.from({ length: Number(input.playerCount ?? 1) }, () => ({})),
    });
  }

  /** deskBookingData → 플레이어별 입력. players[] 있으면 사용, 없으면 playerCount만큼 균일 */
  private resolvePlayers(d: Record<string, unknown>): PlayerInput[] {
    if (Array.isArray(d.players) && d.players.length) {
      return (d.players as Array<Record<string, unknown>>).map((p) => ({
        memberContext: p.memberContext && typeof p.memberContext === 'object' ? (p.memberContext as Record<string, unknown>) : undefined,
        surcharges: Array.isArray(p.surcharges) ? (p.surcharges as Array<{ label: string; amount: number }>) : undefined,
      }));
    }
    return Array.from({ length: Number(d.playerCount ?? 1) }, () => ({}));
  }

  /** 예약 확정 (CONFIRM_BOOKING / CONFIRM_CHECKIN) */
  async confirm(bookingId: number) {
    await this.db.update(bookings).set({ status: 'CONFIRMED' }).where(eq(bookings.id, bookingId));
    this.logger.log(`[Booking] confirmed: bookingId=${bookingId}`);
    return NatsResponse.success({ bookingId, status: 'CONFIRMED' });
  }

  /** 보상: 예약 실패 처리 (markFailed) — 멱등. bookingId 없으면 no-op */
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
    const lines = await this.db.select().from(bookingChargeLines).where(eq(bookingChargeLines.bookingId, id));
    return NatsResponse.success({ ...booking, players, chargeLines: lines });
  }

  // ===== 내부 =====

  /** club-service 플레이어별 요금 계산엔진 호출 — 각 플레이어 lines·total·PricingSnapshot */
  private async quote(input: { clubId: number; gameTimeSlotId: number; companyId?: number; players: PlayerInput[] }): Promise<QuoteResult> {
    let res: { success: boolean; data: QuoteResult } | undefined;
    try {
      res = await firstValueFrom(
        this.clubClient.send<{ success: boolean; data: QuoteResult }>('pricing.quote', input).pipe(timeout(10000)),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new AppException(Errors.External.UNAVAILABLE, `pricing.quote 실패: ${msg}`);
    }
    const data = res?.data;
    if (!data || typeof data.total !== 'number' || !Array.isArray(data.players)) {
      throw new AppException(Errors.External.UNAVAILABLE, 'pricing.quote 응답 오류');
    }
    return data;
  }

  private async createBooking(b: CreateBookingInput) {
    if (!Number.isInteger(b.clubId) || b.clubId <= 0) {
      throw new AppException(Errors.Validation.INVALID_INPUT, `clubId 누락/오류: ${b.clubId}`);
    }
    if (!Number.isInteger(b.gameTimeSlotId) || b.gameTimeSlotId <= 0) {
      throw new AppException(Errors.Validation.INVALID_INPUT, `gameTimeSlotId 누락/오류: ${b.gameTimeSlotId}`);
    }
    if (!b.players?.length) {
      throw new AppException(Errors.Booking.INVALID_PLAYER_COUNT, 'players 비어있음');
    }

    // 플레이어별 요금 계산 — club 권위. 실패 시 step 실패 → saga 보상
    const quote = await this.quote({ clubId: b.clubId, gameTimeSlotId: b.gameTimeSlotId, companyId: b.companyId, players: b.players });
    const playerCount = quote.players.length;
    const totalPrice = quote.total;

    const suffix = Math.floor(Math.random() * 1e4)
      .toString()
      .padStart(4, '0');
    const bookingNumber = `FD-${b.channel}-${Date.now()}-${suffix}`;
    const [created] = await this.db
      .insert(bookings)
      .values({
        bookingNumber,
        clubId: b.clubId,
        companyId: b.companyId,
        gameTimeSlotId: b.gameTimeSlotId,
        channel: b.channel,
        playerCount,
        staffId: b.staffId,
        kioskId: b.kioskId,
        status: 'PENDING',
        totalPrice,
      })
      .returning();

    // 플레이어별 booking_player(chargeAmount = 본인 견적 합)
    const insertedPlayers = await this.db
      .insert(bookingPlayers)
      .values(quote.players.map((p) => ({ bookingId: created.id, playerNo: p.playerNo, chargeAmount: p.total })))
      .returning();
    const playerIdByNo = new Map(insertedPlayers.map((p) => [p.playerNo, p.id]));

    // 플레이어별 원장 항목 동결
    const lineRows = quote.players.flatMap((p) =>
      p.lines.map((l) => ({
        bookingId: created.id,
        bookingPlayerId: playerIdByNo.get(p.playerNo)!,
        type: l.type,
        label: l.label,
        qty: l.qty,
        unitAmount: l.unitAmount,
        amount: l.amount,
        source: l.source,
        sourceRef: l.sourceRef,
      })),
    );
    if (lineRows.length) await this.db.insert(bookingChargeLines).values(lineRows);

    this.logger.log(
      `[Booking] created: id=${created.id} ${bookingNumber} club=${b.clubId} slot=${b.gameTimeSlotId} players=${playerCount} total=${totalPrice} (lines=${lineRows.length})`,
    );
    return NatsResponse.success({
      bookingId: created.id,
      bookingNumber: created.bookingNumber,
      gameTimeSlotId: created.gameTimeSlotId,
      playerCount: created.playerCount,
      clubId: created.clubId,
      totalPrice,
      pricingSnapshot: quote.snapshot,
    });
  }
}
