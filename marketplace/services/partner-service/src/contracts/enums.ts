// ==============================================
// partner-service 도메인 enum 단일 소스 (UNI-87)
// ==============================================

export const SyncMode = { API_POLLING: 'API_POLLING', WEBHOOK: 'WEBHOOK', HYBRID: 'HYBRID', MANUAL: 'MANUAL' } as const;
export type SyncMode = (typeof SyncMode)[keyof typeof SyncMode];

export const SyncResult = { SUCCESS: 'SUCCESS', PARTIAL: 'PARTIAL', FAILED: 'FAILED' } as const;
export type SyncResult = (typeof SyncResult)[keyof typeof SyncResult];

export const SlotSyncStatus = { SYNCED: 'SYNCED', PENDING: 'PENDING', CONFLICT: 'CONFLICT', UNMAPPED: 'UNMAPPED', FAILED: 'FAILED' } as const;
export type SlotSyncStatus = (typeof SlotSyncStatus)[keyof typeof SlotSyncStatus];

export const SyncDirection = { INBOUND: 'INBOUND', OUTBOUND: 'OUTBOUND' } as const;
export type SyncDirection = (typeof SyncDirection)[keyof typeof SyncDirection];

export const BookingSyncStatus = { SYNCED: 'SYNCED', PENDING: 'PENDING', CONFLICT: 'CONFLICT', FAILED: 'FAILED', CANCELLED: 'CANCELLED' } as const;
export type BookingSyncStatus = (typeof BookingSyncStatus)[keyof typeof BookingSyncStatus];

export const SyncAction = { SLOT_SYNC: 'SLOT_SYNC', BOOKING_IMPORT: 'BOOKING_IMPORT', BOOKING_EXPORT: 'BOOKING_EXPORT', BOOKING_CANCEL: 'BOOKING_CANCEL', CONNECTION_TEST: 'CONNECTION_TEST' } as const;
export type SyncAction = (typeof SyncAction)[keyof typeof SyncAction];

const vals = <T extends Record<string, string>>(o: T) => Object.values(o) as [T[keyof T], ...T[keyof T][]];
export const SYNC_MODE_VALUES = vals(SyncMode);
export const SYNC_RESULT_VALUES = vals(SyncResult);
export const SLOT_SYNC_STATUS_VALUES = vals(SlotSyncStatus);
export const SYNC_DIRECTION_VALUES = vals(SyncDirection);
export const BOOKING_SYNC_STATUS_VALUES = vals(BookingSyncStatus);
export const SYNC_ACTION_VALUES = vals(SyncAction);

export type JsonValue = string | number | boolean | null | { [k: string]: JsonValue } | JsonValue[];
