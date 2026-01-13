// Policy DTOs for cancellation, refund, and no-show policies

// =====================================================
// Cancellation Policy DTOs
// =====================================================

export class CreateCancellationPolicyDto {
  name: string;
  code: string;
  description?: string;
  allowUserCancel?: boolean;
  userCancelDeadlineHours?: number;
  allowSameDayCancel?: boolean;
  isDefault?: boolean;
  clubId?: number;
}

export class UpdateCancellationPolicyDto {
  name?: string;
  description?: string;
  allowUserCancel?: boolean;
  userCancelDeadlineHours?: number;
  allowSameDayCancel?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
}

// =====================================================
// Refund Policy DTOs
// =====================================================

export class RefundTierDto {
  minHoursBefore: number;
  maxHoursBefore?: number;
  refundRate: number;
  label?: string;
}

export class CreateRefundPolicyDto {
  name: string;
  code: string;
  description?: string;
  adminCancelRefundRate?: number;
  systemCancelRefundRate?: number;
  minRefundAmount?: number;
  refundFee?: number;
  refundFeeRate?: number;
  isDefault?: boolean;
  clubId?: number;
  tiers?: RefundTierDto[];
}

export class UpdateRefundPolicyDto {
  name?: string;
  description?: string;
  adminCancelRefundRate?: number;
  systemCancelRefundRate?: number;
  minRefundAmount?: number;
  refundFee?: number;
  refundFeeRate?: number;
  isDefault?: boolean;
  isActive?: boolean;
  tiers?: RefundTierDto[];
}

// =====================================================
// No-Show Policy DTOs
// =====================================================

export type NoShowPenaltyType = 'WARNING' | 'RESTRICTION' | 'FEE' | 'BLACKLIST';

export class NoShowPenaltyDto {
  minCount: number;
  maxCount?: number;
  penaltyType: NoShowPenaltyType;
  restrictionDays?: number;
  feeAmount?: number;
  feeRate?: number;
  label?: string;
  message?: string;
}

export class CreateNoShowPolicyDto {
  name: string;
  code: string;
  description?: string;
  allowRefundOnNoShow?: boolean;
  noShowGraceMinutes?: number;
  countResetDays?: number;
  isDefault?: boolean;
  clubId?: number;
  penalties?: NoShowPenaltyDto[];
}

export class UpdateNoShowPolicyDto {
  name?: string;
  description?: string;
  allowRefundOnNoShow?: boolean;
  noShowGraceMinutes?: number;
  countResetDays?: number;
  isDefault?: boolean;
  isActive?: boolean;
  penalties?: NoShowPenaltyDto[];
}

// =====================================================
// Filter DTOs
// =====================================================

export class PolicyFilterDto {
  clubId?: number;
  isActive?: boolean;
  isDefault?: boolean;
}
