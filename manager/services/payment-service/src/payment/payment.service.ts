import { Injectable, Logger } from '@nestjs/common';
import { eq, and, gte, lt, isNull, count, sum, type SQL } from 'drizzle-orm';
import { NatsResponse } from '@uniyous/nats-common';
import { DrizzleService } from '../db/drizzle.service';
import { isUniqueViolation } from '../common/db/db-error';
import { payments, paymentCloses } from '../db/schema';

interface CollectInput {
  bookingId: number;
  amount: number;
  method: 'CASH' | 'CARD';
  channel?: 'DESK' | 'PHONE' | 'WALK_IN' | 'KIOSK';
  staffId?: number;
  kioskId?: string;
  clubId?: number;
  companyId?: number;
}

/**
 * 현장 수납 도메인 (UNI-113) — manager-saga COLLECT_PAYMENT 계약 구현.
 * 외부 서비스 호출 없는 leaf — 기록·멱등·일마감만.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  /** 현장결제 기록 — bookingId 멱등(saga 재시도 안전) */
  async collect(input: CollectInput) {
    const [existing] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, input.bookingId))
      .limit(1);

    if (existing) {
      this.logger.warn(`[Payment] duplicate collect: bookingId=${input.bookingId}, status=${existing.status}`);
      return NatsResponse.success({
        paymentId: existing.id,
        receiptId: existing.receiptId,
        status: existing.status,
        amount: existing.amount,
        duplicate: true,
      });
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
          method: input.method,
          channel: input.channel ?? 'DESK',
          status: 'COLLECTED',
          receiptId,
          staffId: input.staffId,
          kioskId: input.kioskId,
        })
        .returning();
    } catch (e) {
      // 동시 재시도(select 통과 후 둘 다 insert) — unique(booking_id) 위반은 멱등 재조회로 흡수
      if (isUniqueViolation(e)) {
        const [row] = await this.db.select().from(payments).where(eq(payments.bookingId, input.bookingId)).limit(1);
        if (row) {
          this.logger.warn(`[Payment] concurrent collect resolved idempotently: bookingId=${input.bookingId}`);
          return NatsResponse.success({
            paymentId: row.id,
            receiptId: row.receiptId,
            status: row.status,
            amount: row.amount,
            duplicate: true,
          });
        }
      }
      throw e;
    }

    this.logger.log(`[Payment] collected: bookingId=${input.bookingId}, amount=${input.amount}, receipt=${receiptId}`);
    return NatsResponse.success({
      paymentId: created.id,
      receiptId: created.receiptId,
      status: created.status,
      amount: created.amount,
    });
  }

  /** 보상(환불) — 미존재/이미 환불이면 멱등 성공 */
  async refund(input: { bookingId: number }) {
    const [existing] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, input.bookingId))
      .limit(1);

    if (!existing || existing.status === 'REFUNDED') {
      this.logger.log(`[Payment] refund no-op: bookingId=${input.bookingId} (${existing?.status ?? 'not_found'})`);
      return NatsResponse.success({ refunded: true, noop: true });
    }

    await this.db
      .update(payments)
      .set({ status: 'REFUNDED', refundedAt: new Date() })
      .where(eq(payments.bookingId, input.bookingId));

    this.logger.log(`[Payment] refunded: bookingId=${input.bookingId}`);
    return NatsResponse.success({ refunded: true });
  }

  async list(filters: { clubId?: number; companyId?: number; status?: string; page?: number; limit?: number }) {
    const { clubId, companyId, status, page = 1, limit = 20 } = filters;
    const conds: SQL[] = [];
    if (clubId) conds.push(eq(payments.clubId, clubId));
    if (companyId) conds.push(eq(payments.companyId, companyId));
    if (status) conds.push(eq(payments.status, status as 'COLLECTED' | 'REFUNDED'));
    const where = conds.length ? and(...conds) : undefined;

    const [rows, totalRows] = await Promise.all([
      this.db.select().from(payments).where(where).limit(limit).offset((page - 1) * limit),
      this.db.select({ value: count() }).from(payments).where(where),
    ]);
    return NatsResponse.paginated(rows, totalRows[0].value, page, limit);
  }

  async get(id: number) {
    const [row] = await this.db.select().from(payments).where(eq(payments.id, id)).limit(1);
    if (!row) return NatsResponse.success({ error: 'Payment not found' });
    return NatsResponse.success(row);
  }

  /** 일마감 — 당일·클럽별 COLLECTED 집계 + payment_closes 레코드(date+club 멱등) */
  async dailyClose(input: { closeDate: string; clubId?: number; closedBy?: number; companyId?: number }) {
    // 일경계는 KST(영업일) 기준 — closeDate 00:00 KST(=전일 15:00 UTC)부터 24h
    const start = new Date(`${input.closeDate}T00:00:00+09:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const conds: SQL[] = [
      eq(payments.status, 'COLLECTED'),
      gte(payments.collectedAt, start),
      lt(payments.collectedAt, end),
    ];
    if (input.clubId) conds.push(eq(payments.clubId, input.clubId));
    if (input.companyId) conds.push(eq(payments.companyId, input.companyId)); // 테넌시 격리

    const [agg] = await this.db
      .select({ total: sum(payments.amount), cnt: count() })
      .from(payments)
      .where(and(...conds));

    const totalAmount = Number(agg.total ?? 0);
    const cnt = agg.cnt;

    const [existing] = await this.db
      .select()
      .from(paymentCloses)
      .where(and(eq(paymentCloses.closeDate, input.closeDate), input.clubId ? eq(paymentCloses.clubId, input.clubId) : isNull(paymentCloses.clubId)))
      .limit(1);

    if (existing) {
      await this.db
        .update(paymentCloses)
        .set({ totalAmount, count: cnt, closedBy: input.closedBy, closedAt: new Date() })
        .where(eq(paymentCloses.id, existing.id));
      this.logger.log(`[Payment] dailyClose updated: ${input.closeDate} club=${input.clubId} total=${totalAmount}`);
      return NatsResponse.success({ closeDate: input.closeDate, clubId: input.clubId, totalAmount, count: cnt, updated: true });
    }

    const [created] = await this.db
      .insert(paymentCloses)
      .values({
        closeDate: input.closeDate,
        clubId: input.clubId,
        companyId: input.companyId,
        totalAmount,
        count: cnt,
        closedBy: input.closedBy,
      })
      .returning();

    this.logger.log(`[Payment] dailyClose: ${input.closeDate} club=${input.clubId} total=${totalAmount} count=${cnt}`);
    return NatsResponse.success({ closeId: created.id, closeDate: input.closeDate, clubId: input.clubId, totalAmount, count: cnt });
  }
}
