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
  courseMappings?: CourseMapping[];
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
  id: number;
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

// ── Course Mapping ──

export interface CourseMapping {
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

export interface CreateCourseMappingDto {
  partnerId: number;
  internalCourseId: number;
  internalGameId: number;
  externalCourseId: string;
  externalCourseName: string;
  isActive?: boolean;
}

export interface UpdateCourseMappingDto {
  internalCourseId?: number;
  internalGameId?: number;
  externalCourseId?: string;
  externalCourseName?: string;
  isActive?: boolean;
}

// ── Sync Log ──

export type SyncResult = 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface SyncLog {
  id: number;
  partnerId: number;
  syncType: 'SLOT_SYNC' | 'BOOKING_IMPORT';
  result: SyncResult;
  slotsCreated: number;
  slotsUpdated: number;
  slotsDeleted: number;
  errorMessage?: string | null;
  durationMs: number;
  startedAt: string;
  completedAt: string;
}

// ── Booking Mapping ──

export type BookingSyncStatus = 'SYNCED' | 'PENDING' | 'CONFLICT' | 'FAILED';

export interface BookingMapping {
  id: number;
  partnerId: number;
  internalBookingId: number;
  externalBookingId: string;
  syncStatus: BookingSyncStatus;
  conflictData?: Record<string, unknown> | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
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
