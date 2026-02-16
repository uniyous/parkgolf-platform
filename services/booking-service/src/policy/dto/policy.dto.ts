// Policy DTOs for cancellation, refund, no-show, and operating policies
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsInt, IsArray, ValidateNested, IsEnum, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PolicyScope } from '@prisma/client';

// =====================================================
// Common: PolicyScope
// =====================================================

export class PolicyScopeDto {
  @IsEnum(PolicyScope)
  @IsOptional()
  scopeLevel?: PolicyScope;

  @IsInt()
  @IsOptional()
  companyId?: number;

  @IsInt()
  @IsOptional()
  clubId?: number;
}

// =====================================================
// Policy Resolve DTO (3단계 폴백 조회용)
// =====================================================

export class PolicyResolveDto {
  @IsInt()
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : undefined)
  companyId?: number;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : undefined)
  clubId?: number;
}

// =====================================================
// Cancellation Policy DTOs
// =====================================================

export class CreateCancellationPolicyDto {
  @IsEnum(PolicyScope)
  @IsOptional()
  scopeLevel?: PolicyScope;

  @IsInt()
  @IsOptional()
  companyId?: number;

  @IsInt()
  @IsOptional()
  clubId?: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  allowUserCancel?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  userCancelDeadlineHours?: number;

  @IsBoolean()
  @IsOptional()
  allowSameDayCancel?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateCancellationPolicyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  allowUserCancel?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  userCancelDeadlineHours?: number;

  @IsBoolean()
  @IsOptional()
  allowSameDayCancel?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// =====================================================
// Refund Policy DTOs
// =====================================================

export class RefundTierDto {
  @IsInt()
  @Min(0)
  minHoursBefore: number;

  @IsInt()
  @IsOptional()
  maxHoursBefore?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  refundRate: number;

  @IsString()
  @IsOptional()
  label?: string;
}

export class CreateRefundPolicyDto {
  @IsEnum(PolicyScope)
  @IsOptional()
  scopeLevel?: PolicyScope;

  @IsInt()
  @IsOptional()
  companyId?: number;

  @IsInt()
  @IsOptional()
  clubId?: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  adminCancelRefundRate?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  systemCancelRefundRate?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  minRefundAmount?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  refundFee?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  refundFeeRate?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RefundTierDto)
  tiers?: RefundTierDto[];
}

export class UpdateRefundPolicyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  adminCancelRefundRate?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  systemCancelRefundRate?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  minRefundAmount?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  refundFee?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  refundFeeRate?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RefundTierDto)
  tiers?: RefundTierDto[];
}

// =====================================================
// No-Show Policy DTOs
// =====================================================

export type NoShowPenaltyType = 'WARNING' | 'RESTRICTION' | 'FEE' | 'BLACKLIST';

export class NoShowPenaltyDto {
  @IsInt()
  @Min(1)
  minCount: number;

  @IsInt()
  @IsOptional()
  maxCount?: number;

  @IsString()
  @IsNotEmpty()
  penaltyType: NoShowPenaltyType;

  @IsInt()
  @IsOptional()
  @Min(0)
  restrictionDays?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  feeAmount?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  feeRate?: number;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  message?: string;
}

export class CreateNoShowPolicyDto {
  @IsEnum(PolicyScope)
  @IsOptional()
  scopeLevel?: PolicyScope;

  @IsInt()
  @IsOptional()
  companyId?: number;

  @IsInt()
  @IsOptional()
  clubId?: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  allowRefundOnNoShow?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  noShowGraceMinutes?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  countResetDays?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => NoShowPenaltyDto)
  penalties?: NoShowPenaltyDto[];
}

export class UpdateNoShowPolicyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  allowRefundOnNoShow?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  noShowGraceMinutes?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  countResetDays?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => NoShowPenaltyDto)
  penalties?: NoShowPenaltyDto[];
}

// =====================================================
// Operating Policy DTOs
// =====================================================

export class CreateOperatingPolicyDto {
  @IsEnum(PolicyScope)
  @IsOptional()
  scopeLevel?: PolicyScope;

  @IsInt()
  @IsOptional()
  companyId?: number;

  @IsInt()
  @IsOptional()
  clubId?: number;

  @IsString()
  @IsOptional()
  openTime?: string;

  @IsString()
  @IsOptional()
  closeTime?: string;

  @IsString()
  @IsOptional()
  lastTeeTime?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(8)
  defaultMaxPlayers?: number;

  @IsInt()
  @IsOptional()
  @Min(60)
  @Max(360)
  defaultDuration?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(30)
  defaultBreakDuration?: number;

  @IsInt()
  @IsOptional()
  @Min(5)
  @Max(30)
  defaultSlotInterval?: number;

  @IsString()
  @IsOptional()
  peakSeasonStart?: string;

  @IsString()
  @IsOptional()
  peakSeasonEnd?: string;

  @IsInt()
  @IsOptional()
  @Min(100)
  @Max(300)
  peakPriceRate?: number;

  @IsInt()
  @IsOptional()
  @Min(100)
  @Max(300)
  weekendPriceRate?: number;
}

export class UpdateOperatingPolicyDto {
  @IsString()
  @IsOptional()
  openTime?: string;

  @IsString()
  @IsOptional()
  closeTime?: string;

  @IsString()
  @IsOptional()
  lastTeeTime?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(8)
  defaultMaxPlayers?: number;

  @IsInt()
  @IsOptional()
  @Min(60)
  @Max(360)
  defaultDuration?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(30)
  defaultBreakDuration?: number;

  @IsInt()
  @IsOptional()
  @Min(5)
  @Max(30)
  defaultSlotInterval?: number;

  @IsString()
  @IsOptional()
  peakSeasonStart?: string;

  @IsString()
  @IsOptional()
  peakSeasonEnd?: string;

  @IsInt()
  @IsOptional()
  @Min(100)
  @Max(300)
  peakPriceRate?: number;

  @IsInt()
  @IsOptional()
  @Min(100)
  @Max(300)
  weekendPriceRate?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// =====================================================
// Filter DTOs
// =====================================================

export class PolicyFilterDto {
  @IsEnum(PolicyScope)
  @IsOptional()
  scopeLevel?: PolicyScope;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : undefined)
  companyId?: number;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : undefined)
  clubId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
