// ==============================================
// payment-service / payment_db — Drizzle schema (UNI-113 수납)
// 현장결제(현금·카드단말) 수납 기록 + 일마감. 컬럼명 snake_case(@map).
// ==============================================
import { pgTable, pgEnum, serial, integer, text, jsonb, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

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
// PENDING/FAILED = PG 결제 선점(reserve-then-charge) 상태 — 현장 수납(collect)은 COLLECTED 직행
export const paymentStatusEnum = pgEnum('PaymentStatus', ['COLLECTED', 'REFUNDED', 'PENDING', 'FAILED']);
// PG enum — payments.provider·pg_configs 공용 (payments보다 먼저 선언)
export const pgScopeEnum = pgEnum('PgScope', ['PLATFORM', 'COMPANY', 'CLUB']);
export const pgProviderEnum = pgEnum('PgProvider', ['TOSS']);

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
    provider: pgProviderEnum('provider'), // null = 현장(현금·카드단말 VAN), TOSS = 온라인 PG (UNI-130 [3c-ii])
    paymentKey: text('payment_key'), // PG 전용 — provider 결제 식별자
    pgConfigId: integer('pg_config_id'), // 결제 시 사용한 pg_configs.id — 취소 시 동일 계정 고정
    pgRaw: jsonb('pg_raw'), // PG 원본 응답(카드·간편결제 상세)
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
    uniqueIndex('payments_payment_key_key').on(t.paymentKey), // PG 결제 식별자 멱등 (null 허용)
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

// ==============================================
// PG 설정 (UNI-130 [3c]) — 골프장별 PG 선택. 정책 resolve와 동형(Club→Company→Platform).
// secretRef = Secret Manager 시크릿 이름(실제 키 아님). 실제 키는 PgSecretProvider가 resolve.
// (pgScopeEnum·pgProviderEnum은 상단에 선언 — payments.provider 공용)
// ==============================================
export const pgConfigs = pgTable(
  'pg_configs',
  {
    id: serial('id').primaryKey(),
    scopeLevel: pgScopeEnum('scope_level').notNull(),
    companyId: integer('company_id'), // COMPANY·CLUB 스코프
    clubId: integer('club_id'), // CLUB 스코프
    provider: pgProviderEnum('provider').notNull(),
    secretRef: text('secret_ref').notNull(), // Secret Manager 시크릿 이름
    baseUrl: text('base_url'), // 선택 (테스트 엔드포인트 등)
    feeRate: integer('fee_rate').notNull().default(0), // PG 계약 수수료율(basis points, 330=3.3%) — 정산 fee 산정 (UNI-131)
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('pg_configs_scope_key').on(t.scopeLevel, t.companyId, t.clubId)],
);

// ==============================================
// PG 정산 (UNI-131 [4]) — 클럽 × provider × 주기(일/주/월) 단위 집계·대사.
// gross(COLLECTED) − refund(REFUNDED) = net, fee = net × feeRate, payout = net − fee.
// ==============================================
export const settlementCycleEnum = pgEnum('SettlementCycle', ['DAILY', 'WEEKLY', 'MONTHLY']);
export const settlementStatusEnum = pgEnum('SettlementStatus', ['PENDING', 'RECONCILED', 'PAID']);

export const settlements = pgTable(
  'settlements',
  {
    id: serial('id').primaryKey(),
    clubId: integer('club_id').notNull(), // 정산은 클럽 단위
    companyId: integer('company_id'), // 정보용(테넌시)
    provider: pgProviderEnum('provider').notNull(),
    cycle: settlementCycleEnum('cycle').notNull(),
    periodKey: text('period_key').notNull(), // DAILY=YYYY-MM-DD · WEEKLY=YYYY-Www · MONTHLY=YYYY-MM
    periodStart: timestamp('period_start', { precision: 3 }).notNull(),
    periodEnd: timestamp('period_end', { precision: 3 }).notNull(),
    grossAmount: integer('gross_amount').notNull(), // COLLECTED 합
    refundAmount: integer('refund_amount').notNull(), // REFUNDED 합(기간 내 refundedAt)
    netAmount: integer('net_amount').notNull(), // gross − refund
    feeRate: integer('fee_rate').notNull(), // 적용 수수료율(bps) 스냅샷
    feeAmount: integer('fee_amount').notNull(), // net × feeRate
    payoutAmount: integer('payout_amount').notNull(), // net − fee
    count: integer('count').notNull(), // COLLECTED 건수
    status: settlementStatusEnum('status').notNull().default('PENDING'),
    reconciledAt: timestamp('reconciled_at', { precision: 3 }),
    paidAt: timestamp('paid_at', { precision: 3 }),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('settlements_club_provider_period_key').on(t.clubId, t.provider, t.cycle, t.periodKey),
    index('settlements_status_idx').on(t.status),
  ],
);
