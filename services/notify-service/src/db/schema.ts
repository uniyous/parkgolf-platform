// ==============================================
// notify-service / notify_db — Drizzle schema (UNI-85)
// 컬럼명 기존 DB 유지(@map snake_case / 무map은 그대로). @updatedAt → $defaultFn.
// ==============================================
import { pgTable, pgEnum, serial, integer, text, boolean, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import {
  NOTIFICATION_TYPE_VALUES,
  NOTIFICATION_STATUS_VALUES,
  DELIVERY_CHANNEL_VALUES,
} from '../contracts/enums';

export const notificationTypeEnum = pgEnum('NotificationType', NOTIFICATION_TYPE_VALUES);
export const notificationStatusEnum = pgEnum('NotificationStatus', NOTIFICATION_STATUS_VALUES);
export const deliveryChannelEnum = pgEnum('DeliveryChannelType', DELIVERY_CHANNEL_VALUES);

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    data: jsonb('data'),
    status: notificationStatusEnum('status').notNull().default('PENDING'),
    deliveryChannel: deliveryChannelEnum('delivery_channel'),
    retryCount: integer('retry_count').notNull().default(0),
    maxRetries: integer('max_retries').notNull().default(3),
    scheduledAt: timestamp('scheduled_at', { precision: 3 }),
    sentAt: timestamp('sent_at', { precision: 3 }),
    readAt: timestamp('read_at', { precision: 3 }),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 }).notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    index('notifications_user_id_status_idx').on(t.userId, t.status),
    index('notifications_user_id_read_at_idx').on(t.userId, t.readAt),
    index('notifications_user_id_created_at_idx').on(t.userId, t.createdAt),
    index('notifications_status_scheduled_at_idx').on(t.status, t.scheduledAt),
    index('notifications_status_retry_count_idx').on(t.status, t.retryCount),
  ],
);

export const notificationTemplates = pgTable(
  'notification_templates',
  {
    id: serial('id').primaryKey(),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    variables: jsonb('variables'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 }).notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [index('notification_templates_type_is_active_idx').on(t.type, t.isActive)],
);

export const notificationSettings = pgTable(
  'notification_settings',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    email: boolean('email').notNull().default(true),
    sms: boolean('sms').notNull().default(false),
    push: boolean('push').notNull().default(true),
    marketing: boolean('marketing').notNull().default(false),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 }).notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('notification_settings_user_id_key').on(t.userId)],
);

export const deadLetterNotifications = pgTable(
  'dead_letter_notifications',
  {
    id: serial('id').primaryKey(),
    originalId: integer('original_id').notNull(),
    userId: text('user_id').notNull(),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    data: jsonb('data'),
    deliveryChannel: deliveryChannelEnum('delivery_channel'),
    failureReason: text('failure_reason').notNull(),
    retryCount: integer('retry_count').notNull(),
    movedAt: timestamp('moved_at', { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    index('dead_letter_notifications_user_id_idx').on(t.userId),
    index('dead_letter_notifications_moved_at_idx').on(t.movedAt),
    index('dead_letter_notifications_failure_reason_idx').on(t.failureReason),
  ],
);

// 모델 행 타입
export type Notification = typeof notifications.$inferSelect;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type DeadLetterNotificationRow = typeof deadLetterNotifications.$inferSelect;
