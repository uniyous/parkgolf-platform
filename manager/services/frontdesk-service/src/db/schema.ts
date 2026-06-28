// ==============================================
// frontdesk-service / frontdesk_db — Drizzle schema (UNI-114 부킹)
// 데스크·전화·워크인·키오스크 예약 + 플레이어별 원장 단위(booking_player).
// 요금 계산(charge_line)·할인(discount_rule)·체크아웃(checkout)은 UNI-132/133/134.
// ==============================================
import { pgTable, pgEnum, serial, integer, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const bookingChannelEnum = pgEnum('BookingChannel', ['DESK', 'PHONE', 'WALK_IN', 'KIOSK']);
export const bookingStatusEnum = pgEnum('BookingStatus', ['PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED']);
export const playerPaymentStatusEnum = pgEnum('PlayerPaymentStatus', ['UNPAID', 'PAID', 'REFUNDED']);
export const chargeLineTypeEnum = pgEnum('ChargeLineType', ['BASE', 'DISCOUNT', 'SURCHARGE']);

export const bookings = pgTable(
  'bookings',
  {
    id: serial('id').primaryKey(),
    bookingNumber: text('booking_number').notNull(),
    clubId: integer('club_id').notNull(),
    companyId: integer('company_id'), // 테넌시
    gameTimeSlotId: integer('game_time_slot_id').notNull(), // club-service 슬롯(N:1)
    channel: bookingChannelEnum('channel').notNull(),
    playerCount: integer('player_count').notNull(),
    staffId: integer('staff_id'), // 데스크·전화 행위자
    kioskId: text('kiosk_id'),
    status: bookingStatusEnum('status').notNull().default('PENDING'),
    totalPrice: integer('total_price').notNull().default(0), // 합계 — 항목 계산은 UNI-132
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('bookings_booking_number_key').on(t.bookingNumber),
    index('bookings_club_idx').on(t.clubId),
    index('bookings_slot_idx').on(t.gameTimeSlotId),
    index('bookings_status_idx').on(t.status),
  ],
);

// 플레이어별 청구·체크인 단위 (원장 헤더). charge_line·할인은 UNI-132, 수납 귀속은 UNI-133.
export const bookingPlayers = pgTable(
  'booking_players',
  {
    id: serial('id').primaryKey(),
    bookingId: integer('booking_id').notNull(),
    playerNo: integer('player_no').notNull(), // 1..playerCount
    memberRef: text('member_ref'), // 회원 식별(할인자격) — 추후
    chargeAmount: integer('charge_amount').notNull().default(0), // 본인 청구액(계산 결과 동결) — UNI-132
    checkedInAt: timestamp('checked_in_at', { precision: 3 }), // 입장 — 수납과 독립
    paymentStatus: playerPaymentStatusEnum('payment_status').notNull().default('UNPAID'),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('booking_players_booking_player_key').on(t.bookingId, t.playerNo),
    index('booking_players_booking_idx').on(t.bookingId),
  ],
);

// 예약 원장 항목별 계산 내역 (UNI-132) — club pricing.quote 결과를 부킹 시 동결. BASE/DISCOUNT.
export const bookingChargeLines = pgTable(
  'booking_charge_lines',
  {
    id: serial('id').primaryKey(),
    bookingId: integer('booking_id').notNull(),
    type: chargeLineTypeEnum('type').notNull(),
    label: text('label').notNull(),
    qty: integer('qty').notNull().default(1),
    unitAmount: integer('unit_amount').notNull(), // 부호 포함(할인은 음수)
    amount: integer('amount').notNull(), // qty 반영 합(부호 포함)
    source: text('source'), // POLICY · PROMOTION · EVENT · MEMBER · MANUAL
    sourceRef: integer('source_ref'), // discount_rules.id 등
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [index('booking_charge_lines_booking_idx').on(t.bookingId)],
);
