// Policy DTOs for cancellation, refund, and no-show policies
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsInt, IsArray, ValidateNested, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// =====================================================
// Cancellation Policy DTOs
// =====================================================

export class CreateCancellationPolicyDto {
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

  @IsInt()
  @IsOptional()
  clubId?: number;
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

  @IsInt()
  @IsOptional()
  clubId?: number;

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

  @IsInt()
  @IsOptional()
  clubId?: number;

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
// Filter DTOs
// =====================================================

export class PolicyFilterDto {
  @IsInt()
  @IsOptional()
  clubId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
