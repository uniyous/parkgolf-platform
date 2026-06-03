// ==============================================
// club-service 도메인 enum 단일 소스 (UNI-81 Drizzle 전환)
// ==============================================

export const GameStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', MAINTENANCE: 'MAINTENANCE' } as const;
export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus];

export const TimeSlotStatus = { AVAILABLE: 'AVAILABLE', FULLY_BOOKED: 'FULLY_BOOKED', CLOSED: 'CLOSED', MAINTENANCE: 'MAINTENANCE' } as const;
export type TimeSlotStatus = (typeof TimeSlotStatus)[keyof typeof TimeSlotStatus];

export const CourseStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', MAINTENANCE: 'MAINTENANCE' } as const;
export type CourseStatus = (typeof CourseStatus)[keyof typeof CourseStatus];

export const ClubStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', MAINTENANCE: 'MAINTENANCE', SEASONAL_CLOSED: 'SEASONAL_CLOSED' } as const;
export type ClubStatus = (typeof ClubStatus)[keyof typeof ClubStatus];

export const TeeBoxLevel = { BEGINNER: 'BEGINNER', INTERMEDIATE: 'INTERMEDIATE', ADVANCED: 'ADVANCED', PROFESSIONAL: 'PROFESSIONAL' } as const;
export type TeeBoxLevel = (typeof TeeBoxLevel)[keyof typeof TeeBoxLevel];

export const SlotMode = { TEE_TIME: 'TEE_TIME', SESSION: 'SESSION' } as const;
export type SlotMode = (typeof SlotMode)[keyof typeof SlotMode];

export const ClubType = { PAID: 'PAID', FREE: 'FREE' } as const;
export type ClubType = (typeof ClubType)[keyof typeof ClubType];

export const BookingMode = { PLATFORM: 'PLATFORM', PARTNER: 'PARTNER' } as const;
export type BookingMode = (typeof BookingMode)[keyof typeof BookingMode];

export const PolicyScope = { PLATFORM: 'PLATFORM', COMPANY: 'COMPANY', CLUB: 'CLUB' } as const;
export type PolicyScope = (typeof PolicyScope)[keyof typeof PolicyScope];

export const NoShowPenaltyType = { WARNING: 'WARNING', RESTRICTION: 'RESTRICTION', FEE: 'FEE', BLACKLIST: 'BLACKLIST' } as const;
export type NoShowPenaltyType = (typeof NoShowPenaltyType)[keyof typeof NoShowPenaltyType];

const vals = <T extends Record<string, string>>(o: T) => Object.values(o) as [T[keyof T], ...T[keyof T][]];
export const GAME_STATUS_VALUES = vals(GameStatus);
export const TIME_SLOT_STATUS_VALUES = vals(TimeSlotStatus);
export const COURSE_STATUS_VALUES = vals(CourseStatus);
export const CLUB_STATUS_VALUES = vals(ClubStatus);
export const TEE_BOX_LEVEL_VALUES = vals(TeeBoxLevel);
export const SLOT_MODE_VALUES = vals(SlotMode);
export const CLUB_TYPE_VALUES = vals(ClubType);
export const BOOKING_MODE_VALUES = vals(BookingMode);
export const POLICY_SCOPE_VALUES = vals(PolicyScope);
export const NOSHOW_PENALTY_TYPE_VALUES = vals(NoShowPenaltyType);

// Prisma Json 대체 타입
export type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];
