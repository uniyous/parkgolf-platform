// ==============================================
// payment-service / payment_db — Drizzle schema (UNI-113 수납)
// 현장결제(현금·카드단말) 수납 기록 + 일마감. 컬럼명 snake_case(@map).
// ==============================================
import { pgTable, pgEnum, serial, integer, text, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

/** 요금 산정 할인 항목 */
export interface PricingDiscount {
  type: string; // POLICY | COUPON | MEMBER …
  label?: string;
  amount: number; // 할인액(원, 양수)
}

/**
 * 요금 산정 근거 스냅샷 (UNI-129) — 결제 시점의 계산 입력·결과 동결.
 * 정산(④) 대사 근거. 산정 로직은 frontdesk/정책(club-service)에 위치, payment는 영속만.
 */
export interface PricingSnapshot {
  gameTimeSlotId?: number; // 타임슬롯
  playerCount: number; // 인원
  unitPrice: number; // 인당 단가
  baseAmount: number; // unitPrice × playerCount
  discounts?: PricingDiscount[];
  policyId?: number; // 적용 요금정책 (club-service resolve)
  total: number; // 최종 청구액 = baseAmount − Σ discounts (= payments.amount)
  calculatedAt?: string; // ISO
}

export const paymentMethodEnum = pgEnum('PaymentMethod', ['CASH', 'CARD']);
export const paymentChannelEnum = pgEnum('PaymentChannel', ['DESK', 'PHONE', 'WALK_IN', 'KIOSK']);
export const paymentStatusEnum = pgEnum('PaymentStatus', ['COLLECTED', 'REFUNDED']);

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    bookingId: integer('booking_id').notNull(),
    clubId: integer('club_id'),
    companyId: integer('company_id'), // 테넌시 격리 (ERP 단독 — UNI-94)
    amount: integer('amount').notNull(),
    pricingSnapshot: jsonb('pricing_snapshot').$type<PricingSnapshot>(), // 산정 근거 (정산 대사)
    method: paymentMethodEnum('method').notNull(),
    channel: paymentChannelEnum('channel').notNull().default('DESK'),
    status: paymentStatusEnum('status').notNull().default('COLLECTED'),
    receiptId: text('receipt_id').notNull(),
    staffId: integer('staff_id'),
    kioskId: text('kiosk_id'),
    collectedAt: timestamp('collected_at', { precision: 3 }).notNull().defaultNow(),
    refundedAt: timestamp('refunded_at', { precision: 3 }),
  },
  (t) => [
    uniqueIndex('payments_booking_id_key').on(t.bookingId), // bookingId 멱등
    index('payments_club_collected_idx').on(t.clubId, t.collectedAt),
    index('payments_company_idx').on(t.companyId),
  ],
);

export const paymentCloses = pgTable(
  'payment_closes',
  {
    id: serial('id').primaryKey(),
    closeDate: text('close_date').notNull(), // YYYY-MM-DD
    clubId: integer('club_id'),
    companyId: integer('company_id'),
    totalAmount: integer('total_amount').notNull(),
    count: integer('count').notNull(),
    closedBy: integer('closed_by'),
    closedAt: timestamp('closed_at', { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('payment_closes_date_club_key').on(t.closeDate, t.clubId)],
);
