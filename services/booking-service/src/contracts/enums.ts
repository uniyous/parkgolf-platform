// ==============================================
// booking-service 도메인 enum 단일 소스 (UNI-88)
// ==============================================

export const BookingStatus = { PENDING: 'PENDING', SLOT_RESERVED: 'SLOT_RESERVED', CONFIRMED: 'CONFIRMED', CANCELLED: 'CANCELLED', COMPLETED: 'COMPLETED', NO_SHOW: 'NO_SHOW', FAILED: 'FAILED' } as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const BookingSource = { INTERNAL: 'INTERNAL', PARTNER: 'PARTNER' } as const;
export type BookingSource = (typeof BookingSource)[keyof typeof BookingSource];

export const TeamSelectionStatus = { SELECTING: 'SELECTING', READY: 'READY', BOOKING: 'BOOKING', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' } as const;
export type TeamSelectionStatus = (typeof TeamSelectionStatus)[keyof typeof TeamSelectionStatus];

export const ParticipantRole = { BOOKER: 'BOOKER', MEMBER: 'MEMBER' } as const;
export type ParticipantRole = (typeof ParticipantRole)[keyof typeof ParticipantRole];

export const ParticipantStatus = { PENDING: 'PENDING', PAID: 'PAID', CANCELLED: 'CANCELLED', REFUNDED: 'REFUNDED' } as const;
export type ParticipantStatus = (typeof ParticipantStatus)[keyof typeof ParticipantStatus];

export const PaymentStatus = { PENDING: 'PENDING', PAID: 'PAID', FAILED: 'FAILED', REFUNDED: 'REFUNDED' } as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const TimeSlotCacheStatus = { AVAILABLE: 'AVAILABLE', FULLY_BOOKED: 'FULLY_BOOKED', CLOSED: 'CLOSED', MAINTENANCE: 'MAINTENANCE' } as const;
export type TimeSlotCacheStatus = (typeof TimeSlotCacheStatus)[keyof typeof TimeSlotCacheStatus];

export const OutboxStatus = { PENDING: 'PENDING', PROCESSING: 'PROCESSING', SENT: 'SENT', FAILED: 'FAILED' } as const;
export type OutboxStatus = (typeof OutboxStatus)[keyof typeof OutboxStatus];

export const RefundStatus = { REQUESTED: 'REQUESTED', PENDING: 'PENDING', APPROVED: 'APPROVED', PROCESSING: 'PROCESSING', COMPLETED: 'COMPLETED', REJECTED: 'REJECTED' } as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export const CancellationType = { USER_NORMAL: 'USER_NORMAL', USER_LATE: 'USER_LATE', USER_LASTMINUTE: 'USER_LASTMINUTE', ADMIN: 'ADMIN', SYSTEM: 'SYSTEM' } as const;
export type CancellationType = (typeof CancellationType)[keyof typeof CancellationType];

const vals = <T extends Record<string, string>>(o: T) => Object.values(o) as [T[keyof T], ...T[keyof T][]];
export const BOOKING_STATUS_VALUES = vals(BookingStatus);
export const BOOKING_SOURCE_VALUES = vals(BookingSource);
export const TEAM_SELECTION_STATUS_VALUES = vals(TeamSelectionStatus);
export const PARTICIPANT_ROLE_VALUES = vals(ParticipantRole);
export const PARTICIPANT_STATUS_VALUES = vals(ParticipantStatus);
export const PAYMENT_STATUS_VALUES = vals(PaymentStatus);
export const TIMESLOT_CACHE_STATUS_VALUES = vals(TimeSlotCacheStatus);
export const OUTBOX_STATUS_VALUES = vals(OutboxStatus);
export const REFUND_STATUS_VALUES = vals(RefundStatus);
export const CANCELLATION_TYPE_VALUES = vals(CancellationType);

export type JsonValue = string | number | boolean | null | { [k: string]: JsonValue } | JsonValue[];
