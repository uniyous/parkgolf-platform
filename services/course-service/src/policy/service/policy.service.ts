import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PolicyScope } from '@prisma/client';
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

  constructor(private readonly prisma: PrismaService) {}

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

    // 동일 스코프 중복 체크
    const existing = await this.prisma.cancellationPolicy.findUnique({
      where: {
        scopeLevel_companyId_clubId: {
          scopeLevel,
          companyId: dto.companyId ?? null,
          clubId: dto.clubId ?? null,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`이 스코프에 이미 취소 정책이 존재합니다 (${scopeLevel})`);
    }

    return this.prisma.cancellationPolicy.create({
      data: {
        scopeLevel,
        companyId: dto.companyId ?? null,
        clubId: dto.clubId ?? null,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        allowUserCancel: dto.allowUserCancel ?? true,
        userCancelDeadlineHours: dto.userCancelDeadlineHours ?? 72,
        allowSameDayCancel: dto.allowSameDayCancel ?? false,
        isDefault: dto.isDefault ?? (scopeLevel === PolicyScope.PLATFORM),
      },
    });
  }

  async getCancellationPolicies(filter: PolicyFilterDto = {}) {
    const where: any = { isActive: true };
    if (filter.scopeLevel) where.scopeLevel = filter.scopeLevel;
    if (filter.companyId !== undefined) where.companyId = filter.companyId;
    if (filter.clubId !== undefined) where.clubId = filter.clubId;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.isDefault !== undefined) where.isDefault = filter.isDefault;

    return this.prisma.cancellationPolicy.findMany({
      where,
      orderBy: [{ scopeLevel: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getCancellationPolicyById(id: number) {
    const policy = await this.prisma.cancellationPolicy.findUnique({ where: { id } });
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
      const clubPolicy = await this.prisma.cancellationPolicy.findFirst({
        where: { scopeLevel: PolicyScope.CLUB, clubId: dto.clubId, isActive: true },
      });
      if (clubPolicy) return { ...clubPolicy, inherited: false, inheritedFrom: null };
    }

    // 2순위: COMPANY
    if (dto.companyId) {
      const companyPolicy = await this.prisma.cancellationPolicy.findFirst({
        where: { scopeLevel: PolicyScope.COMPANY, companyId: dto.companyId, clubId: null, isActive: true },
      });
      if (companyPolicy) return { ...companyPolicy, inherited: !dto.clubId ? false : true, inheritedFrom: dto.clubId ? 'COMPANY' : null };
    }

    // 3순위: PLATFORM
    const platformPolicy = await this.prisma.cancellationPolicy.findFirst({
      where: { scopeLevel: PolicyScope.PLATFORM, companyId: null, clubId: null, isActive: true },
    });
    if (platformPolicy) return { ...platformPolicy, inherited: true, inheritedFrom: 'PLATFORM' };

    return null;
  }

  // 하위 호환: getDefault → resolve로 위임
  async getDefaultCancellationPolicy(clubId?: number) {
    return this.resolveCancellationPolicy({ clubId });
  }

  async updateCancellationPolicy(id: number, dto: UpdateCancellationPolicyDto) {
    const existing = await this.prisma.cancellationPolicy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Cancellation policy with ID ${id} not found`);

    return this.prisma.cancellationPolicy.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCancellationPolicy(id: number) {
    const existing = await this.prisma.cancellationPolicy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Cancellation policy with ID ${id} not found`);

    if (existing.scopeLevel === PolicyScope.PLATFORM) {
      throw new BadRequestException('플랫폼 기본 정책은 삭제할 수 없습니다');
    }

    // CLUB/COMPANY 정책은 실제 삭제 (상위 계층으로 폴백)
    await this.prisma.cancellationPolicy.delete({ where: { id } });
    return { message: '정책이 삭제되었습니다. 상위 계층 정책이 적용됩니다.' };
  }

  // =====================================================
  // Refund Policy CRUD
  // =====================================================

  async createRefundPolicy(dto: CreateRefundPolicyDto) {
    const scopeLevel = dto.scopeLevel ?? this.determineScopeLevel(dto.companyId, dto.clubId);
    this.logger.log(`Creating refund policy [${scopeLevel}]: ${dto.code}`);

    const existing = await this.prisma.refundPolicy.findUnique({
      where: {
        scopeLevel_companyId_clubId: {
          scopeLevel,
          companyId: dto.companyId ?? null,
          clubId: dto.clubId ?? null,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`이 스코프에 이미 환불 정책이 존재합니다 (${scopeLevel})`);
    }

    const { tiers, ...policyData } = dto;

    return this.prisma.refundPolicy.create({
      data: {
        scopeLevel,
        companyId: dto.companyId ?? null,
        clubId: dto.clubId ?? null,
        name: policyData.name,
        code: policyData.code,
        description: policyData.description,
        adminCancelRefundRate: policyData.adminCancelRefundRate ?? 100,
        systemCancelRefundRate: policyData.systemCancelRefundRate ?? 100,
        minRefundAmount: policyData.minRefundAmount ?? 0,
        refundFee: policyData.refundFee ?? 0,
        refundFeeRate: policyData.refundFeeRate ?? 0,
        isDefault: policyData.isDefault ?? (scopeLevel === PolicyScope.PLATFORM),
        tiers: tiers
          ? {
              create: tiers.map((tier) => ({
                minHoursBefore: tier.minHoursBefore,
                maxHoursBefore: tier.maxHoursBefore,
                refundRate: tier.refundRate,
                label: tier.label,
              })),
            }
          : undefined,
      },
      include: { tiers: { orderBy: { minHoursBefore: 'desc' } } },
    });
  }

  async getRefundPolicies(filter: PolicyFilterDto = {}) {
    const where: any = { isActive: true };
    if (filter.scopeLevel) where.scopeLevel = filter.scopeLevel;
    if (filter.companyId !== undefined) where.companyId = filter.companyId;
    if (filter.clubId !== undefined) where.clubId = filter.clubId;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.isDefault !== undefined) where.isDefault = filter.isDefault;

    return this.prisma.refundPolicy.findMany({
      where,
      include: { tiers: { orderBy: { minHoursBefore: 'desc' } } },
      orderBy: [{ scopeLevel: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getRefundPolicyById(id: number) {
    const policy = await this.prisma.refundPolicy.findUnique({
      where: { id },
      include: { tiers: { orderBy: { minHoursBefore: 'desc' } } },
    });
    if (!policy) throw new NotFoundException(`Refund policy with ID ${id} not found`);
    return policy;
  }

  async resolveRefundPolicy(dto: PolicyResolveDto) {
    const include = { tiers: { orderBy: { minHoursBefore: 'desc' as const } } };

    // 1순위: CLUB
    if (dto.clubId) {
      const clubPolicy = await this.prisma.refundPolicy.findFirst({
        where: { scopeLevel: PolicyScope.CLUB, clubId: dto.clubId, isActive: true },
        include,
      });
      if (clubPolicy) return { ...clubPolicy, inherited: false, inheritedFrom: null };
    }

    // 2순위: COMPANY
    if (dto.companyId) {
      const companyPolicy = await this.prisma.refundPolicy.findFirst({
        where: { scopeLevel: PolicyScope.COMPANY, companyId: dto.companyId, clubId: null, isActive: true },
        include,
      });
      if (companyPolicy) return { ...companyPolicy, inherited: !dto.clubId ? false : true, inheritedFrom: dto.clubId ? 'COMPANY' : null };
    }

    // 3순위: PLATFORM
    const platformPolicy = await this.prisma.refundPolicy.findFirst({
      where: { scopeLevel: PolicyScope.PLATFORM, companyId: null, clubId: null, isActive: true },
      include,
    });
    if (platformPolicy) return { ...platformPolicy, inherited: true, inheritedFrom: 'PLATFORM' };

    return null;
  }

  async getDefaultRefundPolicy(clubId?: number) {
    return this.resolveRefundPolicy({ clubId });
  }

  async updateRefundPolicy(id: number, dto: UpdateRefundPolicyDto) {
    const existing = await this.prisma.refundPolicy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Refund policy with ID ${id} not found`);

    const { tiers, ...policyData } = dto;

    if (tiers) {
      await this.prisma.refundTier.deleteMany({ where: { refundPolicyId: id } });

      return this.prisma.refundPolicy.update({
        where: { id },
        data: {
          ...policyData,
          tiers: {
            create: tiers.map((tier) => ({
              minHoursBefore: tier.minHoursBefore,
              maxHoursBefore: tier.maxHoursBefore,
              refundRate: tier.refundRate,
              label: tier.label,
            })),
          },
        },
        include: { tiers: { orderBy: { minHoursBefore: 'desc' } } },
      });
    }

    return this.prisma.refundPolicy.update({
      where: { id },
      data: policyData,
      include: { tiers: { orderBy: { minHoursBefore: 'desc' } } },
    });
  }

  async deleteRefundPolicy(id: number) {
    const existing = await this.prisma.refundPolicy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Refund policy with ID ${id} not found`);

    if (existing.scopeLevel === PolicyScope.PLATFORM) {
      throw new BadRequestException('플랫폼 기본 정책은 삭제할 수 없습니다');
    }

    await this.prisma.refundPolicy.delete({ where: { id } });
    return { message: '정책이 삭제되었습니다. 상위 계층 정책이 적용됩니다.' };
  }

  // =====================================================
  // No-Show Policy CRUD
  // =====================================================

  async createNoShowPolicy(dto: CreateNoShowPolicyDto) {
    const scopeLevel = dto.scopeLevel ?? this.determineScopeLevel(dto.companyId, dto.clubId);
    this.logger.log(`Creating no-show policy [${scopeLevel}]: ${dto.code}`);

    const existing = await this.prisma.noShowPolicy.findUnique({
      where: {
        scopeLevel_companyId_clubId: {
          scopeLevel,
          companyId: dto.companyId ?? null,
          clubId: dto.clubId ?? null,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`이 스코프에 이미 노쇼 정책이 존재합니다 (${scopeLevel})`);
    }

    const { penalties, ...policyData } = dto;

    return this.prisma.noShowPolicy.create({
      data: {
        scopeLevel,
        companyId: dto.companyId ?? null,
        clubId: dto.clubId ?? null,
        name: policyData.name,
        code: policyData.code,
        description: policyData.description,
        allowRefundOnNoShow: policyData.allowRefundOnNoShow ?? false,
        noShowGraceMinutes: policyData.noShowGraceMinutes ?? 30,
        countResetDays: policyData.countResetDays ?? 365,
        isDefault: policyData.isDefault ?? (scopeLevel === PolicyScope.PLATFORM),
        penalties: penalties
          ? {
              create: penalties.map((penalty) => ({
                minCount: penalty.minCount,
                maxCount: penalty.maxCount,
                penaltyType: penalty.penaltyType,
                restrictionDays: penalty.restrictionDays,
                feeAmount: penalty.feeAmount,
                feeRate: penalty.feeRate,
                label: penalty.label,
                message: penalty.message,
              })),
            }
          : undefined,
      },
      include: { penalties: { orderBy: { minCount: 'asc' } } },
    });
  }

  async getNoShowPolicies(filter: PolicyFilterDto = {}) {
    const where: any = { isActive: true };
    if (filter.scopeLevel) where.scopeLevel = filter.scopeLevel;
    if (filter.companyId !== undefined) where.companyId = filter.companyId;
    if (filter.clubId !== undefined) where.clubId = filter.clubId;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.isDefault !== undefined) where.isDefault = filter.isDefault;

    return this.prisma.noShowPolicy.findMany({
      where,
      include: { penalties: { orderBy: { minCount: 'asc' } } },
      orderBy: [{ scopeLevel: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getNoShowPolicyById(id: number) {
    const policy = await this.prisma.noShowPolicy.findUnique({
      where: { id },
      include: { penalties: { orderBy: { minCount: 'asc' } } },
    });
    if (!policy) throw new NotFoundException(`No-show policy with ID ${id} not found`);
    return policy;
  }

  async resolveNoShowPolicy(dto: PolicyResolveDto) {
    const include = { penalties: { orderBy: { minCount: 'asc' as const } } };

    // 1순위: CLUB
    if (dto.clubId) {
      const clubPolicy = await this.prisma.noShowPolicy.findFirst({
        where: { scopeLevel: PolicyScope.CLUB, clubId: dto.clubId, isActive: true },
        include,
      });
      if (clubPolicy) return { ...clubPolicy, inherited: false, inheritedFrom: null };
    }

    // 2순위: COMPANY
    if (dto.companyId) {
      const companyPolicy = await this.prisma.noShowPolicy.findFirst({
        where: { scopeLevel: PolicyScope.COMPANY, companyId: dto.companyId, clubId: null, isActive: true },
        include,
      });
      if (companyPolicy) return { ...companyPolicy, inherited: !dto.clubId ? false : true, inheritedFrom: dto.clubId ? 'COMPANY' : null };
    }

    // 3순위: PLATFORM
    const platformPolicy = await this.prisma.noShowPolicy.findFirst({
      where: { scopeLevel: PolicyScope.PLATFORM, companyId: null, clubId: null, isActive: true },
      include,
    });
    if (platformPolicy) return { ...platformPolicy, inherited: true, inheritedFrom: 'PLATFORM' };

    return null;
  }

  async getDefaultNoShowPolicy(clubId?: number) {
    return this.resolveNoShowPolicy({ clubId });
  }

  async updateNoShowPolicy(id: number, dto: UpdateNoShowPolicyDto) {
    const existing = await this.prisma.noShowPolicy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`No-show policy with ID ${id} not found`);

    const { penalties, ...policyData } = dto;

    if (penalties) {
      await this.prisma.noShowPenalty.deleteMany({ where: { noShowPolicyId: id } });

      return this.prisma.noShowPolicy.update({
        where: { id },
        data: {
          ...policyData,
          penalties: {
            create: penalties.map((penalty) => ({
              minCount: penalty.minCount,
              maxCount: penalty.maxCount,
              penaltyType: penalty.penaltyType,
              restrictionDays: penalty.restrictionDays,
              feeAmount: penalty.feeAmount,
              feeRate: penalty.feeRate,
              label: penalty.label,
              message: penalty.message,
            })),
          },
        },
        include: { penalties: { orderBy: { minCount: 'asc' } } },
      });
    }

    return this.prisma.noShowPolicy.update({
      where: { id },
      data: policyData,
      include: { penalties: { orderBy: { minCount: 'asc' } } },
    });
  }

  async deleteNoShowPolicy(id: number) {
    const existing = await this.prisma.noShowPolicy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`No-show policy with ID ${id} not found`);

    if (existing.scopeLevel === PolicyScope.PLATFORM) {
      throw new BadRequestException('플랫폼 기본 정책은 삭제할 수 없습니다');
    }

    await this.prisma.noShowPolicy.delete({ where: { id } });
    return { message: '정책이 삭제되었습니다. 상위 계층 정책이 적용됩니다.' };
  }

  // =====================================================
  // Operating Policy CRUD
  // =====================================================

  async createOperatingPolicy(dto: CreateOperatingPolicyDto) {
    const scopeLevel = dto.scopeLevel ?? this.determineScopeLevel(dto.companyId, dto.clubId);
    this.logger.log(`Creating operating policy [${scopeLevel}]`);

    const existing = await this.prisma.operatingPolicy.findUnique({
      where: {
        scopeLevel_companyId_clubId: {
          scopeLevel,
          companyId: dto.companyId ?? null,
          clubId: dto.clubId ?? null,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`이 스코프에 이미 운영 정책이 존재합니다 (${scopeLevel})`);
    }

    return this.prisma.operatingPolicy.create({
      data: {
        scopeLevel,
        companyId: dto.companyId ?? null,
        clubId: dto.clubId ?? null,
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
      },
    });
  }

  async getOperatingPolicies(filter: PolicyFilterDto = {}) {
    const where: any = { isActive: true };
    if (filter.scopeLevel) where.scopeLevel = filter.scopeLevel;
    if (filter.companyId !== undefined) where.companyId = filter.companyId;
    if (filter.clubId !== undefined) where.clubId = filter.clubId;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;

    return this.prisma.operatingPolicy.findMany({
      where,
      orderBy: [{ scopeLevel: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getOperatingPolicyById(id: number) {
    const policy = await this.prisma.operatingPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException(`Operating policy with ID ${id} not found`);
    return policy;
  }

  async resolveOperatingPolicy(dto: PolicyResolveDto) {
    // 1순위: CLUB
    if (dto.clubId) {
      const clubPolicy = await this.prisma.operatingPolicy.findFirst({
        where: { scopeLevel: PolicyScope.CLUB, clubId: dto.clubId, isActive: true },
      });
      if (clubPolicy) return { ...clubPolicy, inherited: false, inheritedFrom: null };
    }

    // 2순위: COMPANY
    if (dto.companyId) {
      const companyPolicy = await this.prisma.operatingPolicy.findFirst({
        where: { scopeLevel: PolicyScope.COMPANY, companyId: dto.companyId, clubId: null, isActive: true },
      });
      if (companyPolicy) return { ...companyPolicy, inherited: !dto.clubId ? false : true, inheritedFrom: dto.clubId ? 'COMPANY' : null };
    }

    return null;
  }

  async updateOperatingPolicy(id: number, dto: UpdateOperatingPolicyDto) {
    const existing = await this.prisma.operatingPolicy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Operating policy with ID ${id} not found`);

    return this.prisma.operatingPolicy.update({
      where: { id },
      data: dto,
    });
  }

  async deleteOperatingPolicy(id: number) {
    const existing = await this.prisma.operatingPolicy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Operating policy with ID ${id} not found`);

    await this.prisma.operatingPolicy.delete({ where: { id } });
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

    return this.prisma.userNoShowRecord.count({
      where: {
        userId,
        isReset: false,
        noShowAt: { gte: resetDate },
      },
    });
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
