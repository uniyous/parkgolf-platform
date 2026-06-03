// ==============================================
// payment-service 도메인 enum 단일 소스 (UNI-86)
// const → pgEnum·DTO·NATS 파생. + JSON 타입.
// ==============================================

export const PaymentMethod = {
  CARD: 'CARD',
  TRANSFER: 'TRANSFER',
  VIRTUAL_ACCOUNT: 'VIRTUAL_ACCOUNT',
  EASY_PAY: 'EASY_PAY',
  MOBILE: 'MOBILE',
  GIFT_CERTIFICATE: 'GIFT_CERTIFICATE',
  CULTURE_GIFT: 'CULTURE_GIFT',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_FOR_DEPOSIT: 'WAITING_FOR_DEPOSIT',
  DONE: 'DONE',
  CANCELED: 'CANCELED',
  PARTIAL_CANCELED: 'PARTIAL_CANCELED',
  ABORTED: 'ABORTED',
  EXPIRED: 'EXPIRED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const SplitStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;
export type SplitStatus = (typeof SplitStatus)[keyof typeof SplitStatus];

export const RefundRequestorType = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  SYSTEM: 'SYSTEM',
} as const;
export type RefundRequestorType = (typeof RefundRequestorType)[keyof typeof RefundRequestorType];

export const RefundStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export const WebhookStatus = {
  RECEIVED: 'RECEIVED',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
} as const;
export type WebhookStatus = (typeof WebhookStatus)[keyof typeof WebhookStatus];

export const OutboxStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;
export type OutboxStatus = (typeof OutboxStatus)[keyof typeof OutboxStatus];

const vals = <T extends Record<string, string>>(o: T) => Object.values(o) as [T[keyof T], ...T[keyof T][]];
export const PAYMENT_METHOD_VALUES = vals(PaymentMethod);
export const PAYMENT_STATUS_VALUES = vals(PaymentStatus);
export const SPLIT_STATUS_VALUES = vals(SplitStatus);
export const REFUND_REQUESTOR_VALUES = vals(RefundRequestorType);
export const REFUND_STATUS_VALUES = vals(RefundStatus);
export const WEBHOOK_STATUS_VALUES = vals(WebhookStatus);
export const OUTBOX_STATUS_VALUES = vals(OutboxStatus);

/** jsonb 값 */
export type JsonValue = string | number | boolean | null | { [k: string]: JsonValue } | JsonValue[];
