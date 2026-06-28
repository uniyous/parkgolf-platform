import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NatsResponse } from '@uniyous/nats-common';
import { PgProviderError } from '@uniyous/pg-provider';
import { DrizzleService } from '../db/drizzle.service';
import { payments, type PricingSnapshot } from '../db/schema';
import { isUniqueViolation } from '../common/db/db-error';
import { AppException, Errors } from '../common/exceptions';
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
 *
 * confirm은 **reserve-then-charge**: bookingId/paymentKey를 PENDING 행으로 먼저 선점한 뒤 청구.
 * 동시 요청은 선점 단계의 unique 위반으로 차단되어 **이중·orphan 청구를 방지**.
 * cancel은 결제 시 사용한 `pgConfigId`로 **동일 PG 계정**을 고정해 취소.
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

  private duplicate(row: typeof payments.$inferSelect) {
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

  /** PG 결제 승인 — reserve-then-charge (bookingId/paymentKey 멱등) */
  async confirm(input: PgConfirmInput) {
    const [existing] = await this.db.select().from(payments).where(eq(payments.bookingId, input.bookingId)).limit(1);
    if (existing) {
      // 직전 시도가 FAILED면 청구가 일어나지 않았으므로 재시도 허용(행 제거)
      if (existing.status === 'FAILED') {
        await this.db.delete(payments).where(eq(payments.id, existing.id));
      } else {
        this.logger.warn(`[PG] duplicate confirm: bookingId=${input.bookingId}, status=${existing.status}`);
        return this.duplicate(existing);
      }
    }

    // resolve (청구 없음 — DB·시크릿 읽기만)
    const { creds, port, configId } = await this.gateway.resolveGateway(input.clubId, input.companyId);

    // 1) 선점 — PENDING 행(청구 전). 동시 요청은 여기 unique 위반으로 차단
    const receiptId = `RCP-${input.bookingId}-${Date.now()}`;
    let reserved: typeof payments.$inferSelect;
    try {
      [reserved] = await this.db
        .insert(payments)
        .values({
          bookingId: input.bookingId,
          clubId: input.clubId,
          companyId: input.companyId,
          amount: input.amount,
          pricingSnapshot: input.pricingSnapshot,
          method: 'CARD', // 온라인 PG — VAN/현금과는 provider로 구분
          provider: creds.provider,
          paymentKey: input.paymentKey,
          pgConfigId: configId,
          channel: input.channel ?? 'DESK',
          status: 'PENDING',
          receiptId,
          staffId: input.staffId,
          kioskId: input.kioskId,
        })
        .returning();
    } catch (e) {
      // 동시 선점(bookingId 또는 paymentKey unique) — 멱등 재조회
      if (isUniqueViolation(e)) {
        const [row] =
          (await this.db.select().from(payments).where(eq(payments.bookingId, input.bookingId)).limit(1)) ?? [];
        if (row) {
          this.logger.warn(`[PG] concurrent confirm reserved elsewhere: bookingId=${input.bookingId}`);
          return this.duplicate(row);
        }
        const [byKey] =
          (await this.db.select().from(payments).where(eq(payments.paymentKey, input.paymentKey)).limit(1)) ?? [];
        if (byKey) return this.duplicate(byKey);
      }
      throw e;
    }

    // 2) 청구 — 선점 성공 후라 단일 요청만 도달
    let result;
    try {
      result = await port.confirm(creds, {
        paymentKey: input.paymentKey,
        orderId: input.orderId,
        amount: input.amount,
      });
    } catch (e) {
      // 청구 실패 → 선점 행 FAILED(재시도는 새 paymentKey로)
      await this.db.update(payments).set({ status: 'FAILED' }).where(eq(payments.id, reserved.id));
      if (e instanceof PgProviderError) throw pgErrorToAppException(e);
      throw e;
    }

    // 3) 확정
    const [updated] = await this.db
      .update(payments)
      .set({ status: 'COLLECTED', pgRaw: result.raw })
      .where(eq(payments.id, reserved.id))
      .returning();

    this.logger.log(
      `[PG] confirmed: bookingId=${input.bookingId}, provider=${creds.provider}, paymentKey=${input.paymentKey}, receipt=${receiptId}`,
    );
    return NatsResponse.success({
      paymentId: updated.id,
      receiptId: updated.receiptId,
      status: updated.status,
      amount: updated.amount,
      provider: updated.provider,
      paymentKey: updated.paymentKey,
    });
  }

  /** PG 결제 취소(보상) — 결제 시 config 고정. 비-COLLECTED/현장결제면 멱등 no-op */
  async cancel(input: { bookingId: number; cancelReason?: string; cancelAmount?: number }) {
    const [row] = await this.db.select().from(payments).where(eq(payments.bookingId, input.bookingId)).limit(1);

    if (!row || row.status !== 'COLLECTED' || !row.paymentKey || !row.provider) {
      this.logger.log(`[PG] cancel no-op: bookingId=${input.bookingId} (${row ? row.status : 'not_found'})`);
      return NatsResponse.success({ refunded: true, noop: true });
    }
    if (row.pgConfigId == null) {
      throw new AppException(Errors.Payment.PG_CONFIG_NOT_FOUND, `bookingId=${input.bookingId} pgConfigId 없음`);
    }

    // 결제 시 사용한 config로 고정(active 무관) → 동일 PG 계정으로 취소
    const { creds, port } = await this.gateway.gatewayForConfig(row.pgConfigId);
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
