// ── Partner Config ──

export type SyncMode = 'API_POLLING' | 'WEBHOOK' | 'HYBRID' | 'MANUAL';

export interface PartnerConfig {
  id: number;
  clubId: number;
  companyId: number;
  systemName: string;
  externalClubId: string;
  specUrl: string;
  apiKey: string;        // masked (********)
  apiSecret?: string;    // masked (********)
  webhookSecret?: string;
  responseMapping?: Record<string, unknown>;
  syncMode: SyncMode;
  syncIntervalMin: number;
  syncRangeDays: number;
  slotSyncEnabled: boolean;
  bookingSyncEnabled: boolean;
  isActive: boolean;
  lastSlotSyncAt?: string | null;
  lastSlotSyncStatus?: SyncResult | null;
  lastSlotSyncError?: string | null;
  lastBookingSyncAt?: string | null;
  circuitBreakerStatus?: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  gameMappings?: GameMapping[];
  createdAt: string;
  updatedAt: string;
}

// ── Game Mapping ──

export interface GameMapping {
  id: number;
  partnerId: number;
  internalGameId: number;
  externalCourseId?: string;
  externalCourseName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Sync Log ──

export type SyncResult = 'SUCCESS' | 'PARTIAL' | 'FAILED';
export type SyncAction = 'SLOT_SYNC' | 'BOOKING_IMPORT' | 'BOOKING_EXPORT' | 'BOOKING_CANCEL' | 'CONNECTION_TEST';
export type SyncDirection = 'INBOUND' | 'OUTBOUND';

export interface SyncLog {
  id: number;
  partnerId: number;
  action: SyncAction;
  direction: SyncDirection;
  status: SyncResult;
  recordCount: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  errorMessage?: string | null;
  durationMs?: number | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
}

// ── Booking Mapping ──

export type BookingSyncStatus = 'SYNCED' | 'PENDING' | 'CONFLICT' | 'FAILED' | 'CANCELLED';

export interface BookingMapping {
  id: number;
  partnerId: number;
  gameMappingId?: number | null;
  internalBookingId: number;
  externalBookingId: string;
  syncDirection: SyncDirection;
  syncStatus: BookingSyncStatus;
  lastSyncAt?: string | null;
  date: string;
  startTime: string;
  playerCount: number;
  playerName?: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  conflictData?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
