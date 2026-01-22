import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsNumber, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

// =====================================================
// Cancellation Policy DTOs
// =====================================================

export class CreateCancellationPolicyDto {
  @ApiProperty({ description: '정책명', example: '기본 취소 정책' })
  @IsString()
  name: string;

  @ApiProperty({ description: '정책 코드', example: 'DEFAULT_CANCEL' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '고객 취소 허용 여부', default: true })
  @IsOptional()
  @IsBoolean()
  allowUserCancel?: boolean;

  @ApiPropertyOptional({ description: '취소 마감 시간 (시간)', default: 72 })
  @IsOptional()
  @IsNumber()
  userCancelDeadlineHours?: number;

  @ApiPropertyOptional({ description: '당일 취소 허용 여부', default: false })
  @IsOptional()
  @IsBoolean()
  allowSameDayCancel?: boolean;

  @ApiPropertyOptional({ description: '기본 정책 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '특정 골프장 ID (null이면 전체 적용)' })
  @IsOptional()
  @IsNumber()
  clubId?: number;
}

export class UpdateCancellationPolicyDto {
  @ApiPropertyOptional({ description: '정책명' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '고객 취소 허용 여부' })
  @IsOptional()
  @IsBoolean()
  allowUserCancel?: boolean;

  @ApiPropertyOptional({ description: '취소 마감 시간 (시간)' })
  @IsOptional()
  @IsNumber()
  userCancelDeadlineHours?: number;

  @ApiPropertyOptional({ description: '당일 취소 허용 여부' })
  @IsOptional()
  @IsBoolean()
  allowSameDayCancel?: boolean;

  @ApiPropertyOptional({ description: '기본 정책 여부' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// =====================================================
// Refund Policy DTOs
// =====================================================

export class RefundTierDto {
  @ApiProperty({ description: '최소 시간 (예약 시간 기준)', example: 168 })
  @IsNumber()
  minHoursBefore: number;

  @ApiPropertyOptional({ description: '최대 시간 (null이면 무제한)' })
  @IsOptional()
  @IsNumber()
  maxHoursBefore?: number;

  @ApiProperty({ description: '환불율 (%)', example: 100 })
  @IsNumber()
  refundRate: number;

  @ApiPropertyOptional({ description: '표시 라벨', example: '7일 전' })
  @IsOptional()
  @IsString()
  label?: string;
}

export class CreateRefundPolicyDto {
  @ApiProperty({ description: '정책명', example: '기본 환불 정책' })
  @IsString()
  name: string;

  @ApiProperty({ description: '정책 코드', example: 'DEFAULT_REFUND' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '관리자 취소 환불율 (%)', default: 100 })
  @IsOptional()
  @IsNumber()
  adminCancelRefundRate?: number;

  @ApiPropertyOptional({ description: '시스템 취소 환불율 (%)', default: 100 })
  @IsOptional()
  @IsNumber()
  systemCancelRefundRate?: number;

  @ApiPropertyOptional({ description: '최소 환불 금액', default: 0 })
  @IsOptional()
  @IsNumber()
  minRefundAmount?: number;

  @ApiPropertyOptional({ description: '환불 수수료 (고정)', default: 0 })
  @IsOptional()
  @IsNumber()
  refundFee?: number;

  @ApiPropertyOptional({ description: '환불 수수료율 (%)', default: 0 })
  @IsOptional()
  @IsNumber()
  refundFeeRate?: number;

  @ApiPropertyOptional({ description: '기본 정책 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '특정 골프장 ID' })
  @IsOptional()
  @IsNumber()
  clubId?: number;

  @ApiPropertyOptional({ description: '환불율 티어 목록', type: [RefundTierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundTierDto)
  tiers?: RefundTierDto[];
}

export class UpdateRefundPolicyDto {
  @ApiPropertyOptional({ description: '정책명' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '관리자 취소 환불율 (%)' })
  @IsOptional()
  @IsNumber()
  adminCancelRefundRate?: number;

  @ApiPropertyOptional({ description: '시스템 취소 환불율 (%)' })
  @IsOptional()
  @IsNumber()
  systemCancelRefundRate?: number;

  @ApiPropertyOptional({ description: '최소 환불 금액' })
  @IsOptional()
  @IsNumber()
  minRefundAmount?: number;

  @ApiPropertyOptional({ description: '환불 수수료 (고정)' })
  @IsOptional()
  @IsNumber()
  refundFee?: number;

  @ApiPropertyOptional({ description: '환불 수수료율 (%)' })
  @IsOptional()
  @IsNumber()
  refundFeeRate?: number;

  @ApiPropertyOptional({ description: '기본 정책 여부' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '환불율 티어 목록', type: [RefundTierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundTierDto)
  tiers?: RefundTierDto[];
}

// =====================================================
// No-Show Policy DTOs
// =====================================================

export enum NoShowPenaltyType {
  WARNING = 'WARNING',
  RESTRICTION = 'RESTRICTION',
  FEE = 'FEE',
  BLACKLIST = 'BLACKLIST',
}

export class NoShowPenaltyDto {
  @ApiProperty({ description: '최소 노쇼 횟수', example: 1 })
  @IsNumber()
  minCount: number;

  @ApiPropertyOptional({ description: '최대 노쇼 횟수 (null이면 무제한)' })
  @IsOptional()
  @IsNumber()
  maxCount?: number;

  @ApiProperty({ description: '페널티 유형', enum: NoShowPenaltyType })
  @IsEnum(NoShowPenaltyType)
  penaltyType: NoShowPenaltyType;

  @ApiPropertyOptional({ description: '예약 제한 기간 (일)' })
  @IsOptional()
  @IsNumber()
  restrictionDays?: number;

  @ApiPropertyOptional({ description: '위약금 (원)' })
  @IsOptional()
  @IsNumber()
  feeAmount?: number;

  @ApiPropertyOptional({ description: '위약금율 (%)' })
  @IsOptional()
  @IsNumber()
  feeRate?: number;

  @ApiPropertyOptional({ description: '표시 라벨', example: '1회 노쇼' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: '안내 메시지' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class CreateNoShowPolicyDto {
  @ApiProperty({ description: '정책명', example: '기본 노쇼 정책' })
  @IsString()
  name: string;

  @ApiProperty({ description: '정책 코드', example: 'DEFAULT_NOSHOW' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '노쇼 시 환불 허용', default: false })
  @IsOptional()
  @IsBoolean()
  allowRefundOnNoShow?: boolean;

  @ApiPropertyOptional({ description: '노쇼 판정 유예 시간 (분)', default: 30 })
  @IsOptional()
  @IsNumber()
  noShowGraceMinutes?: number;

  @ApiPropertyOptional({ description: '노쇼 카운트 리셋 기간 (일)', default: 365 })
  @IsOptional()
  @IsNumber()
  countResetDays?: number;

  @ApiPropertyOptional({ description: '기본 정책 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '특정 골프장 ID' })
  @IsOptional()
  @IsNumber()
  clubId?: number;

  @ApiPropertyOptional({ description: '페널티 단계 목록', type: [NoShowPenaltyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoShowPenaltyDto)
  penalties?: NoShowPenaltyDto[];
}

export class UpdateNoShowPolicyDto {
  @ApiPropertyOptional({ description: '정책명' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '노쇼 시 환불 허용' })
  @IsOptional()
  @IsBoolean()
  allowRefundOnNoShow?: boolean;

  @ApiPropertyOptional({ description: '노쇼 판정 유예 시간 (분)' })
  @IsOptional()
  @IsNumber()
  noShowGraceMinutes?: number;

  @ApiPropertyOptional({ description: '노쇼 카운트 리셋 기간 (일)' })
  @IsOptional()
  @IsNumber()
  countResetDays?: number;

  @ApiPropertyOptional({ description: '기본 정책 여부' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '페널티 단계 목록', type: [NoShowPenaltyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoShowPenaltyDto)
  penalties?: NoShowPenaltyDto[];
}

// =====================================================
// Filter DTOs
// =====================================================

export class PolicyFilterDto {
  @ApiPropertyOptional({ description: '골프장 ID' })
  @IsOptional()
  @IsNumber()
  clubId?: number;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '기본 정책 여부' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
