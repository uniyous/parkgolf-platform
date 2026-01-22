import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateCancellationPolicyDto,
  UpdateCancellationPolicyDto,
  CreateRefundPolicyDto,
  UpdateRefundPolicyDto,
  CreateNoShowPolicyDto,
  UpdateNoShowPolicyDto,
  PolicyFilterDto,
} from '../dto/policy.dto';

@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // Cancellation Policy CRUD
  // =====================================================

  async createCancellationPolicy(dto: CreateCancellationPolicyDto) {
    this.logger.log(`Creating cancellation policy: ${dto.code}`);

    // Check for duplicate code
    const existing = await this.prisma.cancellationPolicy.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(`Cancellation policy with code ${dto.code} already exists`);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.cancellationPolicy.updateMany({
        where: { isDefault: true, clubId: dto.clubId || null },
        data: { isDefault: false },
      });
    }

    return this.prisma.cancellationPolicy.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        allowUserCancel: dto.allowUserCancel ?? true,
        userCancelDeadlineHours: dto.userCancelDeadlineHours ?? 72,
        allowSameDayCancel: dto.allowSameDayCancel ?? false,
        isDefault: dto.isDefault ?? false,
        clubId: dto.clubId,
      },
    });
  }

  async getCancellationPolicies(filter: PolicyFilterDto = {}) {
    this.logger.log('Fetching cancellation policies');

    const where: any = { isActive: true };
    if (filter.clubId !== undefined) where.clubId = filter.clubId;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.isDefault !== undefined) where.isDefault = filter.isDefault;

    return this.prisma.cancellationPolicy.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getCancellationPolicyById(id: number) {
    const policy = await this.prisma.cancellationPolicy.findUnique({
      where: { id },
    });

    if (!policy) {
      throw new NotFoundException(`Cancellation policy with ID ${id} not found`);
    }

    return policy;
  }

  async getDefaultCancellationPolicy(clubId?: number) {
    // First try to find club-specific default
    if (clubId) {
      const clubPolicy = await this.prisma.cancellationPolicy.findFirst({
        where: { clubId, isDefault: true, isActive: true },
      });
      if (clubPolicy) return clubPolicy;
    }

    // Fall back to global default
    return this.prisma.cancellationPolicy.findFirst({
      where: { clubId: null, isDefault: true, isActive: true },
    });
  }

  async updateCancellationPolicy(id: number, dto: UpdateCancellationPolicyDto) {
    this.logger.log(`Updating cancellation policy: ${id}`);

    const existing = await this.prisma.cancellationPolicy.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Cancellation policy with ID ${id} not found`);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.cancellationPolicy.updateMany({
        where: { isDefault: true, clubId: existing.clubId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.cancellationPolicy.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCancellationPolicy(id: number) {
    this.logger.log(`Deleting cancellation policy: ${id}`);

    const existing = await this.prisma.cancellationPolicy.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Cancellation policy with ID ${id} not found`);
    }

    // Soft delete by setting isActive to false
    return this.prisma.cancellationPolicy.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // =====================================================
  // Refund Policy CRUD
  // =====================================================

  async createRefundPolicy(dto: CreateRefundPolicyDto) {
    this.logger.log(`Creating refund policy: ${dto.code}`);

    // Check for duplicate code
    const existing = await this.prisma.refundPolicy.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(`Refund policy with code ${dto.code} already exists`);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.refundPolicy.updateMany({
        where: { isDefault: true, clubId: dto.clubId || null },
        data: { isDefault: false },
      });
    }

    const { tiers, ...policyData } = dto;

    return this.prisma.refundPolicy.create({
      data: {
        name: policyData.name,
        code: policyData.code,
        description: policyData.description,
        adminCancelRefundRate: policyData.adminCancelRefundRate ?? 100,
        systemCancelRefundRate: policyData.systemCancelRefundRate ?? 100,
        minRefundAmount: policyData.minRefundAmount ?? 0,
        refundFee: policyData.refundFee ?? 0,
        refundFeeRate: policyData.refundFeeRate ?? 0,
        isDefault: policyData.isDefault ?? false,
        clubId: policyData.clubId,
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
      include: { tiers: true },
    });
  }

  async getRefundPolicies(filter: PolicyFilterDto = {}) {
    this.logger.log('Fetching refund policies');

    const where: any = { isActive: true };
    if (filter.clubId !== undefined) where.clubId = filter.clubId;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.isDefault !== undefined) where.isDefault = filter.isDefault;

    return this.prisma.refundPolicy.findMany({
      where,
      include: {
        tiers: {
          orderBy: { minHoursBefore: 'desc' },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getRefundPolicyById(id: number) {
    const policy = await this.prisma.refundPolicy.findUnique({
      where: { id },
      include: {
        tiers: {
          orderBy: { minHoursBefore: 'desc' },
        },
      },
    });

    if (!policy) {
      throw new NotFoundException(`Refund policy with ID ${id} not found`);
    }

    return policy;
  }

  async getDefaultRefundPolicy(clubId?: number) {
    // First try to find club-specific default
    if (clubId) {
      const clubPolicy = await this.prisma.refundPolicy.findFirst({
        where: { clubId, isDefault: true, isActive: true },
        include: { tiers: { orderBy: { minHoursBefore: 'desc' } } },
      });
      if (clubPolicy) return clubPolicy;
    }

    // Fall back to global default
    return this.prisma.refundPolicy.findFirst({
      where: { clubId: null, isDefault: true, isActive: true },
      include: { tiers: { orderBy: { minHoursBefore: 'desc' } } },
    });
  }

  async updateRefundPolicy(id: number, dto: UpdateRefundPolicyDto) {
    this.logger.log(`Updating refund policy: ${id}`);

    const existing = await this.prisma.refundPolicy.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Refund policy with ID ${id} not found`);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.refundPolicy.updateMany({
        where: { isDefault: true, clubId: existing.clubId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const { tiers, ...policyData } = dto;

    // Update policy with tiers
    if (tiers) {
      // Delete existing tiers and create new ones
      await this.prisma.refundTier.deleteMany({
        where: { refundPolicyId: id },
      });

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
    this.logger.log(`Deleting refund policy: ${id}`);

    const existing = await this.prisma.refundPolicy.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Refund policy with ID ${id} not found`);
    }

    // Soft delete by setting isActive to false
    return this.prisma.refundPolicy.update({
      where: { id },
      data: { isActive: false },
      include: { tiers: true },
    });
  }

  // =====================================================
  // No-Show Policy CRUD
  // =====================================================

  async createNoShowPolicy(dto: CreateNoShowPolicyDto) {
    this.logger.log(`Creating no-show policy: ${dto.code}`);

    // Check for duplicate code
    const existing = await this.prisma.noShowPolicy.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(`No-show policy with code ${dto.code} already exists`);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.noShowPolicy.updateMany({
        where: { isDefault: true, clubId: dto.clubId || null },
        data: { isDefault: false },
      });
    }

    const { penalties, ...policyData } = dto;

    return this.prisma.noShowPolicy.create({
      data: {
        name: policyData.name,
        code: policyData.code,
        description: policyData.description,
        allowRefundOnNoShow: policyData.allowRefundOnNoShow ?? false,
        noShowGraceMinutes: policyData.noShowGraceMinutes ?? 30,
        countResetDays: policyData.countResetDays ?? 365,
        isDefault: policyData.isDefault ?? false,
        clubId: policyData.clubId,
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
    this.logger.log('Fetching no-show policies');

    const where: any = { isActive: true };
    if (filter.clubId !== undefined) where.clubId = filter.clubId;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.isDefault !== undefined) where.isDefault = filter.isDefault;

    return this.prisma.noShowPolicy.findMany({
      where,
      include: {
        penalties: {
          orderBy: { minCount: 'asc' },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getNoShowPolicyById(id: number) {
    const policy = await this.prisma.noShowPolicy.findUnique({
      where: { id },
      include: {
        penalties: {
          orderBy: { minCount: 'asc' },
        },
      },
    });

    if (!policy) {
      throw new NotFoundException(`No-show policy with ID ${id} not found`);
    }

    return policy;
  }

  async getDefaultNoShowPolicy(clubId?: number) {
    // First try to find club-specific default
    if (clubId) {
      const clubPolicy = await this.prisma.noShowPolicy.findFirst({
        where: { clubId, isDefault: true, isActive: true },
        include: { penalties: { orderBy: { minCount: 'asc' } } },
      });
      if (clubPolicy) return clubPolicy;
    }

    // Fall back to global default
    return this.prisma.noShowPolicy.findFirst({
      where: { clubId: null, isDefault: true, isActive: true },
      include: { penalties: { orderBy: { minCount: 'asc' } } },
    });
  }

  async updateNoShowPolicy(id: number, dto: UpdateNoShowPolicyDto) {
    this.logger.log(`Updating no-show policy: ${id}`);

    const existing = await this.prisma.noShowPolicy.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`No-show policy with ID ${id} not found`);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.noShowPolicy.updateMany({
        where: { isDefault: true, clubId: existing.clubId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const { penalties, ...policyData } = dto;

    // Update policy with penalties
    if (penalties) {
      // Delete existing penalties and create new ones
      await this.prisma.noShowPenalty.deleteMany({
        where: { noShowPolicyId: id },
      });

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
    this.logger.log(`Deleting no-show policy: ${id}`);

    const existing = await this.prisma.noShowPolicy.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`No-show policy with ID ${id} not found`);
    }

    // Soft delete by setting isActive to false
    return this.prisma.noShowPolicy.update({
      where: { id },
      data: { isActive: false },
      include: { penalties: true },
    });
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  /**
   * Calculate refund amount based on policy and hours before booking
   */
  async calculateRefundAmount(
    policyId: number,
    originalAmount: number,
    hoursBeforeBooking: number,
  ): Promise<{ refundRate: number; refundAmount: number; fee: number }> {
    const policy = await this.getRefundPolicyById(policyId);

    // Find applicable tier
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

  /**
   * Get user's no-show count within the reset period
   */
  async getUserNoShowCount(userId: number, clubId?: number): Promise<number> {
    const policy = await this.getDefaultNoShowPolicy(clubId);
    if (!policy) return 0;

    const resetDate = new Date();
    resetDate.setDate(resetDate.getDate() - policy.countResetDays);

    const count = await this.prisma.userNoShowRecord.count({
      where: {
        userId,
        isReset: false,
        noShowAt: { gte: resetDate },
      },
    });

    return count;
  }

  /**
   * Get applicable penalty for a user based on no-show count
   */
  async getApplicablePenalty(userId: number, clubId?: number) {
    const noShowCount = await this.getUserNoShowCount(userId, clubId);
    const policy = await this.getDefaultNoShowPolicy(clubId);

    if (!policy) return null;

    // Find applicable penalty based on count
    const penalty = policy.penalties.find(
      (p) =>
        noShowCount >= p.minCount &&
        (p.maxCount === null || noShowCount <= p.maxCount),
    );

    return penalty
      ? {
          policy,
          penalty,
          noShowCount,
        }
      : null;
  }
}
