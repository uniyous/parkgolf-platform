// Common TypeScript types for Park Golf Platform

// Base Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// User Types
export interface User extends BaseEntity {
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  status: Status;
  lastLoginAt?: Date;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  GUEST = 'GUEST'
}

// Common Enums
export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED'
}

export enum Language {
  KO = 'KO',
  EN = 'EN',
  JA = 'JA',
  ZH = 'ZH'
}

// Address Type
export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

// Contact Type
export interface Contact {
  phone?: string;
  email?: string;
  website?: string;
  kakaoId?: string;
  lineId?: string;
}

// Money Type
export interface Money {
  amount: number;
  currency: Currency;
}

export enum Currency {
  KRW = 'KRW',
  USD = 'USD',
  JPY = 'JPY'
}

// Time Slot Type
export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  duration: number;  // minutes
}

// Operating Hours
export interface OperatingHours {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  openTime: string;  // HH:MM format
  closeTime: string; // HH:MM format
  isClosed: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

// Query Parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortParams {
  sort?: string; // field:asc or field:desc
}

export interface SearchParams extends PaginationParams, SortParams {
  search?: string;
}

// Event Types
export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: Date;
  version: string;
}

export interface DomainEvent<T = any> extends BaseEvent {
  aggregateId: string;
  aggregateType: string;
  payload: T;
  metadata?: Record<string, any>;
}

// Notification Types
export enum NotificationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  KAKAO = 'KAKAO'
}

export interface NotificationRequest {
  type: NotificationType;
  recipient: string;
  templateId: string;
  variables: Record<string, any>;
  scheduledAt?: Date;
}

// Booking Types
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED'
}

// Utility Types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// DTO Base Types
export interface CreateDto<T> extends Omit<T, keyof BaseEntity> {}
export interface UpdateDto<T> extends Partial<CreateDto<T>> {}

// Filter Types
export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

export interface PriceRangeFilter {
  minPrice?: number;
  maxPrice?: number;
  currency?: Currency;
}

export interface GeoLocationFilter {
  latitude: number;
  longitude: number;
  radius: number; // in kilometers
}