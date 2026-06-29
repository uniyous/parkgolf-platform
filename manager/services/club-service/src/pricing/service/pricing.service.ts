import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, eq, or, isNull, lte, gte, desc } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { gameTimeSlots, discountRules } from '../../db/schema';
import { NatsResponse } from '../../common/types/response.types';

type DiscountRule = typeof discountRules.$inferSelect;

interface PlayerQuoteInput {
  memberContext?: Record<string, unknown>; // 개인 할인 자격(국가유공자 등)
  surcharges?: Array<{ label: string; amount: number }>; // 부가항목(카트·식음료)
}
interface QuoteInput {
  clubId: number;
  gameTimeSlotId: number;
  companyId?: number;
  asOf?: string;
  players?: PlayerQuoteInput[]; // 플레이어별(개인차) — 우선
  playerCount?: number; // players 미지정 시 균일 N명(BASE만)
}

type QuoteLine = {
  type: 'BASE' | 'DISCOUNT' | 'SURCHARGE';
  label: string;
  qty: number;
  unitAmount: number;
  amount: number;
  source: string;
  sourceRef: number | null;
};

interface UpsertDiscountInput {
  id?: number;
  scopeLevel: 'PLATFORM' | 'COMPANY' | 'CLUB';
  companyId?: number;
  clubId?: number;
  kind: 'PROMOTION' | 'EVENT' | 'MEMBER' | 'MANUAL';
  code: string;
  label: string;
  amountType: 'FIXED' | 'RATE';
  amountValue: number;
  appliesTo?: 'PER_PLAYER' | 'PER_BOOKING';
  eligibility?: Record<string, unknown>;
  validFrom?: string;
  validTo?: string;
  stackable?: boolean;
  priority?: number;
  maxDiscountAmount?: number;
  active?: boolean;
}

/**
 * 요금 계산엔진 (UNI-132 [132a]) — 슬롯 단가 × 인원(BASE) + 할인 규칙 적용(항목별 quote).
 * 단가는 game_time_slots.price(권위), 할인은 discount_rules(Club→Company→Platform stack).
 */
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  /** 플레이어별 항목 견적 — 부킹 시 frontdesk가 호출, 플레이어별 원장으로 동결 (UNI-135) */
  async quote(input: QuoteInput) {
    const clubId = Number(input.clubId);
    const gameTimeSlotId = Number(input.gameTimeSlotId);
    if (!Number.isInteger(gameTimeSlotId) || gameTimeSlotId <= 0) {
      throw new BadRequestException(`gameTimeSlotId 오류: ${input.gameTimeSlotId}`);
    }
    if (!Number.isInteger(clubId) || clubId <= 0) {
      throw new BadRequestException(`clubId 오류: ${input.clubId}`);
    }
    // players 우선, 없으면 playerCount만큼 균일(BASE만)
    const playerInputs: PlayerQuoteInput[] =
      input.players?.length ? input.players : Array.from({ length: Number(input.playerCount ?? 0) }, () => ({}));
    if (!playerInputs.length) {
      throw new BadRequestException('players 또는 playerCount 필요');
    }

    const [slot] = await this.db.select().from(gameTimeSlots).where(eq(gameTimeSlots.id, gameTimeSlotId)).limit(1);
    if (!slot) throw new NotFoundException(`타임슬롯 없음: ${gameTimeSlotId}`);
    const unitPrice = slot.price;

    const asOf = input.asOf ? new Date(input.asOf) : new Date();
    const rules = (await this.applicableRules(clubId, input.companyId, asOf)).sort((a, b) => a.priority - b.priority);

    const players = playerInputs.map((p, i) => this.quotePlayer(i + 1, unitPrice, rules, p));
    const total = players.reduce((s, p) => s + p.total, 0);

    // payment-service PricingSnapshot(UNI-129) shape — frontdesk가 COLLECT_PAYMENT로 전달
    const snapshot = {
      gameTimeSlotId,
      playerCount: players.length,
      unitPrice,
      total,
      players: players.map((p) => ({ playerNo: p.playerNo, total: p.total, discounts: p.discounts, surcharges: p.surcharges })),
      calculatedAt: asOf.toISOString(),
    };

    this.logger.log(`[Pricing] quote club=${clubId} slot=${gameTimeSlotId} players=${players.length} total=${total}`);
    return NatsResponse.success({ clubId, gameTimeSlotId, playerCount: players.length, unitPrice, total, players, snapshot });
  }

  /** 1인 견적 — BASE(슬롯단가) + 개인할인(자격) + 부가항목 */
  private quotePlayer(playerNo: number, unitPrice: number, rules: DiscountRule[], p: PlayerQuoteInput) {
    const lines: QuoteLine[] = [
      { type: 'BASE', label: '그린피', qty: 1, unitAmount: unitPrice, amount: unitPrice, source: 'POLICY', sourceRef: null },
    ];
    const discounts: Array<{ type: string; label: string; amount: number }> = [];
    let discountTotal = 0;
    for (const r of rules.filter((r) => this.matchEligibility(r, p.memberContext))) {
      const remaining = unitPrice - discountTotal;
      if (remaining <= 0) break;
      if (!r.stackable && discounts.length > 0) continue; // 비중첩: 단독일 때만
      const raw = r.amountType === 'RATE' ? Math.floor((unitPrice * r.amountValue) / 10000) : r.amountValue;
      const capped = r.maxDiscountAmount != null ? Math.min(raw, r.maxDiscountAmount) : raw;
      const amount = Math.max(0, Math.min(capped, remaining));
      if (amount <= 0) continue;
      lines.push({ type: 'DISCOUNT', label: r.label, qty: 1, unitAmount: -amount, amount: -amount, source: r.kind, sourceRef: r.id });
      discounts.push({ type: r.kind, label: r.label, amount });
      discountTotal += amount;
      if (!r.stackable) break;
    }
    const surcharges: Array<{ label: string; amount: number }> = [];
    let surchargeTotal = 0;
    for (const s of p.surcharges ?? []) {
      const amt = Number(s.amount);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      lines.push({ type: 'SURCHARGE', label: s.label, qty: 1, unitAmount: amt, amount: amt, source: 'MANUAL', sourceRef: null });
      surcharges.push({ label: s.label, amount: amt });
      surchargeTotal += amt;
    }
    return { playerNo, unitPrice, lines, discounts, surcharges, total: unitPrice - discountTotal + surchargeTotal };
  }

  /** 유효·활성 할인 규칙 중 해당 클럽에 적용 가능한 것(Platform/Company/Club stack) */
  private async applicableRules(clubId: number, companyId?: number, asOf: Date = new Date()): Promise<DiscountRule[]> {
    const all = await this.db
      .select()
      .from(discountRules)
      .where(
        and(
          eq(discountRules.active, true),
          or(isNull(discountRules.validFrom), lte(discountRules.validFrom, asOf)),
          or(isNull(discountRules.validTo), gte(discountRules.validTo, asOf)),
        ),
      );
    return all.filter(
      (r) =>
        r.scopeLevel === 'PLATFORM' ||
        (r.scopeLevel === 'COMPANY' && companyId != null && r.companyId === companyId) ||
        (r.scopeLevel === 'CLUB' && r.clubId === clubId),
    );
  }

  /** MEMBER 규칙만 자격 검증(eligibility ↔ memberContext). 그 외는 항상 통과 */
  private matchEligibility(rule: DiscountRule, memberCtx?: Record<string, unknown>): boolean {
    if (rule.kind !== 'MEMBER') return true;
    const elig = rule.eligibility as Record<string, unknown> | null;
    if (!elig || Object.keys(elig).length === 0) return true;
    if (!memberCtx) return false;
    return Object.entries(elig).every(([k, v]) => memberCtx[k] === v);
  }

  // ===== discount_rules 관리 (manager-bff) =====

  async upsertDiscountRule(input: UpsertDiscountInput) {
    if (!Number.isFinite(input.amountValue) || input.amountValue < 0) {
      throw new BadRequestException(`amountValue는 0 이상이어야 합니다: ${input.amountValue}`);
    }
    const values = {
      scopeLevel: input.scopeLevel,
      companyId: input.companyId,
      clubId: input.clubId,
      kind: input.kind,
      code: input.code,
      label: input.label,
      amountType: input.amountType,
      amountValue: input.amountValue,
      appliesTo: input.appliesTo ?? 'PER_PLAYER',
      eligibility: input.eligibility,
      validFrom: input.validFrom ? new Date(input.validFrom) : null,
      validTo: input.validTo ? new Date(input.validTo) : null,
      stackable: input.stackable ?? false,
      priority: input.priority ?? 0,
      maxDiscountAmount: input.maxDiscountAmount,
      active: input.active ?? true,
    };
    if (input.id) {
      const [row] = await this.db.update(discountRules).set({ ...values, updatedAt: new Date() }).where(eq(discountRules.id, input.id)).returning();
      return NatsResponse.success(row);
    }
    const [row] = await this.db.insert(discountRules).values(values).returning();
    this.logger.log(`[Pricing] discountRule upserted: ${input.kind} ${input.code} scope=${input.scopeLevel}`);
    return NatsResponse.success(row);
  }

  async listDiscountRules(filter: { clubId?: number; companyId?: number; kind?: string; active?: boolean }) {
    const conds = [];
    if (filter.clubId != null) conds.push(eq(discountRules.clubId, filter.clubId));
    if (filter.companyId != null) conds.push(eq(discountRules.companyId, filter.companyId));
    if (filter.active != null) conds.push(eq(discountRules.active, filter.active));
    const rows = await this.db
      .select()
      .from(discountRules)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(discountRules.updatedAt));
    return NatsResponse.success(rows);
  }

  async deleteDiscountRule(id: number) {
    await this.db.delete(discountRules).where(eq(discountRules.id, id));
    return NatsResponse.success({ id, deleted: true });
  }
}
