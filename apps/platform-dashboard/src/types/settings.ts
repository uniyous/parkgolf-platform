/**
 * 시스템 설정 관련 타입 정의
 * - 취소 정책
 * - 환불 정책
 * - 노쇼 정책
 */

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
 * 취소 기한 설정
 */
export interface CancellationDeadline {
  id?: number;
  /** 예약일 기준 몇 시간 전까지 취소 가능 (예: 72시간 = 3일) */
  hoursBeforeBooking: number;
  /** 취소 유형 */
  type: CancellationType;
  /** 설명 */
  description: string;
  /** 활성화 여부 */
  isActive: boolean;
}

/**
 * 취소 정책 설정
 */
export interface CancellationPolicy {
  id?: number;
  /** 정책 이름 */
  name: string;
  /** 정책 코드 (고유) */
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
  /** 적용 대상 골프장 ID 목록 (비어있으면 전체 적용) */
  clubIds?: number[];
  createdAt?: string;
  updatedAt?: string;
}

// ==================== 환불 정책 ====================

/**
 * 환불율 구간 설정
 */
export interface RefundRateTier {
  id?: number;
  /** 예약일 기준 최소 시간 (예: 72 = 3일 이상) */
  minHoursBeforeBooking: number;
  /** 예약일 기준 최대 시간 (예: 168 = 7일 이하) */
  maxHoursBeforeBooking: number | null;
  /** 환불율 (0-100) */
  refundRate: number;
  /** 설명 */
  description: string;
}

/**
 * 환불 정책 설정
 */
export interface RefundPolicy {
  id?: number;
  /** 정책 이름 */
  name: string;
  /** 정책 코드 (고유) */
  code: string;
  /** 설명 */
  description?: string;
  /** 환불율 구간 목록 */
  tiers: RefundRateTier[];
  /** 관리자/시스템 취소 시 환불율 */
  adminCancelRefundRate: number;
  /** 최소 환불 금액 */
  minRefundAmount: number;
  /** 환불 수수료 (고정 금액) */
  refundFee: number;
  /** 기본 정책 여부 */
  isDefault: boolean;
  /** 활성화 여부 */
  isActive: boolean;
  /** 적용 대상 골프장 ID 목록 (비어있으면 전체 적용) */
  clubIds?: number[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 기본 환불 정책 티어 (문서 기준)
 * - 7일 이전: 100%
 * - 3~7일: 80%
 * - 1~3일: 50%
 * - 24시간 이내: 0~30%
 */
export const DEFAULT_REFUND_TIERS: RefundRateTier[] = [
  {
    minHoursBeforeBooking: 168, // 7일 이상
    maxHoursBeforeBooking: null,
    refundRate: 100,
    description: '예약일 7일 전 취소',
  },
  {
    minHoursBeforeBooking: 72, // 3~7일
    maxHoursBeforeBooking: 168,
    refundRate: 80,
    description: '예약일 3~7일 전 취소',
  },
  {
    minHoursBeforeBooking: 24, // 1~3일
    maxHoursBeforeBooking: 72,
    refundRate: 50,
    description: '예약일 1~3일 전 취소',
  },
  {
    minHoursBeforeBooking: 0, // 24시간 이내
    maxHoursBeforeBooking: 24,
    refundRate: 0,
    description: '예약일 24시간 이내 취소',
  },
];

// ==================== 노쇼 정책 ====================

/**
 * 노쇼 페널티 유형
 */
export type NoShowPenaltyType =
  | 'WARNING'          // 경고
  | 'RESTRICTION'      // 예약 제한
  | 'BLACKLIST'        // 블랙리스트
  | 'FEE';             // 위약금

/**
 * 노쇼 페널티 설정
 */
export interface NoShowPenalty {
  id?: number;
  /** 페널티 유형 */
  type: NoShowPenaltyType;
  /** 발동 조건: 노쇼 횟수 */
  triggerCount: number;
  /** 기간 내 노쇼 횟수 (일) */
  withinDays: number;
  /** 페널티 기간 (일) - RESTRICTION일 경우 */
  penaltyDays?: number;
  /** 위약금 금액 - FEE일 경우 */
  penaltyAmount?: number;
  /** 설명 */
  description: string;
  /** 활성화 여부 */
  isActive: boolean;
}

/**
 * 노쇼 정책 설정
 */
export interface NoShowPolicy {
  id?: number;
  /** 정책 이름 */
  name: string;
  /** 정책 코드 (고유) */
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
  /** 적용 대상 골프장 ID 목록 (비어있으면 전체 적용) */
  clubIds?: number[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 기본 노쇼 페널티 설정
 */
export const DEFAULT_NOSHOW_PENALTIES: NoShowPenalty[] = [
  {
    type: 'WARNING',
    triggerCount: 1,
    withinDays: 30,
    description: '첫 번째 노쇼: 경고 알림',
    isActive: true,
  },
  {
    type: 'RESTRICTION',
    triggerCount: 2,
    withinDays: 30,
    penaltyDays: 7,
    description: '30일 내 2회 노쇼: 7일간 예약 제한',
    isActive: true,
  },
  {
    type: 'RESTRICTION',
    triggerCount: 3,
    withinDays: 90,
    penaltyDays: 30,
    description: '90일 내 3회 노쇼: 30일간 예약 제한',
    isActive: true,
  },
  {
    type: 'BLACKLIST',
    triggerCount: 5,
    withinDays: 180,
    description: '180일 내 5회 노쇼: 블랙리스트 등록',
    isActive: false,
  },
];

// ==================== 통합 시스템 설정 ====================

/**
 * 시스템 설정 전체
 */
export interface SystemSettings {
  cancellationPolicy: CancellationPolicy;
  refundPolicy: RefundPolicy;
  noShowPolicy: NoShowPolicy;
}

/**
 * 시스템 설정 업데이트 DTO
 */
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
  minRefundAmount?: number;
  refundFee?: number;
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
