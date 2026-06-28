import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NatsResponse } from '@uniyous/nats-common';
import { PgProviderError } from '@uniyous/pg-provider';
import { DrizzleService } from '../db/drizzle.service';
import { payments, type PricingSnapshot } from '../db/schema';
import { isUniqueViolation } from '../common/db/db-error';
import { PgGatewayService } from './pg-gateway.service';
import { pgErrorToAppException } from './pg-error.map';

interface PgConfirmInput {
  bookingId: number;
  paymentKey: string;
  orderId: string;
  amount: number;
  clubId?: number;
  companyId?: number;
  staffId?: number;
  kioskId?: string;
  channel?: 'DESK' | 'PHONE' | 'WALK_IN' | 'KIOSK';
  pricingSnapshot?: PricingSnapshot;
}

/**
 * 온라인 PG 결제 (UNI-130 [3c-ii]) — frontdesk 간편결제·신용카드.
 * 클럽별 PG를 PgGatewayService로 resolve → 어댑터 호출 → payments 기록(provider·paymentKey·pgRaw).
 * 현장 수납(현금·카드단말)은 PaymentService.collect, 본 경로는 온라인 PG 전용.
 */
@Injectable()
export class PgPaymentService {
  private readonly logger = new Logger(PgPaymentService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly gateway: PgGatewayService,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  /** PG 결제 승인 — bookingId 멱등 */
  async confirm(input: PgConfirmInput) {
    const [existing] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, input.bookingId))
      .limit(1);
    if (existing) {
      this.logger.warn(`[PG] duplicate confirm: bookingId=${input.bookingId}, status=${existing.status}`);
      return NatsResponse.success({
        paymentId: existing.id,
        receiptId: existing.receiptId,
        status: existing.status,
        amount: existing.amount,
        provider: existing.provider,
        paymentKey: existing.paymentKey,
        duplicate: true,
      });
    }

    // 클럽별 PG resolve → 어댑터 승인 (정규화 에러는 payment 예외로 매핑)
    const { creds, port } = await this.gateway.resolveGateway(input.clubId, input.companyId);
    let result;
    try {
      result = await port.confirm(creds, {
        paymentKey: input.paymentKey,
        orderId: input.orderId,
        amount: input.amount,
      });
    } catch (e) {
      if (e instanceof PgProviderError) throw pgErrorToAppException(e);
      throw e;
    }

    const receiptId = `RCP-${input.bookingId}-${Date.now()}`;
    let created: typeof payments.$inferSelect;
    try {
      [created] = await this.db
        .insert(payments)
        .values({
          bookingId: input.bookingId,
          clubId: input.clubId,
          companyId: input.companyId,
          amount: input.amount,
          pricingSnapshot: input.pricingSnapshot,
          method: 'CARD', // 온라인 PG(카드·간편결제) — VAN/현금과는 provider로 구분
          provider: creds.provider,
          paymentKey: input.paymentKey,
          pgRaw: result.raw,
          channel: input.channel ?? 'DESK',
          status: 'COLLECTED',
          receiptId,
          staffId: input.staffId,
          kioskId: input.kioskId,
        })
        .returning();
    } catch (e) {
      // 동시 승인 재시도 — bookingId/paymentKey unique 위반은 멱등 재조회로 흡수
      if (isUniqueViolation(e)) {
        const [row] = await this.db.select().from(payments).where(eq(payments.bookingId, input.bookingId)).limit(1);
        if (row) {
          this.logger.warn(`[PG] concurrent confirm resolved idempotently: bookingId=${input.bookingId}`);
          return NatsResponse.success({
            paymentId: row.id,
            receiptId: row.receiptId,
            status: row.status,
            amount: row.amount,
            provider: row.provider,
            paymentKey: row.paymentKey,
            duplicate: true,
          });
        }
      }
      throw e;
    }

    this.logger.log(
      `[PG] confirmed: bookingId=${input.bookingId}, provider=${creds.provider}, paymentKey=${input.paymentKey}, receipt=${receiptId}`,
    );
    return NatsResponse.success({
      paymentId: created.id,
      receiptId: created.receiptId,
      status: created.status,
      amount: created.amount,
      provider: created.provider,
      paymentKey: created.paymentKey,
    });
  }

  /** PG 결제 취소(보상) — 미존재/이미 환불/현장결제면 멱등 no-op */
  async cancel(input: { bookingId: number; cancelReason?: string; cancelAmount?: number }) {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, input.bookingId))
      .limit(1);

    if (!row || row.status === 'REFUNDED' || !row.paymentKey || !row.provider) {
      this.logger.log(
        `[PG] cancel no-op: bookingId=${input.bookingId} (${row ? row.status : 'not_found'}${row && !row.paymentKey ? '/non-pg' : ''})`,
      );
      return NatsResponse.success({ refunded: true, noop: true });
    }

    const { creds, port } = await this.gateway.resolveGateway(row.clubId ?? undefined, row.companyId ?? undefined);
    try {
      await port.cancel(creds, {
        paymentKey: row.paymentKey,
        cancelReason: input.cancelReason ?? '예약 취소',
        cancelAmount: input.cancelAmount,
      });
    } catch (e) {
      if (e instanceof PgProviderError) throw pgErrorToAppException(e);
      throw e;
    }

    await this.db
      .update(payments)
      .set({ status: 'REFUNDED', refundedAt: new Date() })
      .where(eq(payments.bookingId, input.bookingId));

    this.logger.log(`[PG] cancelled: bookingId=${input.bookingId}, paymentKey=${row.paymentKey}`);
    return NatsResponse.success({ refunded: true });
  }
}
