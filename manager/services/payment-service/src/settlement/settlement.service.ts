import { Injectable, Logger } from '@nestjs/common';
import { and, eq, gte, lt, sum, count, desc, type SQL } from 'drizzle-orm';
import { NatsResponse } from '@uniyous/nats-common';
import type { PgProviderName } from '@uniyous/pg-provider';
import { DrizzleService } from '../db/drizzle.service';
import { payments, settlements } from '../db/schema';
import { AppException, Errors } from '../common/exceptions';
import { PgConfigResolver } from '../pg/pg-config.resolver';

type Cycle = 'DAILY' | 'WEEKLY' | 'MONTHLY';
type SettlementStatus = 'PENDING' | 'RECONCILED' | 'PAID';

interface RunInput {
  clubId: number;
  companyId?: number;
  provider: PgProviderName;
  cycle: Cycle;
  periodKey: string;
  /** 명시 기간(WEEKLY 등). 미지정 시 DAILY/MONTHLY는 periodKey에서 KST로 산출 */
  periodStart?: string;
  periodEnd?: string;
}

/**
 * PG 정산 (UNI-131 [4]) — 클럽 × provider × 주기 단위 집계.
 * gross(COLLECTED) − refund(REFUNDED) = net, fee = net × feeRate(클럽 PG 계약), payout = net − fee.
 * 기간 산출은 KST 기준. 스케줄(주기별 자동 실행)은 후속(job).
 */
@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly resolver: PgConfigResolver,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  /** cycle+periodKey → [start, end) (KST). 명시 start/end 우선 */
  private window(cycle: Cycle, periodKey: string, startISO?: string, endISO?: string): { start: Date; end: Date } {
    if (startISO && endISO) return { start: new Date(startISO), end: new Date(endISO) };
    if (cycle === 'DAILY') {
      const start = new Date(`${periodKey}T00:00:00+09:00`); // YYYY-MM-DD
      return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
    }
    if (cycle === 'MONTHLY') {
      const [y, m] = periodKey.split('-').map(Number); // YYYY-MM
      if (!y || !m) throw new AppException(Errors.Validation.INVALID_INPUT, `periodKey 형식 오류: ${periodKey}`);
      const start = new Date(`${periodKey}-01T00:00:00+09:00`);
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
      return { start, end: new Date(`${next}-01T00:00:00+09:00`) };
    }
    // WEEKLY 등은 명시 기간 필요
    throw new AppException(Errors.Validation.INVALID_INPUT, `${cycle}는 periodStart/periodEnd 필요`);
  }

  /** 정산 산출·upsert (club·provider·cycle·periodKey 멱등). 기존 status는 보존 */
  async run(input: RunInput) {
    const { start, end } = this.window(input.cycle, input.periodKey, input.periodStart, input.periodEnd);

    const [grossAgg] = await this.db
      .select({ total: sum(payments.amount), cnt: count() })
      .from(payments)
      .where(
        and(
          eq(payments.clubId, input.clubId),
          eq(payments.provider, input.provider),
          eq(payments.status, 'COLLECTED'),
          gte(payments.collectedAt, start),
          lt(payments.collectedAt, end),
        ),
      );
    const [refundAgg] = await this.db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(
        and(
          eq(payments.clubId, input.clubId),
          eq(payments.provider, input.provider),
          eq(payments.status, 'REFUNDED'),
          gte(payments.refundedAt, start),
          lt(payments.refundedAt, end),
        ),
      );

    const gross = Number(grossAgg.total ?? 0);
    const cnt = grossAgg.cnt;
    const refund = Number(refundAgg.total ?? 0);
    const net = gross - refund;

    // 수수료율 — 클럽 PG 설정 resolve (provider 일치 시에만 적용)
    const cfg = await this.resolver.resolve(input.clubId, input.companyId);
    const feeRate = cfg && cfg.provider === input.provider ? cfg.feeRate : 0;
    const fee = Math.round((net * feeRate) / 10000);
    const payout = net - fee;

    const [row] = await this.db
      .insert(settlements)
      .values({
        clubId: input.clubId,
        companyId: input.companyId,
        provider: input.provider,
        cycle: input.cycle,
        periodKey: input.periodKey,
        periodStart: start,
        periodEnd: end,
        grossAmount: gross,
        refundAmount: refund,
        netAmount: net,
        feeRate,
        feeAmount: fee,
        payoutAmount: payout,
        count: cnt,
      })
      .onConflictDoUpdate({
        target: [settlements.clubId, settlements.provider, settlements.cycle, settlements.periodKey],
        set: {
          companyId: input.companyId,
          periodStart: start,
          periodEnd: end,
          grossAmount: gross,
          refundAmount: refund,
          netAmount: net,
          feeRate,
          feeAmount: fee,
          payoutAmount: payout,
          count: cnt,
          updatedAt: new Date(),
        }, // status는 보존(재실행이 PAID/RECONCILED 되돌리지 않음)
      })
      .returning();

    this.logger.log(
      `[Settlement] ${input.cycle} ${input.periodKey} club=${input.clubId} ${input.provider}: net=${net} fee=${fee} payout=${payout} (${cnt}건)`,
    );
    return NatsResponse.success(row);
  }

  async list(filters: {
    clubId?: number;
    provider?: PgProviderName;
    cycle?: Cycle;
    status?: SettlementStatus;
    page?: number;
    limit?: number;
  }) {
    const { clubId, provider, cycle, status, page = 1, limit = 20 } = filters;
    const conds: SQL[] = [];
    if (clubId) conds.push(eq(settlements.clubId, clubId));
    if (provider) conds.push(eq(settlements.provider, provider));
    if (cycle) conds.push(eq(settlements.cycle, cycle));
    if (status) conds.push(eq(settlements.status, status));
    const where = conds.length ? and(...conds) : undefined;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(settlements)
        .where(where)
        .orderBy(desc(settlements.periodStart))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ value: count() }).from(settlements).where(where),
    ]);
    return NatsResponse.paginated(rows, totalRows[0].value, page, limit);
  }

  async get(id: number) {
    const [row] = await this.db.select().from(settlements).where(eq(settlements.id, id)).limit(1);
    if (!row) return NatsResponse.success({ error: 'Settlement not found' });
    return NatsResponse.success(row);
  }

  /** 대사상태 전이 — RECONCILED/PAID 타임스탬프 기록 */
  async updateStatus(input: { id: number; status: SettlementStatus }) {
    const set: Record<string, unknown> = { status: input.status, updatedAt: new Date() };
    if (input.status === 'RECONCILED') set.reconciledAt = new Date();
    if (input.status === 'PAID') set.paidAt = new Date();
    const [row] = await this.db.update(settlements).set(set).where(eq(settlements.id, input.id)).returning();
    if (!row) return NatsResponse.success({ error: 'Settlement not found' });
    this.logger.log(`[Settlement] status: id=${input.id} → ${input.status}`);
    return NatsResponse.success(row);
  }
}
