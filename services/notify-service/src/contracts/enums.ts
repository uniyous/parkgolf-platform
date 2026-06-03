// ==============================================
// notify-service 도메인 enum 단일 소스 (UNI-85)
// const → pgEnum·DTO·NATS 파생. + JSON 타입(Prisma.InputJsonValue 대체).
// ==============================================

export const NotificationType = {
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  REFUND_COMPLETED: 'REFUND_COMPLETED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  FRIEND_REQUEST: 'FRIEND_REQUEST',
  FRIEND_ACCEPTED: 'FRIEND_ACCEPTED',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  SYSTEM_ALERT: 'SYSTEM_ALERT',
  SPLIT_PAYMENT_REQUEST: 'SPLIT_PAYMENT_REQUEST',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  READ: 'READ',
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

export const DeliveryChannelType = {
  PUSH: 'PUSH',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
} as const;
export type DeliveryChannelType = (typeof DeliveryChannelType)[keyof typeof DeliveryChannelType];

export const NOTIFICATION_TYPE_VALUES = Object.values(NotificationType) as [NotificationType, ...NotificationType[]];
export const NOTIFICATION_STATUS_VALUES = Object.values(NotificationStatus) as [NotificationStatus, ...NotificationStatus[]];
export const DELIVERY_CHANNEL_VALUES = Object.values(DeliveryChannelType) as [DeliveryChannelType, ...DeliveryChannelType[]];

/** jsonb 값 (Prisma.InputJsonValue 대체) */
export type JsonValue = string | number | boolean | null | { [k: string]: JsonValue } | JsonValue[];
