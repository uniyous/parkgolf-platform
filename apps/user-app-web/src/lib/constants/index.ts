/**
 * user-app-web 공통 상수 정의
 */

import type { BookingStatus } from '@/lib/api/bookingApi';

// =====================
// 서비스 수수료
// =====================
export const SERVICE_FEE_RATE = 0.03; // 3%

// =====================
// 날짜 필터 설정
// =====================
export const DATE_FILTER_MAX_MONTHS = 2; // 최대 2개월 후까지 선택 가능

// =====================
// 결제 수단
// =====================
export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'card',
    name: '신용카드',
    icon: '💳',
    description: '신용카드 또는 체크카드로 결제',
  },
  {
    id: 'kakaopay',
    name: '카카오페이',
    icon: '💛',
    description: '카카오페이로 간편결제',
  },
  {
    id: 'naverpay',
    name: '네이버페이',
    icon: '💚',
    description: '네이버페이로 간편결제',
  },
  {
    id: 'tosspay',
    name: '토스페이',
    icon: '💙',
    description: '토스페이로 간편결제',
  },
  {
    id: 'bank',
    name: '계좌이체',
    icon: '🏦',
    description: '실시간 계좌이체',
  },
];

// =====================
// 예약 상태 스타일
// =====================
export interface BookingStatusStyle {
  label: string;
  className: string;
}

export const BOOKING_STATUS_STYLES: Record<BookingStatus, BookingStatusStyle> = {
  PENDING: { label: '대기중', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  SLOT_RESERVED: { label: '슬롯예약완료', className: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  CONFIRMED: { label: '확정', className: 'bg-green-500/20 text-green-300 border-green-500/30' },
  CANCELLED: { label: '취소됨', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
  COMPLETED: { label: '완료', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  NO_SHOW: { label: '노쇼', className: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
  FAILED: { label: '실패', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

// =====================
// 예약 취소 사유
// =====================
export const CANCEL_REASONS = [
  '일정 변경',
  '개인 사정',
  '건강 문제',
  '날씨 이유',
  '다른 예약 확정',
  '기타',
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number];

// =====================
// 검색 필터 옵션
// =====================
export interface SelectOption<T = string> {
  value: T;
  label: string;
}

export const TIME_OF_DAY_OPTIONS: SelectOption[] = [
  { value: '', label: '전체' },
  { value: 'DAWN', label: '새벽 (05~08시)' },
  { value: 'MORNING', label: '오전 (08~12시)' },
  { value: 'AFTERNOON', label: '오후 (12~17시)' },
  { value: 'EVENING', label: '저녁 (17~22시)' },
];

// 시간대 칩 토글 (다중선택)
export const TIME_PERIOD_CHIPS = [
  { value: 'DAWN', label: '새벽', desc: '05~08시' },
  { value: 'MORNING', label: '오전', desc: '08~12시' },
  { value: 'AFTERNOON', label: '오후', desc: '12~17시' },
  { value: 'EVENING', label: '저녁', desc: '17~22시' },
] as const;

// 시간대별 범위 (startTimeFrom, startTimeTo)
export const TIME_RANGES: Record<string, [string, string]> = {
  DAWN: ['05:00', '08:00'],
  MORNING: ['08:00', '12:00'],
  AFTERNOON: ['12:00', '17:00'],
  EVENING: ['17:00', '22:00'],
};

/**
 * 다중 선택된 시간대를 startTimeFrom/startTimeTo 범위로 변환
 * 예: ['MORNING', 'AFTERNOON'] → { startTimeFrom: '08:00', startTimeTo: '17:00' }
 */
export function computeTimeRange(periods: string[]): { startTimeFrom: string; startTimeTo: string } | null {
  const ranges = periods.map(p => TIME_RANGES[p]).filter(Boolean);
  if (ranges.length === 0) return null;
  return {
    startTimeFrom: ranges.reduce((min, r) => (r[0] < min ? r[0] : min), ranges[0][0]),
    startTimeTo: ranges.reduce((max, r) => (r[1] > max ? r[1] : max), ranges[0][1]),
  };
}

export const SORT_OPTIONS: SelectOption[] = [
  { value: 'name-asc', label: '이름순 (오름차순)' },
  { value: 'name-desc', label: '이름순 (내림차순)' },
  { value: 'price-asc', label: '가격 낮은순' },
  { value: 'price-desc', label: '가격 높은순' },
  { value: 'createdAt-desc', label: '최신순' },
];

export const PLAYER_OPTIONS: SelectOption[] = [
  { value: 'all', label: '인원 제한 없음' },
  { value: '1', label: '1명 이상' },
  { value: '2', label: '2명 이상' },
  { value: '3', label: '3명 이상' },
  { value: '4', label: '4명 이상' },
];

// =====================
// 시니어 UI용 시간대 (3개: 전체/오전/오후)
// =====================
export const SIMPLE_TIME_PERIODS = [
  { value: '', label: '전체' },
  { value: 'DAWN,MORNING', label: '오전' },
  { value: 'AFTERNOON,EVENING', label: '오후' },
] as const;

// =====================
// 시니어 UI용 결제수단 (2개)
// =====================
export const SIMPLE_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'onsite', name: '현장결제', icon: '🏪', description: '골프장에서 직접 결제' },
  { id: 'card', name: '카드결제', icon: '💳', description: '신용/체크카드 결제' },
];

// =====================
// 페이지네이션 기본값
// =====================
export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_PAGE = 1;
