// ==============================================
// payment-service / payment_db — Drizzle schema (UNI-86)
// 금액 전부 Int(원). 컬럼명 Prisma(@map snake_case) 유지. @updatedAt → $defaultFn.
// ==============================================
import { pgTable, pgEnum, serial, integer, text, boolean, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  PAYMENT_METHOD_VALUES, PAYMENT_STATUS_VALUES, SPLIT_STATUS_VALUES,
  REFUND_REQUESTOR_VALUES, REFUND_STATUS_VALUES, WEBHOOK_STATUS_VALUES, OUTBOX_STATUS_VALUES,
} from '../contracts/enums';

export const paymentMethodEnum = pgEnum('PaymentMethod', PAYMENT_METHOD_VALUES);
export const paymentStatusEnum = pgEnum('PaymentStatus', PAYMENT_STATUS_VALUES);
export const splitStatusEnum = pgEnum('SplitStatus', SPLIT_STATUS_VALUES);
export const refundRequestorEnum = pgEnum('RefundRequestorType', REFUND_REQUESTOR_VALUES);
export const refundStatusEnum = pgEnum('RefundStatus', REFUND_STATUS_VALUES);
export const webhookStatusEnum = pgEnum('WebhookStatus', WEBHOOK_STATUS_VALUES);
export const outboxStatusEnum = pgEnum('OutboxStatus', OUTBOX_STATUS_VALUES);

const ts = (name: string) => timestamp(name, { precision: 3 });

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    paymentKey: text('payment_key'),
    orderId: text('order_id').notNull(),
    orderName: text('order_name').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('KRW'),
    method: paymentMethodEnum('method'),
    easyPayProvider: text('easy_pay_provider'),
    cardCompany: text('card_company'),
    cardCompanyName: text('card_company_name'),
    cardNumber: text('card_number'),
    cardType: text('card_type'),
    ownerType: text('owner_type'),
    installmentMonths: integer('installment_months'),
    isInterestFree: boolean('is_interest_free'),
    virtualAccountNumber: text('virtual_account_number'),
    virtualBankCode: text('virtual_bank_code'),
    virtualBankName: text('virtual_bank_name'),
    virtualDueDate: ts('virtual_due_date'),
    virtualAccountHolder: text('virtual_account_holder'),
    transferBankCode: text('transfer_bank_code'),
    transferBankName: text('transfer_bank_name'),
    status: paymentStatusEnum('status').notNull().default('READY'),
    userId: integer('user_id').notNull(),
    bookingId: integer('booking_id'),
    approvedAt: ts('approved_at'),
    requestedAt: ts('requested_at'),
    cancelledAt: ts('cancelled_at'),
    cancelReason: text('cancel_reason'),
    cancelAmount: integer('cancel_amount'),
    receiptUrl: text('receipt_url'),
    checkoutUrl: text('checkout_url'),
    metadata: jsonb('metadata'),
    customerName: text('customer_name'),
    customerEmail: text('customer_email'),
    customerPhone: text('customer_phone'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('payments_payment_key_key').on(t.paymentKey),
    uniqueIndex('payments_order_id_key').on(t.orderId),
    uniqueIndex('payments_booking_id_key').on(t.bookingId),
    index('payments_user_id_idx').on(t.userId),
    index('payments_status_idx').on(t.status),
    index('payments_created_at_idx').on(t.createdAt),
  ],
);

export const paymentSplits = pgTable(
  'payment_splits',
  {
    id: serial('id').primaryKey(),
    paymentId: integer('payment_id'),
    bookingGroupId: integer('booking_group_id'),
    bookingId: integer('booking_id').notNull(),
    userId: integer('user_id').notNull(),
    userName: text('user_name').notNull(),
    userEmail: text('user_email').notNull(),
    amount: integer('amount').notNull(),
    status: splitStatusEnum('status').notNull().default('PENDING'),
    orderId: text('order_id').notNull(),
    paymentKey: text('payment_key'),
    paidAt: ts('paid_at'),
    expiredAt: ts('expired_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('payment_splits_order_id_key').on(t.orderId),
    index('payment_splits_booking_group_id_status_idx').on(t.bookingGroupId, t.status),
    index('payment_splits_booking_id_idx').on(t.bookingId),
    index('payment_splits_user_id_status_idx').on(t.userId, t.status),
  ],
);

export const refunds = pgTable(
  'refunds',
  {
    id: serial('id').primaryKey(),
    paymentId: integer('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
    transactionKey: text('transaction_key'),
    cancelReason: text('cancel_reason').notNull(),
    cancelAmount: integer('cancel_amount').notNull(),
    taxFreeAmount: integer('tax_free_amount'),
    refundStatus: refundStatusEnum('refund_status').notNull().default('PENDING'),
    refundBankCode: text('refund_bank_code'),
    refundBankName: text('refund_bank_name'),
    refundAccount: text('refund_account'),
    refundHolder: text('refund_holder'),
    refundedAt: ts('refunded_at'),
    requestedBy: integer('requested_by'),
    requestedByType: refundRequestorEnum('requested_by_type'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('refunds_transaction_key_key').on(t.transactionKey),
    index('refunds_payment_id_idx').on(t.paymentId),
    index('refunds_refund_status_idx').on(t.refundStatus),
  ],
);

export const billingKeys = pgTable(
  'billing_keys',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    billingKey: text('billing_key').notNull(),
    customerKey: text('customer_key').notNull(),
    authenticatedAt: ts('authenticated_at').notNull(),
    cardCompany: text('card_company').notNull(),
    cardCompanyName: text('card_company_name'),
    cardNumber: text('card_number').notNull(),
    cardType: text('card_type'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('billing_keys_billing_key_key').on(t.billingKey),
    index('billing_keys_user_id_is_active_created_at_idx').on(t.userId, t.isActive, t.createdAt),
    index('billing_keys_customer_key_is_active_idx').on(t.customerKey, t.isActive),
  ],
);

export const webhookLogs = pgTable(
  'webhook_logs',
  {
    id: serial('id').primaryKey(),
    paymentId: integer('payment_id').references(() => payments.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    status: webhookStatusEnum('status').notNull().default('RECEIVED'),
    processedAt: ts('processed_at'),
    errorMessage: text('error_message'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('webhook_logs_payment_id_idx').on(t.paymentId),
    index('webhook_logs_event_type_idx').on(t.eventType),
    index('webhook_logs_status_idx').on(t.status),
  ],
);

export const paymentOutboxEvents = pgTable(
  'payment_outbox_events',
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
    index('payment_outbox_events_status_retry_count_created_at_idx').on(t.status, t.retryCount, t.createdAt),
    index('payment_outbox_events_aggregate_type_aggregate_id_idx').on(t.aggregateType, t.aggregateId),
  ],
);

// 관계
export const paymentsRelations = relations(payments, ({ many }) => ({
  refunds: many(refunds),
  webhookLogs: many(webhookLogs),
  splits: many(paymentSplits),
}));
export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(payments, { fields: [refunds.paymentId], references: [payments.id] }),
}));
export const webhookLogsRelations = relations(webhookLogs, ({ one }) => ({
  payment: one(payments, { fields: [webhookLogs.paymentId], references: [payments.id] }),
}));
export const paymentSplitsRelations = relations(paymentSplits, ({ one }) => ({
  payment: one(payments, { fields: [paymentSplits.paymentId], references: [payments.id] }),
}));

export type Payment = typeof payments.$inferSelect;
export type PaymentSplitRow = typeof paymentSplits.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type BillingKey = typeof billingKeys.$inferSelect;
