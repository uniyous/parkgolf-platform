// ── Partner Config ──

export type SyncMode = 'POLLING' | 'WEBHOOK' | 'HYBRID';

export interface PartnerConfig {
  id: number;
  name: string;
  partnerCode: string;
  specUrl: string;
  apiKey: string;        // masked (********)
  apiSecret?: string;    // masked (********)
  companyId: number;
  clubId: number;
  syncMode: SyncMode;
  syncIntervalMinutes: number;
  isActive: boolean;
  responseMapping?: Record<string, unknown>;
  companyName?: string;
  clubName?: string;
  lastSyncAt?: string | null;
  circuitBreakerStatus?: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerConfigDto {
  name: string;
  partnerCode: string;
  specUrl: string;
  apiKey: string;
  apiSecret?: string;
  companyId: number;
  clubId: number;
  syncMode?: SyncMode;
  syncIntervalMinutes?: number;
  isActive?: boolean;
  responseMapping?: Record<string, unknown>;
}

export interface UpdatePartnerConfigDto {
  name?: string;
  specUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  syncMode?: SyncMode;
  syncIntervalMinutes?: number;
  isActive?: boolean;
  responseMapping?: Record<string, unknown>;
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
  syncType: 'SLOT' | 'BOOKING';
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
