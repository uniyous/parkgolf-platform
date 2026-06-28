import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { eq, and, inArray } from 'drizzle-orm';
import { NatsResponse } from '@uniyous/nats-common';
import { DrizzleService } from '../db/drizzle.service';
import { AppException, Errors } from '../common/exceptions';
import { bookings, bookingPlayers } from '../db/schema';

interface PaymentReply {
  success: boolean;
  data?: { checkoutId?: number; receiptId?: string; amount?: number; [k: string]: unknown };
  error?: { message?: string };
}

/**
 * 체크아웃 플로우 (UNI-134) — frontdesk 오케스트레이션.
 * 입장(checkin)과 수납(pay)은 독립. 수납은 선택 플레이어를 묶어 payment.checkout.create 호출(모두/개별/N명분 1인).
 */
@Injectable()
export class CheckoutFlowService {
  private readonly logger = new Logger(CheckoutFlowService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  /** 입장 — 수납과 독립(선입장-후결제 허용). 플레이어 미지정 시 전원 */
  async checkin(input: { bookingId: number; bookingPlayerIds?: number[] }) {
    const now = new Date();
    const where = input.bookingPlayerIds?.length
      ? and(eq(bookingPlayers.bookingId, input.bookingId), inArray(bookingPlayers.id, input.bookingPlayerIds))
      : eq(bookingPlayers.bookingId, input.bookingId);
    await this.db.update(bookingPlayers).set({ checkedInAt: now }).where(where);
    this.logger.log(`[Checkout] checkin: booking=${input.bookingId} players=${input.bookingPlayerIds?.join(',') ?? 'all'}`);
    return NatsResponse.success({ bookingId: input.bookingId, checkedInAt: now });
  }

  /** 수납 — 선택 플레이어 묶어 1 checkout. 성공 시 paymentStatus=PAID */
  async pay(input: { bookingId: number; bookingPlayerIds: number[]; method: 'CASH' | 'CARD'; staffId?: number; idempotencyKey?: string }) {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, input.bookingId)).limit(1);
    if (!booking) throw new AppException(Errors.Booking.NOT_FOUND, `bookingId=${input.bookingId}`);
    if (!input.bookingPlayerIds?.length) throw new AppException(Errors.Validation.INVALID_INPUT, 'bookingPlayerIds 비어있음');

    const players = await this.db
      .select()
      .from(bookingPlayers)
      .where(and(eq(bookingPlayers.bookingId, input.bookingId), inArray(bookingPlayers.id, input.bookingPlayerIds)));
    if (players.length !== input.bookingPlayerIds.length) {
      throw new AppException(Errors.Validation.INVALID_INPUT, '예약에 속하지 않는 플레이어 포함');
    }
    if (players.some((p) => p.paymentStatus === 'PAID')) {
      throw new AppException(Errors.Booking.INVALID_STATE, '이미 수납된 플레이어 포함');
    }

    const allocations = players.map((p) => ({ bookingPlayerId: p.id, amount: p.chargeAmount }));
    const reply = await this.callPayment('payment.checkout.create', {
      bookingId: input.bookingId,
      clubId: booking.clubId,
      companyId: booking.companyId,
      method: input.method,
      allocations,
      staffId: input.staffId ?? booking.staffId,
      kioskId: booking.kioskId,
      channel: booking.channel,
      idempotencyKey: input.idempotencyKey,
    });
    const data = reply.data;
    if (!data?.checkoutId) {
      throw new AppException(Errors.External.UNAVAILABLE, reply.error?.message ?? 'checkout 생성 실패');
    }

    await this.db.update(bookingPlayers).set({ paymentStatus: 'PAID' }).where(inArray(bookingPlayers.id, players.map((p) => p.id)));
    this.logger.log(`[Checkout] paid: booking=${input.bookingId} checkout=${data.checkoutId} players=${players.length} amount=${data.amount}`);
    return NatsResponse.success({
      checkoutId: data.checkoutId,
      receiptId: data.receiptId,
      amount: data.amount,
      paidPlayers: players.map((p) => p.id),
    });
  }

  /** 체크아웃 취소(환불) — payment 취소 + 커버 플레이어 paymentStatus 환원 */
  async cancel(input: { checkoutId: number; bookingPlayerIds?: number[]; reason?: string }) {
    const reply = await this.callPayment('payment.checkout.cancel', { checkoutId: input.checkoutId, reason: input.reason });
    if (!reply.success) {
      throw new AppException(Errors.External.UNAVAILABLE, reply.error?.message ?? 'checkout 취소 실패');
    }
    if (input.bookingPlayerIds?.length) {
      await this.db.update(bookingPlayers).set({ paymentStatus: 'REFUNDED' }).where(inArray(bookingPlayers.id, input.bookingPlayerIds));
    }
    this.logger.log(`[Checkout] cancelled: checkout=${input.checkoutId}`);
    return NatsResponse.success({ refunded: true, checkoutId: input.checkoutId });
  }

  /** 예약 체크아웃 현황 — 플레이어 입장·수납 상태 + checkout 목록 */
  async status(bookingId: number) {
    const players = await this.db.select().from(bookingPlayers).where(eq(bookingPlayers.bookingId, bookingId));
    const reply = await this.callPayment('payment.checkout.listByBooking', { bookingId });
    return NatsResponse.success({ bookingId, players, payment: reply.data ?? null });
  }

  private async callPayment(pattern: string, payload: Record<string, unknown>): Promise<PaymentReply> {
    try {
      const reply = await firstValueFrom(this.paymentClient.send<PaymentReply>(pattern, payload).pipe(timeout(15000)));
      return reply ?? { success: false };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new AppException(Errors.External.UNAVAILABLE, `${pattern} 실패: ${msg}`);
    }
  }
}
