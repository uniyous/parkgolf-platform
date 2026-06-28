import { Injectable, Logger } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { NatsResponse } from '@uniyous/nats-common';
import { DrizzleService } from '../db/drizzle.service';
import { payments, checkoutAllocations } from '../db/schema';
import { isUniqueViolation } from '../common/db/db-error';
import { AppException, Errors } from '../common/exceptions';

interface Allocation {
  bookingPlayerId: number;
  amount: number;
}

interface CreateCheckoutInput {
  bookingId: number;
  clubId?: number;
  companyId?: number;
  method: 'CASH' | 'CARD';
  allocations: Allocation[];
  staffId?: number;
  kioskId?: string;
  channel?: 'DESK' | 'PHONE' | 'WALK_IN' | 'KIOSK';
  idempotencyKey?: string;
}

/**
 * 체크아웃 수납 (UNI-133) — payment(checkout) 1건이 booking_player 다수를 커버(allocation).
 * 모두/개별/N명분 1인 결제 = allocation 조합. 플레이어 활성 수납 1건(이중수납 방지).
 * ※ 현장(현금·카드단말) 기록. PG checkout(온라인)은 payment.pg.* + allocation 연동 후속.
 */
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  /** 선택 플레이어 묶어 수납 — bookingPlayerId별 활성 1건 */
  async create(input: CreateCheckoutInput) {
    if (input.idempotencyKey) {
      const [dup] = await this.db.select().from(payments).where(eq(payments.idempotencyKey, input.idempotencyKey)).limit(1);
      if (dup) return this.result(dup, true);
    }
    if (!input.allocations?.length) {
      throw new AppException(Errors.Payment.CHECKOUT_INVALID, 'allocations 비어있음');
    }
    if (input.allocations.some((a) => !Number.isInteger(a.bookingPlayerId) || !Number.isFinite(a.amount) || a.amount < 0)) {
      throw new AppException(Errors.Payment.CHECKOUT_INVALID, 'allocation 값 오류');
    }
    const playerIds = input.allocations.map((a) => a.bookingPlayerId);

    // 이미 활성 수납된 플레이어 거부
    const activeRows = await this.db
      .select()
      .from(checkoutAllocations)
      .where(and(inArray(checkoutAllocations.bookingPlayerId, playerIds), eq(checkoutAllocations.status, 'ACTIVE')));
    if (activeRows.length) {
      throw new AppException(Errors.Payment.ALREADY_PAID, `플레이어 ${activeRows.map((r) => r.bookingPlayerId).join(',')}`);
    }

    const amount = input.allocations.reduce((s, a) => s + a.amount, 0);
    const receiptId = `RCP-${input.bookingId}-${Date.now()}`;
    let payment: typeof payments.$inferSelect;
    try {
      [payment] = await this.db
        .insert(payments)
        .values({
          bookingId: input.bookingId,
          clubId: input.clubId,
          companyId: input.companyId,
          amount,
          method: input.method,
          channel: input.channel ?? 'DESK',
          status: 'COLLECTED',
          receiptId,
          staffId: input.staffId,
          kioskId: input.kioskId,
          idempotencyKey: input.idempotencyKey,
        })
        .returning();
      await this.db.insert(checkoutAllocations).values(
        input.allocations.map((a) => ({
          paymentId: payment.id,
          bookingId: input.bookingId,
          bookingPlayerId: a.bookingPlayerId,
          amount: a.amount,
          status: 'ACTIVE' as const,
        })),
      );
    } catch (e) {
      // 동시 요청 — idempotencyKey 또는 플레이어 활성 unique 위반
      if (isUniqueViolation(e)) {
        if (input.idempotencyKey) {
          const [dup] = await this.db.select().from(payments).where(eq(payments.idempotencyKey, input.idempotencyKey)).limit(1);
          if (dup) return this.result(dup, true);
        }
        throw new AppException(Errors.Payment.ALREADY_PAID, '동시 수납 충돌');
      }
      throw e;
    }

    this.logger.log(`[Checkout] created: id=${payment.id} booking=${input.bookingId} amount=${amount} players=${playerIds.length}`);
    return this.result(payment, false);
  }

  /** 체크아웃 취소(환불) — 커버 플레이어 활성 해제. 미존재/이미 환불이면 멱등 */
  async cancel(input: { checkoutId: number; reason?: string }) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.id, input.checkoutId)).limit(1);
    if (!payment || payment.status === 'REFUNDED') {
      return NatsResponse.success({ refunded: true, noop: true });
    }
    await this.db.update(payments).set({ status: 'REFUNDED', refundedAt: new Date() }).where(eq(payments.id, input.checkoutId));
    await this.db
      .update(checkoutAllocations)
      .set({ status: 'REFUNDED' })
      .where(and(eq(checkoutAllocations.paymentId, input.checkoutId), eq(checkoutAllocations.status, 'ACTIVE')));
    this.logger.log(`[Checkout] cancelled: id=${input.checkoutId} reason=${input.reason ?? ''}`);
    return NatsResponse.success({ refunded: true, checkoutId: input.checkoutId });
  }

  async get(checkoutId: number) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.id, checkoutId)).limit(1);
    if (!payment) return NatsResponse.success({ error: 'Checkout not found' });
    const allocations = await this.db.select().from(checkoutAllocations).where(eq(checkoutAllocations.paymentId, checkoutId));
    return NatsResponse.success({ ...payment, allocations });
  }

  /** booking의 모든 checkout + 플레이어 수납 현황 */
  async listByBooking(bookingId: number) {
    const checkouts = await this.db.select().from(payments).where(eq(payments.bookingId, bookingId));
    const allocations = await this.db.select().from(checkoutAllocations).where(eq(checkoutAllocations.bookingId, bookingId));
    return NatsResponse.success({ bookingId, checkouts, allocations });
  }

  private async result(payment: typeof payments.$inferSelect, duplicate: boolean) {
    const allocations = await this.db.select().from(checkoutAllocations).where(eq(checkoutAllocations.paymentId, payment.id));
    return NatsResponse.success({
      checkoutId: payment.id,
      receiptId: payment.receiptId,
      amount: payment.amount,
      status: payment.status,
      method: payment.method,
      allocations,
      duplicate,
    });
  }
}
