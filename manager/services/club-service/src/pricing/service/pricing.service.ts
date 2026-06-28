import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, eq, or, isNull, lte, gte, desc } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { gameTimeSlots, discountRules } from '../../db/schema';
import { NatsResponse } from '../../common/types/response.types';

type DiscountRule = typeof discountRules.$inferSelect;

interface QuoteInput {
  clubId: number;
  gameTimeSlotId: number;
  playerCount: number;
  companyId?: number;
  memberContext?: Record<string, unknown>;
  asOf?: string;
}

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

  /** 항목별 요금 견적 — 부킹 시 frontdesk가 호출, 결과를 원장에 동결 */
  async quote(input: QuoteInput) {
    const clubId = Number(input.clubId);
    const gameTimeSlotId = Number(input.gameTimeSlotId);
    const playerCount = Number(input.playerCount);
    if (!Number.isInteger(gameTimeSlotId) || gameTimeSlotId <= 0) {
      throw new BadRequestException(`gameTimeSlotId 오류: ${input.gameTimeSlotId}`);
    }
    if (!Number.isInteger(playerCount) || playerCount < 1) {
      throw new BadRequestException(`playerCount 오류: ${input.playerCount}`);
    }
    if (!Number.isInteger(clubId) || clubId <= 0) {
      // clubId 누락 시 0으로 coerce되어 CLUB 스코프 할인이 조용히 누락되는 것 방지
      throw new BadRequestException(`clubId 오류: ${input.clubId}`);
    }

    const [slot] = await this.db.select().from(gameTimeSlots).where(eq(gameTimeSlots.id, gameTimeSlotId)).limit(1);
    if (!slot) throw new NotFoundException(`타임슬롯 없음: ${gameTimeSlotId}`);

    const unitPrice = slot.price;
    const baseAmount = unitPrice * playerCount;
    const lines: Array<{
      type: 'BASE' | 'DISCOUNT';
      label: string;
      qty: number;
      unitAmount: number;
      amount: number;
      source: string;
      sourceRef: number | null;
    }> = [
      { type: 'BASE', label: '그린피', qty: playerCount, unitAmount: unitPrice, amount: baseAmount, source: 'POLICY', sourceRef: null },
    ];

    const asOf = input.asOf ? new Date(input.asOf) : new Date();
    const candidates = (await this.applicableRules(clubId, input.companyId, asOf))
      .filter((r) => this.matchEligibility(r, input.memberContext))
      .sort((a, b) => a.priority - b.priority);

    let discountTotal = 0;
    const discounts: Array<{ type: string; label: string; amount: number }> = [];
    for (const r of candidates) {
      const remaining = baseAmount - discountTotal;
      if (remaining <= 0) break;
      // 비중첩 규칙은 이미 적용된 할인 위에 쌓지 않음(단독일 때만 적용)
      if (!r.stackable && discounts.length > 0) continue;
      const raw = r.amountType === 'RATE' ? Math.floor((baseAmount * r.amountValue) / 10000) : r.amountValue;
      const capped = r.maxDiscountAmount != null ? Math.min(raw, r.maxDiscountAmount) : raw;
      const amount = Math.max(0, Math.min(capped, remaining));
      if (amount <= 0) continue;
      lines.push({ type: 'DISCOUNT', label: r.label, qty: 1, unitAmount: -amount, amount: -amount, source: r.kind, sourceRef: r.id });
      discounts.push({ type: r.kind, label: r.label, amount });
      discountTotal += amount;
      if (!r.stackable) break; // 비중첩: 적용 후 추가 할인 중단
    }

    const total = baseAmount - discountTotal;
    // payment-service PricingSnapshot(UNI-129)와 동일 shape — frontdesk가 그대로 전달
    const snapshot = { gameTimeSlotId, playerCount, unitPrice, baseAmount, discounts, total, calculatedAt: asOf.toISOString() };

    this.logger.log(`[Pricing] quote club=${clubId} slot=${gameTimeSlotId} players=${playerCount} base=${baseAmount} discount=${discountTotal} total=${total}`);
    return NatsResponse.success({ clubId, gameTimeSlotId, playerCount, unitPrice, baseAmount, discountTotal, total, lines, snapshot });
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
