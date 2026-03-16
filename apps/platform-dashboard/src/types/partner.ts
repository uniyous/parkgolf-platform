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

export interface CreatePartnerConfigDto {
  clubId: number;
  companyId: number;
  systemName: string;
  externalClubId: string;
  specUrl: string;
  apiKey: string;
  apiSecret?: string;
  webhookSecret?: string;
  responseMapping: Record<string, unknown>;
  syncMode?: SyncMode;
  syncIntervalMin?: number;
  syncRangeDays?: number;
  slotSyncEnabled?: boolean;
  bookingSyncEnabled?: boolean;
}

export interface UpdatePartnerConfigDto {
  id?: number;
  systemName?: string;
  specUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  responseMapping?: Record<string, unknown>;
  syncMode?: SyncMode;
  syncIntervalMin?: number;
  syncRangeDays?: number;
  slotSyncEnabled?: boolean;
  bookingSyncEnabled?: boolean;
  isActive?: boolean;
}

export interface PartnerConfigFilters {
  search?: string;
  isActive?: boolean;
  syncMode?: SyncMode;
  companyId?: number;
  page?: number;
  limit?: number;
}

// ── Game Mapping ──

export interface GameMapping {
  id: number;
  partnerId: number;
  internalCourseId: number;
  internalGameId: number;
  externalCourseId: string;
  externalCourseName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameMappingDto {
  partnerId: number;
  internalCourseId: number;
  internalGameId: number;
  externalCourseId: string;
  externalCourseName: string;
  isActive?: boolean;
}

export interface UpdateGameMappingDto {
  internalCourseId?: number;
  internalGameId?: number;
  externalCourseId?: string;
  externalCourseName?: string;
  isActive?: boolean;
}

// ── Sync Log ──

export type SyncResult = 'SUCCESS' | 'PARTIAL' | 'FAILED';
export type SyncAction = 'SLOT_SYNC' | 'BOOKING_IMPORT';

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

// ── Slot Mapping ──

export type SlotSyncStatus = 'MAPPED' | 'UNMAPPED' | 'CHANGED' | 'DELETED';
export type ExternalSlotStatus = 'AVAILABLE' | 'FULLY_BOOKED' | 'CLOSED';

export interface SlotMapping {
  id: number;
  gameMappingId: number;
  externalSlotId: string;
  date: string;
  startTime: string;
  endTime: string;
  internalSlotId?: number | null;
  externalMaxPlayers: number;
  externalBooked: number;
  externalStatus: ExternalSlotStatus;
  externalPrice?: number | null;
  syncStatus: SlotSyncStatus;
  syncError?: string | null;
  lastSyncAt: string;
  gameMapping?: {
    externalCourseName: string;
    internalGameId: number;
  };
  createdAt: string;
  updatedAt: string;
}

// ── Booking Mapping ──

export type BookingSyncStatus = 'SYNCED' | 'PENDING' | 'CONFLICT' | 'FAILED' | 'CANCELLED';
export type SyncDirection = 'INBOUND' | 'OUTBOUND';

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
  playerName: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  conflictData?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ── List Response ──

export interface PartnerListResponse {
  data: PartnerConfig[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
