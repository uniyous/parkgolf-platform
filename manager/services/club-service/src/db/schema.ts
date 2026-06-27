// ==============================================
// club-service / club_db — Drizzle schema (UNI-81)
// 컬럼명 snake_case(@map). @updatedAt → $defaultFn+$onUpdate. createdAt → defaultNow.
// 금액 Decimal(10,2) → integer (KRW). Float → doublePrecision. @db.Date → date(mode:'date').
// ==============================================
import { pgTable, pgEnum, serial, integer, text, boolean, jsonb, timestamp, date, doublePrecision, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  GAME_STATUS_VALUES, TIME_SLOT_STATUS_VALUES, COURSE_STATUS_VALUES, CLUB_STATUS_VALUES, TEE_BOX_LEVEL_VALUES,
  SLOT_MODE_VALUES, CLUB_TYPE_VALUES, BOOKING_MODE_VALUES, POLICY_SCOPE_VALUES, NOSHOW_PENALTY_TYPE_VALUES,
} from '../contracts/enums';

export const gameStatusEnum = pgEnum('GameStatus', GAME_STATUS_VALUES);
export const timeSlotStatusEnum = pgEnum('TimeSlotStatus', TIME_SLOT_STATUS_VALUES);
export const courseStatusEnum = pgEnum('CourseStatus', COURSE_STATUS_VALUES);
export const clubStatusEnum = pgEnum('ClubStatus', CLUB_STATUS_VALUES);
export const teeBoxLevelEnum = pgEnum('TeeBoxLevel', TEE_BOX_LEVEL_VALUES);
export const slotModeEnum = pgEnum('SlotMode', SLOT_MODE_VALUES);
export const clubTypeEnum = pgEnum('ClubType', CLUB_TYPE_VALUES);
export const bookingModeEnum = pgEnum('BookingMode', BOOKING_MODE_VALUES);
export const policyScopeEnum = pgEnum('PolicyScope', POLICY_SCOPE_VALUES);
export const noShowPenaltyTypeEnum = pgEnum('NoShowPenaltyType', NOSHOW_PENALTY_TYPE_VALUES);

const ts = (name: string) => timestamp(name, { precision: 3 });
const createdAt = () => ts('created_at').notNull().defaultNow();
const updatedAt = () => ts('updated_at').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date());

// ── Club ─────────────────────────────────────
export const clubs = pgTable(
  'clubs',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    companyId: integer('company_id').notNull(),
    location: text('location').notNull(),
    address: text('address').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    website: text('website'),
    totalHoles: integer('total_holes').notNull().default(0),
    totalCourses: integer('total_courses').notNull().default(0),
    status: clubStatusEnum('status').notNull().default('ACTIVE'),
    operatingHours: jsonb('operating_hours'),
    seasonInfo: jsonb('season_info'),
    facilities: text('facilities').array().notNull().default([]),
    clubType: clubTypeEnum('club_type').notNull().default('PAID'),
    bookingMode: bookingModeEnum('booking_mode').notNull().default('PLATFORM'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('clubs_company_id_idx').on(t.companyId),
    index('clubs_status_idx').on(t.status),
    index('clubs_is_active_idx').on(t.isActive),
    index('clubs_latitude_longitude_idx').on(t.latitude, t.longitude),
  ],
);

// ── Course ───────────────────────────────────
export const courses = pgTable(
  'courses',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    subtitle: text('subtitle'),
    description: text('description'),
    holeCount: integer('hole_count').notNull().default(9),
    par: integer('par').notNull().default(36),
    totalDistance: integer('total_distance'),
    difficulty: integer('difficulty').notNull().default(3),
    scenicRating: integer('scenic_rating').notNull().default(3),
    courseRating: doublePrecision('course_rating'),
    slopeRating: doublePrecision('slope_rating'),
    imageUrl: text('image_url'),
    status: courseStatusEnum('status').notNull().default('ACTIVE'),
    clubId: integer('club_id').notNull(),
    companyId: integer('company_id').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('courses_club_id_idx').on(t.clubId),
    index('courses_company_id_idx').on(t.companyId),
    index('courses_status_idx').on(t.status),
    index('courses_is_active_idx').on(t.isActive),
  ],
);

// ── Hole ─────────────────────────────────────
export const holes = pgTable(
  'holes',
  {
    id: serial('id').primaryKey(),
    holeNumber: integer('hole_number').notNull(),
    par: integer('par').notNull(),
    distance: integer('distance').notNull(),
    handicap: integer('handicap').notNull(),
    description: text('description'),
    tips: text('tips'),
    imageUrl: text('image_url'),
    courseId: integer('course_id').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('holes_course_id_hole_number_key').on(t.courseId, t.holeNumber),
    index('holes_course_id_idx').on(t.courseId),
  ],
);

// ── TeeBox ───────────────────────────────────
export const teeBoxes = pgTable(
  'tee_boxes',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    color: text('color').notNull(),
    distance: integer('distance').notNull(),
    difficulty: teeBoxLevelEnum('difficulty').notNull().default('INTERMEDIATE'),
    holeId: integer('hole_id').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('tee_boxes_hole_id_idx').on(t.holeId)],
);

// ── Game ─────────────────────────────────────
export const games = pgTable(
  'games',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    description: text('description'),
    frontNineCourseId: integer('front_nine_course_id').notNull(),
    backNineCourseId: integer('back_nine_course_id').notNull(),
    slotMode: slotModeEnum('slot_mode').notNull().default('TEE_TIME'),
    totalHoles: integer('total_holes').notNull().default(18),
    estimatedDuration: integer('estimated_duration').notNull().default(180),
    breakDuration: integer('break_duration').notNull().default(10),
    maxPlayers: integer('max_players').notNull().default(4),
    basePrice: integer('base_price').notNull(),
    weekendPrice: integer('weekend_price'),
    holidayPrice: integer('holiday_price'),
    clubId: integer('club_id').notNull(),
    status: gameStatusEnum('status').notNull().default('ACTIVE'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('games_code_key').on(t.code),
    uniqueIndex('games_front_nine_course_id_back_nine_course_id_key').on(t.frontNineCourseId, t.backNineCourseId),
    index('games_club_id_idx').on(t.clubId),
    index('games_status_idx').on(t.status),
    index('games_is_active_idx').on(t.isActive),
    index('games_club_id_status_is_active_idx').on(t.clubId, t.status, t.isActive),
  ],
);

// ── GameTimeSlot ─────────────────────────────
export const gameTimeSlots = pgTable(
  'game_time_slots',
  {
    id: serial('id').primaryKey(),
    gameId: integer('game_id').notNull(),
    date: date('date', { mode: 'date' }).notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    maxPlayers: integer('max_players').notNull().default(4),
    bookedPlayers: integer('booked_players').notNull().default(0),
    externalBooked: integer('external_booked').notNull().default(0),
    price: integer('price').notNull(),
    isPremium: boolean('is_premium').notNull().default(false),
    status: timeSlotStatusEnum('status').notNull().default('AVAILABLE'),
    isActive: boolean('is_active').notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('game_time_slots_game_id_date_start_time_key').on(t.gameId, t.date, t.startTime),
    index('game_time_slots_game_id_date_idx').on(t.gameId, t.date),
    index('game_time_slots_game_id_status_idx').on(t.gameId, t.status),
    index('game_time_slots_date_idx').on(t.date),
    index('game_time_slots_status_idx').on(t.status),
    index('game_time_slots_is_active_idx').on(t.isActive),
  ],
);

// ── GameWeeklySchedule ───────────────────────
export const gameWeeklySchedules = pgTable(
  'game_weekly_schedules',
  {
    id: serial('id').primaryKey(),
    gameId: integer('game_id').notNull(),
    dayOfWeek: integer('day_of_week').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    interval: integer('interval').notNull().default(10),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('game_weekly_schedules_game_id_day_of_week_start_time_key').on(t.gameId, t.dayOfWeek, t.startTime),
    index('game_weekly_schedules_game_id_idx').on(t.gameId),
  ],
);

// ── ProcessedSlotReservation ─────────────────
export const processedSlotReservations = pgTable(
  'processed_slot_reservations',
  {
    id: serial('id').primaryKey(),
    bookingId: integer('booking_id').notNull(),
    gameTimeSlotId: integer('game_time_slot_id').notNull(),
    processedAt: ts('processed_at').notNull().defaultNow(),
    expiresAt: ts('expires_at').notNull(),
  },
  (t) => [
    uniqueIndex('processed_slot_reservations_booking_id_game_time_slot_id_key').on(t.bookingId, t.gameTimeSlotId),
    index('processed_slot_reservations_expires_at_idx').on(t.expiresAt),
  ],
);

// ── CancellationPolicy ───────────────────────
export const cancellationPolicies = pgTable(
  'cancellation_policies',
  {
    id: serial('id').primaryKey(),
    scopeLevel: policyScopeEnum('scope_level').notNull().default('PLATFORM'),
    companyId: integer('company_id'),
    clubId: integer('club_id'),
    name: text('name').notNull(),
    code: text('code').notNull(),
    description: text('description'),
    allowUserCancel: boolean('allow_user_cancel').notNull().default(true),
    userCancelDeadlineHours: integer('user_cancel_deadline_hours').notNull().default(72),
    allowSameDayCancel: boolean('allow_same_day_cancel').notNull().default(false),
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('cancellation_policies_scope_level_company_id_club_id_key').on(t.scopeLevel, t.companyId, t.clubId),
    index('cancellation_policies_scope_level_idx').on(t.scopeLevel),
    index('cancellation_policies_company_id_idx').on(t.companyId),
    index('cancellation_policies_club_id_idx').on(t.clubId),
    index('cancellation_policies_is_active_idx').on(t.isActive),
  ],
);

// ── RefundPolicy ─────────────────────────────
export const refundPolicies = pgTable(
  'refund_policies',
  {
    id: serial('id').primaryKey(),
    scopeLevel: policyScopeEnum('scope_level').notNull().default('PLATFORM'),
    companyId: integer('company_id'),
    clubId: integer('club_id'),
    name: text('name').notNull(),
    code: text('code').notNull(),
    description: text('description'),
    adminCancelRefundRate: integer('admin_cancel_refund_rate').notNull().default(100),
    systemCancelRefundRate: integer('system_cancel_refund_rate').notNull().default(100),
    minRefundAmount: integer('min_refund_amount').notNull().default(0),
    refundFee: integer('refund_fee').notNull().default(0),
    refundFeeRate: integer('refund_fee_rate').notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('refund_policies_scope_level_company_id_club_id_key').on(t.scopeLevel, t.companyId, t.clubId),
    index('refund_policies_scope_level_idx').on(t.scopeLevel),
    index('refund_policies_company_id_idx').on(t.companyId),
    index('refund_policies_club_id_idx').on(t.clubId),
    index('refund_policies_is_active_idx').on(t.isActive),
  ],
);

// ── RefundTier ───────────────────────────────
export const refundTiers = pgTable(
  'refund_tiers',
  {
    id: serial('id').primaryKey(),
    refundPolicyId: integer('refund_policy_id').notNull(),
    minHoursBefore: integer('min_hours_before').notNull(),
    maxHoursBefore: integer('max_hours_before'),
    refundRate: integer('refund_rate').notNull(),
    label: text('label'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('refund_tiers_refund_policy_id_idx').on(t.refundPolicyId)],
);

// ── NoShowPolicy ─────────────────────────────
export const noShowPolicies = pgTable(
  'noshow_policies',
  {
    id: serial('id').primaryKey(),
    scopeLevel: policyScopeEnum('scope_level').notNull().default('PLATFORM'),
    companyId: integer('company_id'),
    clubId: integer('club_id'),
    name: text('name').notNull(),
    code: text('code').notNull(),
    description: text('description'),
    allowRefundOnNoShow: boolean('allow_refund_on_noshow').notNull().default(false),
    noShowGraceMinutes: integer('noshow_grace_minutes').notNull().default(30),
    countResetDays: integer('count_reset_days').notNull().default(365),
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('noshow_policies_scope_level_company_id_club_id_key').on(t.scopeLevel, t.companyId, t.clubId),
    index('noshow_policies_scope_level_idx').on(t.scopeLevel),
    index('noshow_policies_company_id_idx').on(t.companyId),
    index('noshow_policies_club_id_idx').on(t.clubId),
    index('noshow_policies_is_active_idx').on(t.isActive),
  ],
);

// ── NoShowPenalty ────────────────────────────
export const noShowPenalties = pgTable(
  'noshow_penalties',
  {
    id: serial('id').primaryKey(),
    noShowPolicyId: integer('noshow_policy_id').notNull(),
    minCount: integer('min_count').notNull(),
    maxCount: integer('max_count'),
    penaltyType: noShowPenaltyTypeEnum('penalty_type').notNull(),
    restrictionDays: integer('restriction_days'),
    feeAmount: integer('fee_amount'),
    feeRate: integer('fee_rate'),
    label: text('label'),
    message: text('message'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('noshow_penalties_noshow_policy_id_idx').on(t.noShowPolicyId)],
);

// ── UserNoShowRecord ─────────────────────────
export const userNoShowRecords = pgTable(
  'user_noshow_records',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    bookingId: integer('booking_id').notNull(),
    noShowAt: ts('noshow_at').notNull(),
    processedBy: integer('processed_by'),
    notes: text('notes'),
    isReset: boolean('is_reset').notNull().default(false),
    resetAt: ts('reset_at'),
    resetBy: integer('reset_by'),
    resetReason: text('reset_reason'),
    createdAt: createdAt(),
  },
  (t) => [
    index('user_noshow_records_user_id_idx').on(t.userId),
    index('user_noshow_records_booking_id_idx').on(t.bookingId),
    index('user_noshow_records_noshow_at_idx').on(t.noShowAt),
  ],
);

// ── OperatingPolicy ──────────────────────────
export const operatingPolicies = pgTable(
  'operating_policies',
  {
    id: serial('id').primaryKey(),
    scopeLevel: policyScopeEnum('scope_level').notNull().default('COMPANY'),
    companyId: integer('company_id'),
    clubId: integer('club_id'),
    openTime: text('open_time').notNull().default('06:00'),
    closeTime: text('close_time').notNull().default('18:00'),
    lastTeeTime: text('last_tee_time'),
    defaultMaxPlayers: integer('default_max_players').notNull().default(4),
    defaultDuration: integer('default_duration').notNull().default(180),
    defaultBreakDuration: integer('default_break_duration').notNull().default(10),
    defaultSlotInterval: integer('default_slot_interval').notNull().default(10),
    peakSeasonStart: text('peak_season_start'),
    peakSeasonEnd: text('peak_season_end'),
    peakPriceRate: integer('peak_price_rate').notNull().default(100),
    weekendPriceRate: integer('weekend_price_rate').notNull().default(100),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('operating_policies_scope_level_company_id_club_id_key').on(t.scopeLevel, t.companyId, t.clubId),
    index('operating_policies_scope_level_idx').on(t.scopeLevel),
    index('operating_policies_company_id_idx').on(t.companyId),
    index('operating_policies_club_id_idx').on(t.clubId),
  ],
);

// ── 관계 ─────────────────────────────────────
export const clubsRelations = relations(clubs, ({ many }) => ({
  courses: many(courses),
  games: many(games),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  club: one(clubs, { fields: [courses.clubId], references: [clubs.id] }),
  holes: many(holes),
  gamesAsFrontNine: many(games, { relationName: 'FrontNine' }),
  gamesAsBackNine: many(games, { relationName: 'BackNine' }),
}));

export const holesRelations = relations(holes, ({ one, many }) => ({
  course: one(courses, { fields: [holes.courseId], references: [courses.id] }),
  teeBoxes: many(teeBoxes),
}));

export const teeBoxesRelations = relations(teeBoxes, ({ one }) => ({
  hole: one(holes, { fields: [teeBoxes.holeId], references: [holes.id] }),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  frontNineCourse: one(courses, { relationName: 'FrontNine', fields: [games.frontNineCourseId], references: [courses.id] }),
  backNineCourse: one(courses, { relationName: 'BackNine', fields: [games.backNineCourseId], references: [courses.id] }),
  club: one(clubs, { fields: [games.clubId], references: [clubs.id] }),
  timeSlots: many(gameTimeSlots),
  weeklySchedules: many(gameWeeklySchedules),
}));

export const gameTimeSlotsRelations = relations(gameTimeSlots, ({ one }) => ({
  game: one(games, { fields: [gameTimeSlots.gameId], references: [games.id] }),
}));

export const gameWeeklySchedulesRelations = relations(gameWeeklySchedules, ({ one }) => ({
  game: one(games, { fields: [gameWeeklySchedules.gameId], references: [games.id] }),
}));

export const refundPoliciesRelations = relations(refundPolicies, ({ many }) => ({
  tiers: many(refundTiers),
}));

export const refundTiersRelations = relations(refundTiers, ({ one }) => ({
  refundPolicy: one(refundPolicies, { fields: [refundTiers.refundPolicyId], references: [refundPolicies.id] }),
}));

export const noShowPoliciesRelations = relations(noShowPolicies, ({ many }) => ({
  penalties: many(noShowPenalties),
}));

export const noShowPenaltiesRelations = relations(noShowPenalties, ({ one }) => ({
  noShowPolicy: one(noShowPolicies, { fields: [noShowPenalties.noShowPolicyId], references: [noShowPolicies.id] }),
}));

// ── Row 타입 ─────────────────────────────────
export type Club = typeof clubs.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Hole = typeof holes.$inferSelect;
export type TeeBox = typeof teeBoxes.$inferSelect;
export type Game = typeof games.$inferSelect;
export type GameTimeSlot = typeof gameTimeSlots.$inferSelect;
export type GameWeeklySchedule = typeof gameWeeklySchedules.$inferSelect;
export type ProcessedSlotReservation = typeof processedSlotReservations.$inferSelect;
export type CancellationPolicy = typeof cancellationPolicies.$inferSelect;
export type RefundPolicy = typeof refundPolicies.$inferSelect;
export type RefundTier = typeof refundTiers.$inferSelect;
export type NoShowPolicy = typeof noShowPolicies.$inferSelect;
export type NoShowPenalty = typeof noShowPenalties.$inferSelect;
export type UserNoShowRecord = typeof userNoShowRecords.$inferSelect;
export type OperatingPolicy = typeof operatingPolicies.$inferSelect;
