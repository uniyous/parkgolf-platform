import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, isNull, count, asc, desc, gte } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { PolicyScope } from '../../contracts/enums';
import {
  cancellationPolicies,
  refundPolicies,
  refundTiers,
  noShowPolicies,
  noShowPenalties,
  userNoShowRecords,
  operatingPolicies,
} from '../../db/schema';
import {
  CreateCancellationPolicyDto,
  UpdateCancellationPolicyDto,
  CreateRefundPolicyDto,
  UpdateRefundPolicyDto,
  CreateNoShowPolicyDto,
  UpdateNoShowPolicyDto,
  CreateOperatingPolicyDto,
  UpdateOperatingPolicyDto,
  PolicyFilterDto,
  PolicyResolveDto,
} from '../dto/policy.dto';

@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  // =====================================================
  // Common: Scope 헬퍼
  // =====================================================

  private determineScopeLevel(companyId?: number, clubId?: number): PolicyScope {
    if (clubId) return PolicyScope.CLUB;
    if (companyId) return PolicyScope.COMPANY;
    return PolicyScope.PLATFORM;
  }

  // =====================================================
  // Cancellation Policy CRUD
  // =====================================================

  async createCancellationPolicy(dto: CreateCancellationPolicyDto) {
    const scopeLevel = dto.scopeLevel ?? this.determineScopeLevel(dto.companyId, dto.clubId);
    this.logger.log(`Creating cancellation policy [${scopeLevel}]: ${dto.code}`);

    const companyId = dto.companyId ?? null;
    const clubId = dto.clubId ?? null;

    // 동일 스코프 중복 체크
    const [existing] = await this.db
      .select()
      .from(cancellationPolicies)
      .where(
        and(
          eq(cancellationPolicies.scopeLevel, scopeLevel),
          companyId == null ? isNull(cancellationPolicies.companyId) : eq(cancellationPolicies.companyId, companyId),
          clubId == null ? isNull(cancellationPolicies.clubId) : eq(cancellationPolicies.clubId, clubId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException(`이 스코프에 이미 취소 정책이 존재합니다 (${scopeLevel})`);
    }

    const [created] = await this.db
      .insert(cancellationPolicies)
      .values({
        scopeLevel,
        companyId,
        clubId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        allowUserCancel: dto.allowUserCancel ?? true,
        userCancelDeadlineHours: dto.userCancelDeadlineHours ?? 72,
        allowSameDayCancel: dto.allowSameDayCancel ?? false,
        isDefault: dto.isDefault ?? (scopeLevel === PolicyScope.PLATFORM),
      })
      .returning();
    return created;
  }

  async getCancellationPolicies(filter: PolicyFilterDto = {}) {
    const conditions: any[] = [];
    conditions.push(eq(cancellationPolicies.isActive, true));
    if (filter.scopeLevel) conditions.push(eq(cancellationPolicies.scopeLevel, filter.scopeLevel));
    if (filter.companyId !== undefined) conditions.push(eq(cancellationPolicies.companyId, filter.companyId));
    if (filter.clubId !== undefined) conditions.push(eq(cancellationPolicies.clubId, filter.clubId));
    if (filter.isActive !== undefined) conditions.push(eq(cancellationPolicies.isActive, filter.isActive));
    if (filter.isDefault !== undefined) conditions.push(eq(cancellationPolicies.isDefault, filter.isDefault));

    return this.db
      .select()
      .from(cancellationPolicies)
      .where(and(...conditions))
      .orderBy(asc(cancellationPolicies.scopeLevel), desc(cancellationPolicies.createdAt));
  }

  async getCancellationPolicyById(id: number) {
    const [policy] = await this.db.select().from(cancellationPolicies).where(eq(cancellationPolicies.id, id)).limit(1);
    if (!policy) throw new NotFoundException(`Cancellation policy with ID ${id} not found`);
    return policy;
  }

  /**
   * 3단계 폴백 정책 해석: CLUB → COMPANY → PLATFORM
   * 반환값에 inherited, inheritedFrom 필드 추가
   */
  async resolveCancellationPolicy(dto: PolicyResolveDto) {
    // 1순위: CLUB
    if (dto.clubId) {
      const [clubPolicy] = await this.db
        .select()
        .from(cancellationPolicies)
        .where(
          and(
            eq(cancellationPolicies.scopeLevel, PolicyScope.CLUB),
            eq(cancellationPolicies.clubId, dto.clubId),
            eq(cancellationPolicies.isActive, true),
          ),
        )
        .limit(1);
      if (clubPolicy) return { ...clubPolicy, inherited: false, inheritedFrom: null };
    }

    // 2순위: COMPANY
    if (dto.companyId) {
      const [companyPolicy] = await this.db
        .select()
        .from(cancellationPolicies)
        .where(
          and(
            eq(cancellationPolicies.scopeLevel, PolicyScope.COMPANY),
            eq(cancellationPolicies.companyId, dto.companyId),
            isNull(cancellationPolicies.clubId),
            eq(cancellationPolicies.isActive, true),
          ),
        )
        .limit(1);
      if (companyPolicy) return { ...companyPolicy, inherited: !dto.clubId ? false : true, inheritedFrom: dto.clubId ? 'COMPANY' : null };
    }

    // 3순위: PLATFORM
    const [platformPolicy] = await this.db
      .select()
      .from(cancellationPolicies)
      .where(
        and(
          eq(cancellationPolicies.scopeLevel, PolicyScope.PLATFORM),
          isNull(cancellationPolicies.companyId),
          isNull(cancellationPolicies.clubId),
          eq(cancellationPolicies.isActive, true),
        ),
      )
      .limit(1);
    if (platformPolicy) return { ...platformPolicy, inherited: true, inheritedFrom: 'PLATFORM' };

    return null;
  }

  // 하위 호환: getDefault → resolve로 위임
  async getDefaultCancellationPolicy(clubId?: number) {
    return this.resolveCancellationPolicy({ clubId });
  }

  async updateCancellationPolicy(id: number, dto: UpdateCancellationPolicyDto) {
    const [existing] = await this.db.select().from(cancellationPolicies).where(eq(cancellationPolicies.id, id)).limit(1);
    if (!existing) throw new NotFoundException(`Cancellation policy with ID ${id} not found`);

    const [updated] = await this.db
      .update(cancellationPolicies)
      .set(dto)
      .where(eq(cancellationPolicies.id, id))
      .returning();
    return updated;
  }

  async deleteCancellationPolicy(id: number) {
    const [existing] = await this.db.select().from(cancellationPolicies).where(eq(cancellationPolicies.id, id)).limit(1);
    if (!existing) throw new NotFoundException(`Cancellation policy with ID ${id} not found`);

    if (existing.scopeLevel === PolicyScope.PLATFORM) {
      throw new BadRequestException('플랫폼 기본 정책은 삭제할 수 없습니다');
    }

    // CLUB/COMPANY 정책은 실제 삭제 (상위 계층으로 폴백)
    await this.db.delete(cancellationPolicies).where(eq(cancellationPolicies.id, id));
    return { message: '정책이 삭제되었습니다. 상위 계층 정책이 적용됩니다.' };
  }

  // =====================================================
  // Refund Policy CRUD
  // =====================================================

  async createRefundPolicy(dto: CreateRefundPolicyDto) {
    const scopeLevel = dto.scopeLevel ?? this.determineScopeLevel(dto.companyId, dto.clubId);
    this.logger.log(`Creating refund policy [${scopeLevel}]: ${dto.code}`);

    const companyId = dto.companyId ?? null;
    const clubId = dto.clubId ?? null;

    const [existing] = await this.db
      .select()
      .from(refundPolicies)
      .where(
        and(
          eq(refundPolicies.scopeLevel, scopeLevel),
          companyId == null ? isNull(refundPolicies.companyId) : eq(refundPolicies.companyId, companyId),
          clubId == null ? isNull(refundPolicies.clubId) : eq(refundPolicies.clubId, clubId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException(`이 스코프에 이미 환불 정책이 존재합니다 (${scopeLevel})`);
    }

    const { tiers, ...policyData } = dto;

    const [created] = await this.db
      .insert(refundPolicies)
      .values({
        scopeLevel,
        companyId,
        clubId,
        name: policyData.name,
        code: policyData.code,
        description: policyData.description,
        adminCancelRefundRate: policyData.adminCancelRefundRate ?? 100,
        systemCancelRefundRate: policyData.systemCancelRefundRate ?? 100,
        minRefundAmount: policyData.minRefundAmount ?? 0,
        refundFee: policyData.refundFee ?? 0,
        refundFeeRate: policyData.refundFeeRate ?? 0,
        isDefault: policyData.isDefault ?? (scopeLevel === PolicyScope.PLATFORM),
      })
      .returning();

    if (tiers && tiers.length > 0) {
      await this.db.insert(refundTiers).values(
        tiers.map((tier) => ({
          refundPolicyId: created.id,
          minHoursBefore: tier.minHoursBefore,
          maxHoursBefore: tier.maxHoursBefore,
          refundRate: tier.refundRate,
          label: tier.label,
        })),
      );
    }

    return this.db.query.refundPolicies.findFirst({
      where: eq(refundPolicies.id, created.id),
      with: { tiers: { orderBy: desc(refundTiers.minHoursBefore) } },
    });
  }

  async getRefundPolicies(filter: PolicyFilterDto = {}) {
    const conditions: any[] = [];
    conditions.push(eq(refundPolicies.isActive, true));
    if (filter.scopeLevel) conditions.push(eq(refundPolicies.scopeLevel, filter.scopeLevel));
    if (filter.companyId !== undefined) conditions.push(eq(refundPolicies.companyId, filter.companyId));
    if (filter.clubId !== undefined) conditions.push(eq(refundPolicies.clubId, filter.clubId));
    if (filter.isActive !== undefined) conditions.push(eq(refundPolicies.isActive, filter.isActive));
    if (filter.isDefault !== undefined) conditions.push(eq(refundPolicies.isDefault, filter.isDefault));

    return this.db.query.refundPolicies.findMany({
      where: and(...conditions),
      with: { tiers: { orderBy: desc(refundTiers.minHoursBefore) } },
      orderBy: [asc(refundPolicies.scopeLevel), desc(refundPolicies.createdAt)],
    });
  }

  async getRefundPolicyById(id: number) {
    const policy = await this.db.query.refundPolicies.findFirst({
      where: eq(refundPolicies.id, id),
      with: { tiers: { orderBy: desc(refundTiers.minHoursBefore) } },
    });
    if (!policy) throw new NotFoundException(`Refund policy with ID ${id} not found`);
    return policy;
  }

  async resolveRefundPolicy(dto: PolicyResolveDto) {
    const withTiers = { tiers: { orderBy: desc(refundTiers.minHoursBefore) } };

    // 1순위: CLUB
    if (dto.clubId) {
      const clubPolicy = await this.db.query.refundPolicies.findFirst({
        where: and(
          eq(refundPolicies.scopeLevel, PolicyScope.CLUB),
          eq(refundPolicies.clubId, dto.clubId),
          eq(refundPolicies.isActive, true),
        ),
        with: withTiers,
      });
      if (clubPolicy) return { ...clubPolicy, inherited: false, inheritedFrom: null };
    }

    // 2순위: COMPANY
    if (dto.companyId) {
      const companyPolicy = await this.db.query.refundPolicies.findFirst({
        where: and(
          eq(refundPolicies.scopeLevel, PolicyScope.COMPANY),
          eq(refundPolicies.companyId, dto.companyId),
          isNull(refundPolicies.clubId),
          eq(refundPolicies.isActive, true),
        ),
        with: withTiers,
      });
      if (companyPolicy) return { ...companyPolicy, inherited: !dto.clubId ? false : true, inheritedFrom: dto.clubId ? 'COMPANY' : null };
    }

    // 3순위: PLATFORM
    const platformPolicy = await this.db.query.refundPolicies.findFirst({
      where: and(
        eq(refundPolicies.scopeLevel, PolicyScope.PLATFORM),
        isNull(refundPolicies.companyId),
        isNull(refundPolicies.clubId),
        eq(refundPolicies.isActive, true),
      ),
      with: withTiers,
    });
    if (platformPolicy) return { ...platformPolicy, inherited: true, inheritedFrom: 'PLATFORM' };

    return null;
  }

  async getDefaultRefundPolicy(clubId?: number) {
    return this.resolveRefundPolicy({ clubId });
  }

  async updateRefundPolicy(id: number, dto: UpdateRefundPolicyDto) {
    const [existing] = await this.db.select().from(refundPolicies).where(eq(refundPolicies.id, id)).limit(1);
    if (!existing) throw new NotFoundException(`Refund policy with ID ${id} not found`);

    const { tiers, ...policyData } = dto;

    if (tiers) {
      await this.db.transaction(async (tx) => {
        await tx.delete(refundTiers).where(eq(refundTiers.refundPolicyId, id));
        await tx.update(refundPolicies).set(policyData).where(eq(refundPolicies.id, id));
        if (tiers.length > 0) {
          await tx.insert(refundTiers).values(
            tiers.map((tier) => ({
              refundPolicyId: id,
              minHoursBefore: tier.minHoursBefore,
              maxHoursBefore: tier.maxHoursBefore,
              refundRate: tier.refundRate,
              label: tier.label,
            })),
          );
        }
      });

      return this.db.query.refundPolicies.findFirst({
        where: eq(refundPolicies.id, id),
        with: { tiers: { orderBy: desc(refundTiers.minHoursBefore) } },
      });
    }

    await this.db.update(refundPolicies).set(policyData).where(eq(refundPolicies.id, id));

    return this.db.query.refundPolicies.findFirst({
      where: eq(refundPolicies.id, id),
      with: { tiers: { orderBy: desc(refundTiers.minHoursBefore) } },
    });
  }

  async deleteRefundPolicy(id: number) {
    const [existing] = await this.db.select().from(refundPolicies).where(eq(refundPolicies.id, id)).limit(1);
    if (!existing) throw new NotFoundException(`Refund policy with ID ${id} not found`);

    if (existing.scopeLevel === PolicyScope.PLATFORM) {
      throw new BadRequestException('플랫폼 기본 정책은 삭제할 수 없습니다');
    }

    await this.db.delete(refundPolicies).where(eq(refundPolicies.id, id));
    return { message: '정책이 삭제되었습니다. 상위 계층 정책이 적용됩니다.' };
  }

  // =====================================================
  // No-Show Policy CRUD
  // =====================================================

  async createNoShowPolicy(dto: CreateNoShowPolicyDto) {
    const scopeLevel = dto.scopeLevel ?? this.determineScopeLevel(dto.companyId, dto.clubId);
    this.logger.log(`Creating no-show policy [${scopeLevel}]: ${dto.code}`);

    const companyId = dto.companyId ?? null;
    const clubId = dto.clubId ?? null;

    const [existing] = await this.db
      .select()
      .from(noShowPolicies)
      .where(
        and(
          eq(noShowPolicies.scopeLevel, scopeLevel),
          companyId == null ? isNull(noShowPolicies.companyId) : eq(noShowPolicies.companyId, companyId),
          clubId == null ? isNull(noShowPolicies.clubId) : eq(noShowPolicies.clubId, clubId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException(`이 스코프에 이미 노쇼 정책이 존재합니다 (${scopeLevel})`);
    }

    const { penalties, ...policyData } = dto;

    const [created] = await this.db
      .insert(noShowPolicies)
      .values({
        scopeLevel,
        companyId,
        clubId,
        name: policyData.name,
        code: policyData.code,
        description: policyData.description,
        allowRefundOnNoShow: policyData.allowRefundOnNoShow ?? false,
        noShowGraceMinutes: policyData.noShowGraceMinutes ?? 30,
        countResetDays: policyData.countResetDays ?? 365,
        isDefault: policyData.isDefault ?? (scopeLevel === PolicyScope.PLATFORM),
      })
      .returning();

    if (penalties && penalties.length > 0) {
      await this.db.insert(noShowPenalties).values(
        penalties.map((penalty) => ({
          noShowPolicyId: created.id,
          minCount: penalty.minCount,
          maxCount: penalty.maxCount,
          penaltyType: penalty.penaltyType,
          restrictionDays: penalty.restrictionDays,
          feeAmount: penalty.feeAmount,
          feeRate: penalty.feeRate,
          label: penalty.label,
          message: penalty.message,
        })),
      );
    }

    return this.db.query.noShowPolicies.findFirst({
      where: eq(noShowPolicies.id, created.id),
      with: { penalties: { orderBy: asc(noShowPenalties.minCount) } },
    });
  }

  async getNoShowPolicies(filter: PolicyFilterDto = {}) {
    const conditions: any[] = [];
    conditions.push(eq(noShowPolicies.isActive, true));
    if (filter.scopeLevel) conditions.push(eq(noShowPolicies.scopeLevel, filter.scopeLevel));
    if (filter.companyId !== undefined) conditions.push(eq(noShowPolicies.companyId, filter.companyId));
    if (filter.clubId !== undefined) conditions.push(eq(noShowPolicies.clubId, filter.clubId));
    if (filter.isActive !== undefined) conditions.push(eq(noShowPolicies.isActive, filter.isActive));
    if (filter.isDefault !== undefined) conditions.push(eq(noShowPolicies.isDefault, filter.isDefault));

    return this.db.query.noShowPolicies.findMany({
      where: and(...conditions),
      with: { penalties: { orderBy: asc(noShowPenalties.minCount) } },
      orderBy: [asc(noShowPolicies.scopeLevel), desc(noShowPolicies.createdAt)],
    });
  }

  async getNoShowPolicyById(id: number) {
    const policy = await this.db.query.noShowPolicies.findFirst({
      where: eq(noShowPolicies.id, id),
      with: { penalties: { orderBy: asc(noShowPenalties.minCount) } },
    });
    if (!policy) throw new NotFoundException(`No-show policy with ID ${id} not found`);
    return policy;
  }

  async resolveNoShowPolicy(dto: PolicyResolveDto) {
    const withPenalties = { penalties: { orderBy: asc(noShowPenalties.minCount) } };

    // 1순위: CLUB
    if (dto.clubId) {
      const clubPolicy = await this.db.query.noShowPolicies.findFirst({
        where: and(
          eq(noShowPolicies.scopeLevel, PolicyScope.CLUB),
          eq(noShowPolicies.clubId, dto.clubId),
          eq(noShowPolicies.isActive, true),
        ),
        with: withPenalties,
      });
      if (clubPolicy) return { ...clubPolicy, inherited: false, inheritedFrom: null };
    }

    // 2순위: COMPANY
    if (dto.companyId) {
      const companyPolicy = await this.db.query.noShowPolicies.findFirst({
        where: and(
          eq(noShowPolicies.scopeLevel, PolicyScope.COMPANY),
          eq(noShowPolicies.companyId, dto.companyId),
          isNull(noShowPolicies.clubId),
          eq(noShowPolicies.isActive, true),
        ),
        with: withPenalties,
      });
      if (companyPolicy) return { ...companyPolicy, inherited: !dto.clubId ? false : true, inheritedFrom: dto.clubId ? 'COMPANY' : null };
    }

    // 3순위: PLATFORM
    const platformPolicy = await this.db.query.noShowPolicies.findFirst({
      where: and(
        eq(noShowPolicies.scopeLevel, PolicyScope.PLATFORM),
        isNull(noShowPolicies.companyId),
        isNull(noShowPolicies.clubId),
        eq(noShowPolicies.isActive, true),
      ),
      with: withPenalties,
    });
    if (platformPolicy) return { ...platformPolicy, inherited: true, inheritedFrom: 'PLATFORM' };

    return null;
  }

  async getDefaultNoShowPolicy(clubId?: number) {
    return this.resolveNoShowPolicy({ clubId });
  }

  async updateNoShowPolicy(id: number, dto: UpdateNoShowPolicyDto) {
    const [existing] = await this.db.select().from(noShowPolicies).where(eq(noShowPolicies.id, id)).limit(1);
    if (!existing) throw new NotFoundException(`No-show policy with ID ${id} not found`);

    const { penalties, ...policyData } = dto;

    if (penalties) {
      await this.db.transaction(async (tx) => {
        await tx.delete(noShowPenalties).where(eq(noShowPenalties.noShowPolicyId, id));
        await tx.update(noShowPolicies).set(policyData).where(eq(noShowPolicies.id, id));
        if (penalties.length > 0) {
          await tx.insert(noShowPenalties).values(
            penalties.map((penalty) => ({
              noShowPolicyId: id,
              minCount: penalty.minCount,
              maxCount: penalty.maxCount,
              penaltyType: penalty.penaltyType,
              restrictionDays: penalty.restrictionDays,
              feeAmount: penalty.feeAmount,
              feeRate: penalty.feeRate,
              label: penalty.label,
              message: penalty.message,
            })),
          );
        }
      });

      return this.db.query.noShowPolicies.findFirst({
        where: eq(noShowPolicies.id, id),
        with: { penalties: { orderBy: asc(noShowPenalties.minCount) } },
      });
    }

    await this.db.update(noShowPolicies).set(policyData).where(eq(noShowPolicies.id, id));

    return this.db.query.noShowPolicies.findFirst({
      where: eq(noShowPolicies.id, id),
      with: { penalties: { orderBy: asc(noShowPenalties.minCount) } },
    });
  }

  async deleteNoShowPolicy(id: number) {
    const [existing] = await this.db.select().from(noShowPolicies).where(eq(noShowPolicies.id, id)).limit(1);
    if (!existing) throw new NotFoundException(`No-show policy with ID ${id} not found`);

    if (existing.scopeLevel === PolicyScope.PLATFORM) {
      throw new BadRequestException('플랫폼 기본 정책은 삭제할 수 없습니다');
    }

    await this.db.delete(noShowPolicies).where(eq(noShowPolicies.id, id));
    return { message: '정책이 삭제되었습니다. 상위 계층 정책이 적용됩니다.' };
  }

  // =====================================================
  // Operating Policy CRUD
  // =====================================================

  async createOperatingPolicy(dto: CreateOperatingPolicyDto) {
    const scopeLevel = dto.scopeLevel ?? this.determineScopeLevel(dto.companyId, dto.clubId);
    this.logger.log(`Creating operating policy [${scopeLevel}]`);

    const companyId = dto.companyId ?? null;
    const clubId = dto.clubId ?? null;

    const [existing] = await this.db
      .select()
      .from(operatingPolicies)
      .where(
        and(
          eq(operatingPolicies.scopeLevel, scopeLevel),
          companyId == null ? isNull(operatingPolicies.companyId) : eq(operatingPolicies.companyId, companyId),
          clubId == null ? isNull(operatingPolicies.clubId) : eq(operatingPolicies.clubId, clubId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException(`이 스코프에 이미 운영 정책이 존재합니다 (${scopeLevel})`);
    }

    const [created] = await this.db
      .insert(operatingPolicies)
      .values({
        scopeLevel,
        companyId,
        clubId,
        openTime: dto.openTime ?? '06:00',
        closeTime: dto.closeTime ?? '18:00',
        lastTeeTime: dto.lastTeeTime,
        defaultMaxPlayers: dto.defaultMaxPlayers ?? 4,
        defaultDuration: dto.defaultDuration ?? 180,
        defaultBreakDuration: dto.defaultBreakDuration ?? 10,
        defaultSlotInterval: dto.defaultSlotInterval ?? 10,
        peakSeasonStart: dto.peakSeasonStart,
        peakSeasonEnd: dto.peakSeasonEnd,
        peakPriceRate: dto.peakPriceRate ?? 100,
        weekendPriceRate: dto.weekendPriceRate ?? 100,
      })
      .returning();
    return created;
  }

  async getOperatingPolicies(filter: PolicyFilterDto = {}) {
    const conditions: any[] = [];
    conditions.push(eq(operatingPolicies.isActive, true));
    if (filter.scopeLevel) conditions.push(eq(operatingPolicies.scopeLevel, filter.scopeLevel));
    if (filter.companyId !== undefined) conditions.push(eq(operatingPolicies.companyId, filter.companyId));
    if (filter.clubId !== undefined) conditions.push(eq(operatingPolicies.clubId, filter.clubId));
    if (filter.isActive !== undefined) conditions.push(eq(operatingPolicies.isActive, filter.isActive));

    return this.db
      .select()
      .from(operatingPolicies)
      .where(and(...conditions))
      .orderBy(asc(operatingPolicies.scopeLevel), desc(operatingPolicies.createdAt));
  }

  async getOperatingPolicyById(id: number) {
    const [policy] = await this.db.select().from(operatingPolicies).where(eq(operatingPolicies.id, id)).limit(1);
    if (!policy) throw new NotFoundException(`Operating policy with ID ${id} not found`);
    return policy;
  }

  async resolveOperatingPolicy(dto: PolicyResolveDto) {
    // 1순위: CLUB
    if (dto.clubId) {
      const [clubPolicy] = await this.db
        .select()
        .from(operatingPolicies)
        .where(
          and(
            eq(operatingPolicies.scopeLevel, PolicyScope.CLUB),
            eq(operatingPolicies.clubId, dto.clubId),
            eq(operatingPolicies.isActive, true),
          ),
        )
        .limit(1);
      if (clubPolicy) return { ...clubPolicy, inherited: false, inheritedFrom: null };
    }

    // 2순위: COMPANY
    if (dto.companyId) {
      const [companyPolicy] = await this.db
        .select()
        .from(operatingPolicies)
        .where(
          and(
            eq(operatingPolicies.scopeLevel, PolicyScope.COMPANY),
            eq(operatingPolicies.companyId, dto.companyId),
            isNull(operatingPolicies.clubId),
            eq(operatingPolicies.isActive, true),
          ),
        )
        .limit(1);
      if (companyPolicy) return { ...companyPolicy, inherited: !dto.clubId ? false : true, inheritedFrom: dto.clubId ? 'COMPANY' : null };
    }

    return null;
  }

  async updateOperatingPolicy(id: number, dto: UpdateOperatingPolicyDto) {
    const [existing] = await this.db.select().from(operatingPolicies).where(eq(operatingPolicies.id, id)).limit(1);
    if (!existing) throw new NotFoundException(`Operating policy with ID ${id} not found`);

    const [updated] = await this.db
      .update(operatingPolicies)
      .set(dto)
      .where(eq(operatingPolicies.id, id))
      .returning();
    return updated;
  }

  async deleteOperatingPolicy(id: number) {
    const [existing] = await this.db.select().from(operatingPolicies).where(eq(operatingPolicies.id, id)).limit(1);
    if (!existing) throw new NotFoundException(`Operating policy with ID ${id} not found`);

    await this.db.delete(operatingPolicies).where(eq(operatingPolicies.id, id));
    return { message: '운영 정책이 삭제되었습니다. 상위 계층 정책이 적용됩니다.' };
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  async calculateRefundAmount(
    policyId: number,
    originalAmount: number,
    hoursBeforeBooking: number,
  ): Promise<{ refundRate: number; refundAmount: number; fee: number }> {
    const policy = await this.getRefundPolicyById(policyId);

    const tier = policy.tiers.find(
      (t) =>
        hoursBeforeBooking >= t.minHoursBefore &&
        (t.maxHoursBefore === null || hoursBeforeBooking < t.maxHoursBefore),
    );

    const refundRate = tier?.refundRate ?? 0;
    const fee =
      policy.refundFee + Math.floor((originalAmount * policy.refundFeeRate) / 100);
    const refundAmount = Math.max(
      Math.floor((originalAmount * refundRate) / 100) - fee,
      policy.minRefundAmount,
    );

    return { refundRate, refundAmount, fee };
  }

  async getUserNoShowCount(userId: number, clubId?: number, companyId?: number): Promise<number> {
    const policy = await this.resolveNoShowPolicy({ clubId, companyId });
    if (!policy) return 0;

    const resetDate = new Date();
    resetDate.setDate(resetDate.getDate() - policy.countResetDays);

    const [r] = await this.db
      .select({ value: count() })
      .from(userNoShowRecords)
      .where(
        and(
          eq(userNoShowRecords.userId, userId),
          eq(userNoShowRecords.isReset, false),
          gte(userNoShowRecords.noShowAt, resetDate),
        ),
      );
    return r.value;
  }

  async getApplicablePenalty(userId: number, clubId?: number, companyId?: number) {
    const noShowCount = await this.getUserNoShowCount(userId, clubId, companyId);
    const policy = await this.resolveNoShowPolicy({ clubId, companyId });

    if (!policy) return null;

    const penalty = policy.penalties.find(
      (p) =>
        noShowCount >= p.minCount &&
        (p.maxCount === null || noShowCount <= p.maxCount),
    );

    return penalty ? { policy, penalty, noShowCount } : null;
  }
}
