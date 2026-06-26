// ==============================================
// booking-service / booking_db — Drizzle schema (UNI-88)
// 금액 컬럼: Decimal(10,2) → integer (KRW 원 단위, 분수값 0 확인). 컬럼명 snake_case(@map).
// @updatedAt → $defaultFn. @db.Date → date(mode:'date').
// ==============================================
import { pgTable, pgEnum, serial, integer, text, boolean, jsonb, timestamp, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  BOOKING_STATUS_VALUES, BOOKING_SOURCE_VALUES, TEAM_SELECTION_STATUS_VALUES, PARTICIPANT_ROLE_VALUES,
  PARTICIPANT_STATUS_VALUES, PAYMENT_STATUS_VALUES, TIMESLOT_CACHE_STATUS_VALUES, OUTBOX_STATUS_VALUES,
  REFUND_STATUS_VALUES, CANCELLATION_TYPE_VALUES,
} from '../contracts/enums';

export const bookingStatusEnum = pgEnum('BookingStatus', BOOKING_STATUS_VALUES);
export const bookingSourceEnum = pgEnum('BookingSource', BOOKING_SOURCE_VALUES);
export const teamSelectionStatusEnum = pgEnum('TeamSelectionStatus', TEAM_SELECTION_STATUS_VALUES);
export const participantRoleEnum = pgEnum('ParticipantRole', PARTICIPANT_ROLE_VALUES);
export const participantStatusEnum = pgEnum('ParticipantStatus', PARTICIPANT_STATUS_VALUES);
export const paymentStatusEnum = pgEnum('PaymentStatus', PAYMENT_STATUS_VALUES);
export const timeSlotCacheStatusEnum = pgEnum('TimeSlotCacheStatus', TIMESLOT_CACHE_STATUS_VALUES);
export const outboxStatusEnum = pgEnum('OutboxStatus', OUTBOX_STATUS_VALUES);
export const refundStatusEnum = pgEnum('RefundStatus', REFUND_STATUS_VALUES);
export const cancellationTypeEnum = pgEnum('CancellationType', CANCELLATION_TYPE_VALUES);

const ts = (name: string) => timestamp(name, { precision: 3 });

export const bookings = pgTable(
  'bookings',
  {
    id: serial('id').primaryKey(),
    gameTimeSlotId: integer('game_time_slot_id').notNull(),
    gameId: integer('game_id').notNull(),
    gameName: text('game_name'),
    gameCode: text('game_code'),
    frontNineCourseId: integer('front_nine_course_id'),
    frontNineCourseName: text('front_nine_course_name'),
    backNineCourseId: integer('back_nine_course_id'),
    backNineCourseName: text('back_nine_course_name'),
    bookingDate: ts('booking_date').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    clubId: integer('club_id'),
    clubName: text('club_name'),
    userId: integer('user_id'),
    guestName: text('guest_name'),
    guestEmail: text('guest_email'),
    guestPhone: text('guest_phone'),
    playerCount: integer('player_count').notNull().default(1),
    pricePerPerson: integer('price_per_person').notNull(),
    serviceFee: integer('service_fee').notNull().default(0),
    totalPrice: integer('total_price').notNull(),
    status: bookingStatusEnum('status').notNull().default('PENDING'),
    source: bookingSourceEnum('source').notNull().default('INTERNAL'),
    externalBookingId: text('external_booking_id'),
    paymentMethod: text('payment_method'),
    specialRequests: text('special_requests'),
    bookingNumber: text('booking_number').notNull(),
    idempotencyKey: text('idempotency_key'),
    notes: text('notes'),
    sagaFailReason: text('saga_fail_reason'),
    userEmail: text('user_email'),
    userName: text('user_name'),
    userPhone: text('user_phone'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
    groupId: text('group_id'),
    teamNumber: integer('team_number'),
    teamSelectionId: integer('team_selection_id'),
  },
  (t) => [
    uniqueIndex('bookings_external_booking_id_key').on(t.externalBookingId),
    uniqueIndex('bookings_booking_number_key').on(t.bookingNumber),
    uniqueIndex('bookings_idempotency_key_key').on(t.idempotencyKey),
    index('bookings_user_id_idx').on(t.userId),
    index('bookings_game_time_slot_id_idx').on(t.gameTimeSlotId),
    index('bookings_club_id_idx').on(t.clubId),
    index('bookings_booking_date_idx').on(t.bookingDate),
    index('bookings_status_idx').on(t.status),
    index('bookings_group_id_idx').on(t.groupId),
  ],
);

export const teamSelections = pgTable(
  'team_selections',
  {
    id: serial('id').primaryKey(),
    chatRoomId: text('chat_room_id').notNull(),
    groupId: text('group_id').notNull(),
    bookerId: integer('booker_id').notNull(),
    bookerName: text('booker_name').notNull(),
    clubId: integer('club_id').notNull(),
    clubName: text('club_name').notNull(),
    date: text('date').notNull(),
    teamCount: integer('team_count').notNull().default(0),
    status: teamSelectionStatusEnum('status').notNull().default('SELECTING'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('team_selections_group_id_key').on(t.groupId),
    index('team_selections_chat_room_id_idx').on(t.chatRoomId),
    index('team_selections_booker_id_idx').on(t.bookerId),
  ],
);

export const teamSelectionMembers = pgTable(
  'team_selection_members',
  {
    id: serial('id').primaryKey(),
    teamSelectionId: integer('team_selection_id').notNull().references(() => teamSelections.id, { onDelete: 'cascade' }),
    teamNumber: integer('team_number').notNull(),
    userId: integer('user_id').notNull(),
    userName: text('user_name').notNull(),
    userEmail: text('user_email').notNull(),
    role: participantRoleEnum('role').notNull().default('MEMBER'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('team_selection_members_teamSelectionId_teamNumber_userId_key').on(t.teamSelectionId, t.teamNumber, t.userId),
    index('team_selection_members_teamSelectionId_teamNumber_idx').on(t.teamSelectionId, t.teamNumber),
  ],
);

export const bookingParticipants = pgTable(
  'booking_participants',
  {
    id: serial('id').primaryKey(),
    bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull(),
    userName: text('user_name').notNull(),
    userEmail: text('user_email').notNull(),
    role: participantRoleEnum('role').notNull().default('MEMBER'),
    status: participantStatusEnum('status').notNull().default('PENDING'),
    amount: integer('amount').notNull(),
    paidAt: ts('paid_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('booking_participants_booking_id_user_id_key').on(t.bookingId, t.userId),
    index('booking_participants_user_id_status_idx').on(t.userId, t.status),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    paymentMethod: text('payment_method').notNull(),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('PENDING'),
    transactionId: text('transaction_id'),
    paidAt: ts('paid_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [index('payments_payment_status_idx').on(t.paymentStatus)],
);

export const bookingHistory = pgTable(
  'booking_history',
  {
    id: serial('id').primaryKey(),
    bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    details: jsonb('details'),
    userId: integer('user_id').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('booking_history_booking_id_idx').on(t.bookingId)],
);

export const gameCache = pgTable(
  'game_cache',
  {
    id: serial('id').primaryKey(),
    gameId: integer('game_id').notNull(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    description: text('description'),
    frontNineCourseId: integer('front_nine_course_id').notNull(),
    frontNineCourseName: text('front_nine_course_name').notNull(),
    backNineCourseId: integer('back_nine_course_id').notNull(),
    backNineCourseName: text('back_nine_course_name').notNull(),
    totalHoles: integer('total_holes').notNull().default(18),
    estimatedDuration: integer('estimated_duration').notNull().default(180),
    breakDuration: integer('break_duration').notNull().default(10),
    maxPlayers: integer('max_players').notNull().default(4),
    basePrice: integer('base_price').notNull(),
    weekendPrice: integer('weekend_price'),
    holidayPrice: integer('holiday_price'),
    clubId: integer('club_id').notNull(),
    clubName: text('club_name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    lastSyncAt: ts('last_sync_at').notNull().defaultNow(),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('game_cache_game_id_key').on(t.gameId), index('game_cache_club_id_idx').on(t.clubId)],
);

export const gameTimeSlotCache = pgTable(
  'game_time_slot_cache',
  {
    id: serial('id').primaryKey(),
    gameTimeSlotId: integer('game_time_slot_id').notNull(),
    gameId: integer('game_id').notNull(),
    gameName: text('game_name'),
    gameCode: text('game_code'),
    frontNineCourseName: text('front_nine_course_name'),
    backNineCourseName: text('back_nine_course_name'),
    clubId: integer('club_id'),
    clubName: text('club_name'),
    date: date('date', { mode: 'date' }).notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    maxPlayers: integer('max_players').notNull().default(4),
    bookedPlayers: integer('booked_players').notNull().default(0),
    availablePlayers: integer('available_players').notNull().default(4),
    isAvailable: boolean('is_available').notNull().default(true),
    price: integer('price').notNull(),
    isPremium: boolean('is_premium').notNull().default(false),
    status: timeSlotCacheStatusEnum('status').notNull().default('AVAILABLE'),
    lastSyncAt: ts('last_sync_at').notNull().defaultNow(),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('game_time_slot_cache_game_time_slot_id_key').on(t.gameTimeSlotId),
    index('game_time_slot_cache_game_id_idx').on(t.gameId),
    index('game_time_slot_cache_date_idx').on(t.date),
    index('game_time_slot_cache_date_start_time_idx').on(t.date, t.startTime),
  ],
);

export const bookingOutboxEvents = pgTable(
  'booking_outbox_events',
  {
    id: serial('id').primaryKey(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    status: outboxStatusEnum('status').notNull().default('PENDING'),
    retryCount: integer('retry_count').notNull().default(0),
    lastError: text('last_error'),
    createdAt: ts('created_at').notNull().defaultNow(),
    processedAt: ts('processed_at'),
  },
  (t) => [
    index('booking_outbox_events_status_created_at_idx').on(t.status, t.createdAt),
    index('booking_outbox_events_aggregate_type_aggregate_id_idx').on(t.aggregateType, t.aggregateId),
  ],
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: serial('id').primaryKey(),
    key: text('key').notNull(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: text('aggregate_id'),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body'),
    createdAt: ts('created_at').notNull().defaultNow(),
    expiresAt: ts('expires_at').notNull(),
  },
  (t) => [uniqueIndex('idempotency_keys_key_key').on(t.key), index('idempotency_keys_expires_at_idx').on(t.expiresAt)],
);

export const refunds = pgTable(
  'refunds',
  {
    id: serial('id').primaryKey(),
    bookingId: integer('booking_id').notNull(),
    paymentId: integer('payment_id'),
    originalAmount: integer('original_amount').notNull(),
    refundAmount: integer('refund_amount').notNull(),
    refundRate: integer('refund_rate').notNull(),
    refundFee: integer('refund_fee').notNull().default(0),
    status: refundStatusEnum('status').notNull().default('REQUESTED'),
    cancellationType: cancellationTypeEnum('cancellation_type').notNull(),
    cancelReason: text('cancel_reason'),
    cancelledBy: integer('cancelled_by'),
    cancelledByType: text('cancelled_by_type'),
    pgTransactionId: text('pg_transaction_id'),
    pgRefundId: text('pg_refund_id'),
    processedAt: ts('processed_at'),
    processedBy: integer('processed_by'),
    rejectedReason: text('rejected_reason'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    index('refunds_booking_id_idx').on(t.bookingId),
    index('refunds_payment_id_idx').on(t.paymentId),
    index('refunds_status_idx').on(t.status),
  ],
);

// 관계
export const bookingsRelations = relations(bookings, ({ many }) => ({
  payments: many(payments),
  histories: many(bookingHistory),
  participants: many(bookingParticipants),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
}));
export const bookingHistoryRelations = relations(bookingHistory, ({ one }) => ({
  booking: one(bookings, { fields: [bookingHistory.bookingId], references: [bookings.id] }),
}));
export const bookingParticipantsRelations = relations(bookingParticipants, ({ one }) => ({
  booking: one(bookings, { fields: [bookingParticipants.bookingId], references: [bookings.id] }),
}));
export const teamSelectionsRelations = relations(teamSelections, ({ many }) => ({
  members: many(teamSelectionMembers),
}));
export const teamSelectionMembersRelations = relations(teamSelectionMembers, ({ one }) => ({
  teamSelection: one(teamSelections, { fields: [teamSelectionMembers.teamSelectionId], references: [teamSelections.id] }),
}));

export type Booking = typeof bookings.$inferSelect;
export type BookingParticipantRow = typeof bookingParticipants.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type GameTimeSlotCacheRow = typeof gameTimeSlotCache.$inferSelect;
export type BookingHistoryRow = typeof bookingHistory.$inferSelect;
export type GameCacheRow = typeof gameCache.$inferSelect;
export type TeamSelectionRow = typeof teamSelections.$inferSelect;
export type TeamSelectionMemberRow = typeof teamSelectionMembers.$inferSelect;
