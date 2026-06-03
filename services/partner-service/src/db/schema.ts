// ==============================================
// partner-service / partner_db — Drizzle schema (UNI-87)
// 컬럼명 camelCase(@map 없음). @updatedAt → $defaultFn. date=date, externalPrice=numeric.
// ==============================================
import { pgTable, pgEnum, serial, integer, text, boolean, jsonb, timestamp, date, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  SYNC_MODE_VALUES, SYNC_RESULT_VALUES, SLOT_SYNC_STATUS_VALUES, SYNC_DIRECTION_VALUES, BOOKING_SYNC_STATUS_VALUES, SYNC_ACTION_VALUES,
} from '../contracts/enums';

export const syncModeEnum = pgEnum('SyncMode', SYNC_MODE_VALUES);
export const syncResultEnum = pgEnum('SyncResult', SYNC_RESULT_VALUES);
export const slotSyncStatusEnum = pgEnum('SlotSyncStatus', SLOT_SYNC_STATUS_VALUES);
export const syncDirectionEnum = pgEnum('SyncDirection', SYNC_DIRECTION_VALUES);
export const bookingSyncStatusEnum = pgEnum('BookingSyncStatus', BOOKING_SYNC_STATUS_VALUES);
export const syncActionEnum = pgEnum('SyncAction', SYNC_ACTION_VALUES);

const ts = (name: string) => timestamp(name, { precision: 3 });

export const partnerConfigs = pgTable(
  'partner_configs',
  {
    id: serial('id').primaryKey(),
    clubId: integer('clubId').notNull(),
    companyId: integer('companyId').notNull(),
    systemName: text('systemName').notNull(),
    externalClubId: text('externalClubId').notNull(),
    specUrl: text('specUrl').notNull(),
    apiKey: text('apiKey').notNull(),
    apiSecret: text('apiSecret'),
    webhookSecret: text('webhookSecret'),
    responseMapping: jsonb('responseMapping').notNull(),
    syncMode: syncModeEnum('syncMode').notNull().default('API_POLLING'),
    syncIntervalMin: integer('syncIntervalMin').notNull().default(10),
    syncRangeDays: integer('syncRangeDays').notNull().default(7),
    slotSyncEnabled: boolean('slotSyncEnabled').notNull().default(true),
    bookingSyncEnabled: boolean('bookingSyncEnabled').notNull().default(true),
    isActive: boolean('isActive').notNull().default(true),
    lastSlotSyncAt: ts('lastSlotSyncAt'),
    lastSlotSyncStatus: syncResultEnum('lastSlotSyncStatus'),
    lastSlotSyncError: text('lastSlotSyncError'),
    lastBookingSyncAt: ts('lastBookingSyncAt'),
    createdAt: ts('createdAt').notNull().defaultNow(),
    updatedAt: ts('updatedAt').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('partner_configs_clubId_key').on(t.clubId),
    uniqueIndex('partner_configs_externalClubId_key').on(t.externalClubId),
    index('partner_configs_isActive_idx').on(t.isActive),
    index('partner_configs_companyId_idx').on(t.companyId),
  ],
);

export const gameMappings = pgTable(
  'game_mappings',
  {
    id: serial('id').primaryKey(),
    partnerId: integer('partnerId').notNull().references(() => partnerConfigs.id, { onDelete: 'cascade' }),
    externalCourseName: text('externalCourseName').notNull(),
    externalCourseId: text('externalCourseId'),
    internalGameId: integer('internalGameId').notNull(),
    isActive: boolean('isActive').notNull().default(true),
    createdAt: ts('createdAt').notNull().defaultNow(),
    updatedAt: ts('updatedAt').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('game_mappings_partnerId_externalCourseName_key').on(t.partnerId, t.externalCourseName),
    uniqueIndex('game_mappings_partnerId_internalGameId_key').on(t.partnerId, t.internalGameId),
    index('game_mappings_internalGameId_idx').on(t.internalGameId),
  ],
);

export const slotMappings = pgTable(
  'slot_mappings',
  {
    id: serial('id').primaryKey(),
    gameMappingId: integer('gameMappingId').notNull().references(() => gameMappings.id, { onDelete: 'cascade' }),
    externalSlotId: text('externalSlotId').notNull(),
    date: date('date', { mode: 'date' }).notNull(),
    startTime: text('startTime').notNull(),
    endTime: text('endTime').notNull(),
    internalSlotId: integer('internalSlotId'),
    externalMaxPlayers: integer('externalMaxPlayers').notNull(),
    externalBooked: integer('externalBooked').notNull().default(0),
    externalStatus: text('externalStatus').notNull(),
    externalPrice: numeric('externalPrice', { precision: 10, scale: 0 }),
    lastSyncAt: ts('lastSyncAt'),
    syncStatus: slotSyncStatusEnum('syncStatus').notNull().default('SYNCED'),
    syncError: text('syncError'),
    createdAt: ts('createdAt').notNull().defaultNow(),
    updatedAt: ts('updatedAt').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('slot_mappings_gameMappingId_externalSlotId_key').on(t.gameMappingId, t.externalSlotId),
    uniqueIndex('slot_mappings_gameMappingId_date_startTime_key').on(t.gameMappingId, t.date, t.startTime),
    index('slot_mappings_internalSlotId_idx').on(t.internalSlotId),
    index('slot_mappings_date_idx').on(t.date),
    index('slot_mappings_syncStatus_idx').on(t.syncStatus),
  ],
);

export const bookingMappings = pgTable(
  'booking_mappings',
  {
    id: serial('id').primaryKey(),
    partnerId: integer('partnerId').notNull(),
    gameMappingId: integer('gameMappingId'),
    internalBookingId: integer('internalBookingId'),
    externalBookingId: text('externalBookingId').notNull(),
    syncDirection: syncDirectionEnum('syncDirection').notNull(),
    syncStatus: bookingSyncStatusEnum('syncStatus').notNull().default('SYNCED'),
    lastSyncAt: ts('lastSyncAt'),
    date: date('date', { mode: 'date' }).notNull(),
    startTime: text('startTime').notNull(),
    playerCount: integer('playerCount').notNull(),
    playerName: text('playerName'),
    status: text('status').notNull(),
    conflictData: jsonb('conflictData'),
    createdAt: ts('createdAt').notNull().defaultNow(),
    updatedAt: ts('updatedAt').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('booking_mappings_internalBookingId_key').on(t.internalBookingId),
    uniqueIndex('booking_mappings_partnerId_externalBookingId_key').on(t.partnerId, t.externalBookingId),
    index('booking_mappings_internalBookingId_idx').on(t.internalBookingId),
    index('booking_mappings_syncStatus_idx').on(t.syncStatus),
    index('booking_mappings_date_idx').on(t.date),
  ],
);

export const syncLogs = pgTable(
  'sync_logs',
  {
    id: serial('id').primaryKey(),
    partnerId: integer('partnerId').notNull().references(() => partnerConfigs.id, { onDelete: 'cascade' }),
    action: syncActionEnum('action').notNull(),
    direction: syncDirectionEnum('direction').notNull(),
    status: syncResultEnum('status').notNull(),
    recordCount: integer('recordCount').notNull().default(0),
    createdCount: integer('createdCount').notNull().default(0),
    updatedCount: integer('updatedCount').notNull().default(0),
    errorCount: integer('errorCount').notNull().default(0),
    errorMessage: text('errorMessage'),
    durationMs: integer('durationMs'),
    payload: jsonb('payload'),
    createdAt: ts('createdAt').notNull().defaultNow(),
  },
  (t) => [
    index('sync_logs_partnerId_createdAt_idx').on(t.partnerId, t.createdAt),
    index('sync_logs_action_status_idx').on(t.action, t.status),
    index('sync_logs_createdAt_idx').on(t.createdAt),
  ],
);

// 관계
export const partnerConfigsRelations = relations(partnerConfigs, ({ many }) => ({
  gameMappings: many(gameMappings),
  syncLogs: many(syncLogs),
}));
export const gameMappingsRelations = relations(gameMappings, ({ one, many }) => ({
  partner: one(partnerConfigs, { fields: [gameMappings.partnerId], references: [partnerConfigs.id] }),
  slotMappings: many(slotMappings),
}));
export const slotMappingsRelations = relations(slotMappings, ({ one }) => ({
  gameMapping: one(gameMappings, { fields: [slotMappings.gameMappingId], references: [gameMappings.id] }),
}));
export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  partner: one(partnerConfigs, { fields: [syncLogs.partnerId], references: [partnerConfigs.id] }),
}));

export type PartnerConfig = typeof partnerConfigs.$inferSelect;
export type GameMapping = typeof gameMappings.$inferSelect;
export type SlotMapping = typeof slotMappings.$inferSelect;
export type BookingMapping = typeof bookingMappings.$inferSelect;
export type SyncLog = typeof syncLogs.$inferSelect;
