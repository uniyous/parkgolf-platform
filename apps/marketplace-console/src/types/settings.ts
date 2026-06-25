/**
 * 시스템 설정 관련 타입 정의
 * - 취소 정책
 * - 환불 정책
 * - 노쇼 정책
 * - 운영 정책
 */

// ==================== 정책 범위 ====================

export type PolicyScope = 'PLATFORM' | 'COMPANY' | 'CLUB';

/** resolve API 응답에 포함되는 상속 정보 */
export interface PolicyInheritanceInfo {
  inherited: boolean;
  inheritedFrom: PolicyScope | null;
}

// ==================== 취소 정책 ====================

/**
 * 취소 유형
 */
export type CancellationType =
  | 'USER_NORMAL'      // 고객 정상 취소 (3일 이전)
  | 'USER_LATE'        // 고객 지연 취소 (1~3일)
  | 'USER_LASTMINUTE'  // 고객 긴급 취소 (24시간 이내)
  | 'ADMIN'            // 관리자 취소
  | 'SYSTEM';          // 시스템 취소

/**
 * 취소 정책 설정
 */
export interface CancellationPolicy {
  id?: number;
  scopeLevel?: PolicyScope;
  companyId?: number | null;
  clubId?: number | null;
  /** 정책 이름 */
  name: string;
  /** 정책 코드 */
  code: string;
  /** 설명 */
  description?: string;
  /** 고객 취소 가능 여부 */
  allowUserCancel: boolean;
  /** 고객 취소 마감 시간 (예약 시간 기준 몇 시간 전) */
  userCancelDeadlineHours: number;
  /** 당일 취소 허용 여부 */
  allowSameDayCancel: boolean;
  /** 기본 정책 여부 */
  isDefault: boolean;
  /** 활성화 여부 */
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ResolvedCancellationPolicy = CancellationPolicy & PolicyInheritanceInfo;

// ==================== 환불 정책 ====================

/**
 * 환불율 구간 설정
 */
export interface RefundRateTier {
  id?: number;
  /** 예약일 기준 최소 시간 */
  minHoursBefore: number;
  /** 예약일 기준 최대 시간 */
  maxHoursBefore?: number | null;
  /** 환불율 (0-100) */
  refundRate: number;
  /** 표시 라벨 */
  label?: string;
}

/**
 * 환불 정책 설정
 */
export interface RefundPolicy {
  id?: number;
  scopeLevel?: PolicyScope;
  companyId?: number | null;
  clubId?: number | null;
  /** 정책 이름 */
  name: string;
  /** 정책 코드 */
  code: string;
  /** 설명 */
  description?: string;
  /** 환불율 구간 목록 */
  tiers: RefundRateTier[];
  /** 관리자 취소 시 환불율 */
  adminCancelRefundRate: number;
  /** 시스템 취소 시 환불율 */
  systemCancelRefundRate?: number;
  /** 최소 환불 금액 */
  minRefundAmount: number;
  /** 환불 수수료 (고정 금액) */
  refundFee: number;
  /** 환불 수수료율 (%) */
  refundFeeRate?: number;
  /** 기본 정책 여부 */
  isDefault: boolean;
  /** 활성화 여부 */
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ResolvedRefundPolicy = RefundPolicy & PolicyInheritanceInfo;

/**
 * 기본 환불 정책 티어
 */
export const DEFAULT_REFUND_TIERS: RefundRateTier[] = [
  { minHoursBefore: 168, maxHoursBefore: null, refundRate: 100, label: '7일 이전' },
  { minHoursBefore: 72, maxHoursBefore: 168, refundRate: 80, label: '3~7일 전' },
  { minHoursBefore: 24, maxHoursBefore: 72, refundRate: 50, label: '1~3일 전' },
  { minHoursBefore: 0, maxHoursBefore: 24, refundRate: 0, label: '24시간 이내' },
];

// ==================== 노쇼 정책 ====================

/**
 * 노쇼 페널티 유형
 */
export type NoShowPenaltyType = 'WARNING' | 'RESTRICTION' | 'BLACKLIST' | 'FEE';

/**
 * 노쇼 페널티 설정
 */
export interface NoShowPenalty {
  id?: number;
  /** 최소 노쇼 횟수 */
  minCount: number;
  /** 최대 노쇼 횟수 */
  maxCount?: number | null;
  /** 페널티 유형 */
  penaltyType: NoShowPenaltyType;
  /** 예약 제한 기간 (일) */
  restrictionDays?: number;
  /** 위약금 (원) */
  feeAmount?: number;
  /** 위약금율 (%) */
  feeRate?: number;
  /** 표시 라벨 */
  label?: string;
  /** 안내 메시지 */
  message?: string;
}

/**
 * 노쇼 정책 설정
 */
export interface NoShowPolicy {
  id?: number;
  scopeLevel?: PolicyScope;
  companyId?: number | null;
  clubId?: number | null;
  /** 정책 이름 */
  name: string;
  /** 정책 코드 */
  code: string;
  /** 설명 */
  description?: string;
  /** 노쇼 시 환불 여부 */
  allowRefundOnNoShow: boolean;
  /** 노쇼 판정 시간 (예약 시간 경과 후 몇 분) */
  noShowGraceMinutes: number;
  /** 페널티 설정 목록 */
  penalties: NoShowPenalty[];
  /** 노쇼 카운트 리셋 기간 (일) */
  countResetDays: number;
  /** 기본 정책 여부 */
  isDefault: boolean;
  /** 활성화 여부 */
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ResolvedNoShowPolicy = NoShowPolicy & PolicyInheritanceInfo;

/**
 * 기본 노쇼 페널티 설정
 */
export const DEFAULT_NOSHOW_PENALTIES: NoShowPenalty[] = [
  { minCount: 1, maxCount: 1, penaltyType: 'WARNING', label: '1회 노쇼', message: '경고 알림' },
  { minCount: 2, maxCount: 2, penaltyType: 'RESTRICTION', restrictionDays: 7, label: '2회 노쇼', message: '7일간 예약 제한' },
  { minCount: 3, maxCount: 4, penaltyType: 'RESTRICTION', restrictionDays: 30, label: '3~4회 노쇼', message: '30일간 예약 제한' },
  { minCount: 5, penaltyType: 'BLACKLIST', label: '5회 이상 노쇼', message: '블랙리스트 등록' },
];

// ==================== 운영 정책 ====================

/**
 * 운영 정책 설정
 */
export interface OperatingPolicy {
  id?: number;
  scopeLevel?: PolicyScope;
  companyId?: number | null;
  clubId?: number | null;
  /** 오픈 시간 */
  openTime: string;
  /** 마감 시간 */
  closeTime: string;
  /** 마지막 티타임 */
  lastTeeTime?: string | null;
  /** 기본 최대 플레이어 수 */
  defaultMaxPlayers: number;
  /** 기본 라운드 시간 (분) */
  defaultDuration: number;
  /** 기본 휴식 시간 (분) */
  defaultBreakDuration: number;
  /** 기본 슬롯 간격 (분) */
  defaultSlotInterval: number;
  /** 성수기 시작 (MM-DD) */
  peakSeasonStart?: string | null;
  /** 성수기 종료 (MM-DD) */
  peakSeasonEnd?: string | null;
  /** 성수기 가격 배율 (%) */
  peakPriceRate: number;
  /** 주말 가격 배율 (%) */
  weekendPriceRate: number;
  /** 활성화 여부 */
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ResolvedOperatingPolicy = OperatingPolicy & PolicyInheritanceInfo;

// ==================== 통합 시스템 설정 ====================

export interface SystemSettings {
  cancellationPolicy: CancellationPolicy;
  refundPolicy: RefundPolicy;
  noShowPolicy: NoShowPolicy;
  operatingPolicy: OperatingPolicy;
}

// ==================== Update DTOs ====================

export interface UpdateCancellationPolicyDto {
  name?: string;
  description?: string;
  allowUserCancel?: boolean;
  userCancelDeadlineHours?: number;
  allowSameDayCancel?: boolean;
  isActive?: boolean;
}

export interface UpdateRefundPolicyDto {
  name?: string;
  description?: string;
  tiers?: RefundRateTier[];
  adminCancelRefundRate?: number;
  systemCancelRefundRate?: number;
  minRefundAmount?: number;
  refundFee?: number;
  refundFeeRate?: number;
  isActive?: boolean;
}

export interface UpdateNoShowPolicyDto {
  name?: string;
  description?: string;
  allowRefundOnNoShow?: boolean;
  noShowGraceMinutes?: number;
  penalties?: NoShowPenalty[];
  countResetDays?: number;
  isActive?: boolean;
}

export interface UpdateOperatingPolicyDto {
  openTime?: string;
  closeTime?: string;
  lastTeeTime?: string;
  defaultMaxPlayers?: number;
  defaultDuration?: number;
  defaultBreakDuration?: number;
  defaultSlotInterval?: number;
  peakSeasonStart?: string;
  peakSeasonEnd?: string;
  peakPriceRate?: number;
  weekendPriceRate?: number;
  isActive?: boolean;
}

// ==================== API 응답 타입 ====================

export interface PolicyApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PolicyListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
}
