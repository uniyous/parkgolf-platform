export const CourseStatus = {
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  MAINTENANCE: 'MAINTENANCE',
  PENDING: 'PENDING',
} as const;

export type CourseStatus = typeof CourseStatus[keyof typeof CourseStatus];

export interface Company {
  id: number;
  name: string;
  businessNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'inactive';
  isActive: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyInput {
  name: string;
  businessNumber: string;
  address: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
}

export interface Course {
  id: number;
  name: string;
  companyId: number;
  companyName?: string;
  location?: string | null;
  description?: string | null;
  holeCount?: number;
  holes?: Hole[]; // Hole 배열
  par?: number | null;
  totalPar?: number; // 전체 파 수
  courseRating?: number | null;
  slopeRating?: number | null;
  imageUrl?: string | null;
  contactInfo?: string | null;
  status?: CourseStatus;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  // 추가 필드
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  numberOfHoles?: number;
  // Course specifications (optional)
  yardage?: number;
  distance?: number;
  difficultyLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL' | 'CHAMPIONSHIP';
  courseType?: 'PUBLIC' | 'PRIVATE' | 'RESORT' | 'MUNICIPAL' | 'LINKS' | 'PARKLAND' | 'DESERT' | 'MOUNTAIN';
  difficulty?: number;
  scenicRating?: number;
  // Facilities (optional)
  facilities?: string[];
  amenities?: string[];
  dressCode?: string;
  // Pricing (optional)
  weekdayPrice?: number;
  weekendPrice?: number;
  memberPrice?: number;
  cartFee?: number;
  caddyFee?: number;
  // Operational
  openTime?: string;
  closeTime?: string;
  restDays?: string[];
  // Club reference (optional)
  clubId?: number;
  code?: string;
  subtitle?: string;
  totalDistance?: number;
}

export interface Hole {
  id: number;
  holeNumber: number;
  par: number;
  distance: number;
  handicap: number;
  description?: string;
  tips?: string;
  imageUrl?: string;
  mapUrl?: string;
  courseId: number;
  createdAt: string;
  updatedAt: string;
  teeBoxes?: TeeBox[];
}

export interface TeeBox {
  id: number;
  name: string;
  distance: number;
  color: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';
  holeId: number;
  createdAt: string;
  updatedAt: string;
}

// --- DTOs (간략화된 예시, 실제로는 각 엔티티별 DTO 파일에서 가져옴) ---
export interface CreateCourseDto { 
  name: string; 
  companyId: number; 
  holeCount: number; 
  location?: string; 
  description?: string; 
  imageUrl?: string; 
  contactInfo?: string; 
  status?: CourseStatus; 
}
export interface UpdateCourseDto { 
  name?: string; 
  holeCount?: number; 
  location?: string; 
  description?: string; 
  imageUrl?: string; 
  contactInfo?: string; 
  status?: CourseStatus; 
}

export interface CreateHoleDto { 
  holeNumber: number; 
  par: number; 
  distance?: number; 
  description?: string; 
  imageUrl?: string;
  mapUrl?: string;
  courseId: number;
}

export interface UpdateHoleDto { 
  holeNumber?: number; 
  par?: number; 
  distance?: number; 
  description?: string; 
  imageUrl?: string;
  mapUrl?: string;
}

export interface CreateTeeBoxDto { 
  name: string; 
  distance: number; 
  color: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';
  holeId: number;
}

export interface UpdateTeeBoxDto { 
  name?: string; 
  distance?: number; 
  color?: string;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';
}

// --- Auth & User Types ---
export type UserMembershipTier = 'PREMIUM' | 'REGULAR' | 'GUEST' | 'SILVER' | 'VIP' | 'GOLD' | 'PLATINUM';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';

export interface User {
  id: number;
  email: string;
  name: string | null;
  roleCode: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  // 추가 필드 (확장된 사용자 정보)
  phoneNumber?: string;
  membershipTier?: UserMembershipTier;
  status?: UserStatus;
  lastLoginAt?: string | null;
  // 멤버십 관련 필드
  membershipStartDate?: string | null;
  membershipEndDate?: string | null;
  totalBookings?: number;
  totalSpent?: number;
  loyaltyPoints?: number;
  // Legacy fields (하위 호환성)
  /** @deprecated Use email.split('@')[0] for display purposes */
  username?: string;
  /** @deprecated Use roleCode instead */
  role?: AdminRole | UserMembershipTier;
  // Admin 관련 필드 (관리자 사용자인 경우)
  scope?: AdminScope;
  permissions?: Permission[];
  companyId?: number;
  courseIds?: number[];
  department?: string;
  description?: string;
}

export interface UserFilters {
  search: string;
  membershipTier?: UserMembershipTier;
  status?: UserStatus;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// 이전 role 타입은 admin 전용으로 유지 (하위 호환성)
export type UserRole = UserMembershipTier;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// --- Admin Types (v2 - 단순화된 구조) ---

// 관리자 역할 (5개로 단순화)
export type AdminRole =
  | 'ADMIN'     // 시스템 관리자 - 전체 권한
  | 'SUPPORT'   // 고객지원 - 예약/사용자/분석/지원
  | 'MANAGER'   // 운영 관리자 - 코스/예약/사용자/관리자/분석
  | 'STAFF'     // 현장 직원 - 타임슬롯/예약/지원
  | 'VIEWER';   // 조회 전용 - 조회만

// 관리자 범위 타입 (역할에서 자동 추론되므로 단순화)
export type AdminScope = 'SYSTEM' | 'OPERATION' | 'VIEW';

// 권한 정의
export type Permission =
  // 특수 권한
  | 'ALL'              // 전체 권한
  // 관리자 권한 (9개)
  | 'COMPANIES'        // 회사 관리
  | 'COURSES'          // 코스 관리
  | 'TIMESLOTS'        // 타임슬롯 관리
  | 'BOOKINGS'         // 예약 관리
  | 'USERS'            // 사용자 관리
  | 'ADMINS'           // 관리자 관리
  | 'ANALYTICS'        // 분석/리포트
  | 'SUPPORT'          // 고객 지원
  | 'VIEW'             // 조회
  | 'SYSTEM'           // 시스템 관리
  | 'MANAGE_GAMES'     // 게임 관리
  | 'MANAGE_GOLF_CLUBS' // 골프장 관리
  | 'MANAGE_PAYMENTS'  // 결제 관리
  | 'VIEW_DASHBOARD'   // 대시보드 조회
  // 사용자 권한 (8개)
  | 'PROFILE'          // 프로필 관리
  | 'COURSE_VIEW'      // 코스 조회
  | 'BOOKING_VIEW'     // 예약 조회
  | 'BOOKING_MANAGE'   // 예약 생성/수정/취소
  | 'PAYMENT'          // 결제/환불
  | 'PREMIUM_BOOKING'  // 프리미엄 예약
  | 'PRIORITY_BOOKING' // 우선 예약
  | 'ADVANCED_SEARCH'; // 고급 검색

// 하위 호환성을 위한 레거시 타입 별칭 (deprecated)
export type PlatformAdminRole = 'ADMIN' | 'SUPPORT';
export type CompanyAdminRole = 'MANAGER' | 'STAFF' | 'VIEWER';

export interface Admin {
  id: number;
  email: string;
  name: string;
  roleCode: AdminRole;
  role: AdminRole;              // 하위 호환성 (roleCode와 동일 값)
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  // 추가 필드
  phone?: string | null;
  department?: string | null;
  description?: string | null;
  // 권한 관련
  scope?: AdminScope;           // 역할에서 자동 추론 가능
  permissions: Permission[];
  // 관계 필드 (선택)
  companyId?: number;
  company?: Company;
  courseIds?: number[];  // 접근 가능한 코스 ID 목록
  // Legacy field
  username?: string;            // email.split('@')[0] 으로 생성
}

export interface CreateAdminDto {
  email: string;
  name: string;
  password: string;
  roleCode: AdminRole;
  permissions?: Permission[];
  isActive?: boolean;
  phone?: string;
  phoneNumber?: string;        // 하위 호환성 (phone과 동일)
  department?: string;
  description?: string;
  membershipTier?: UserMembershipTier;
  status?: UserStatus;
  /** @deprecated Use roleCode instead */
  role?: AdminRole;
}

export interface UpdateAdminDto {
  email?: string;
  name?: string;
  roleCode?: AdminRole;
  permissions?: Permission[];
  isActive?: boolean;
  phone?: string;
  phoneNumber?: string;        // 하위 호환성 (phone과 동일)
  department?: string;
  description?: string;
  membershipTier?: UserMembershipTier;
  status?: UserStatus;
  /** @deprecated Use roleCode instead */
  role?: AdminRole;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

// --- Time Slot & Booking Types ---
export interface TimeSlot {
  id: number;
  date: string;      // YYYY-MM-DD format
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  maxPlayers: number;
  price: number;
  courseId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimeSlotDto {
  date: string;      // YYYY-MM-DD format
  startTime: string;
  endTime: string;
  maxPlayers: number;
  price: number;
  isActive?: boolean;
}

export interface UpdateTimeSlotDto {
  date?: string;     // YYYY-MM-DD format
  startTime?: string;
  endTime?: string;
  maxPlayers?: number;
  price?: number;
  isActive?: boolean;
}

// 타임슬롯 필터링 인터페이스
export interface TimeSlotFilter {
  dateFrom?: string;   // YYYY-MM-DD format
  dateTo?: string;     // YYYY-MM-DD format
  timeFrom?: string;   // HH:MM format
  timeTo?: string;     // HH:MM format
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface WeeklySchedule {
  id: number;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  openTime: string;  // HH:MM format
  closeTime: string; // HH:MM format
  courseId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWeeklyScheduleDto {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  courseId: number;
  isActive?: boolean;
}

export interface UpdateWeeklyScheduleDto {
  openTime?: string;
  closeTime?: string;
  isActive?: boolean;
}

export interface TimeSlotAvailability {
  timeSlotId: number;
  startTime: string;
  endTime: string;
  maxPlayers: number;
  currentBookings: number;
  availableSlots: number;
  price: number;
  isAvailable: boolean;
}

export const BookingStatusEnum = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
  SAGA_PENDING: 'SAGA_PENDING',
  SAGA_FAILED: 'SAGA_FAILED',
} as const;

export type BookingStatusType = typeof BookingStatusEnum[keyof typeof BookingStatusEnum];

/** @deprecated Use BookingStatusEnum instead */
export interface BookingStatus {
  PENDING: 'PENDING';
  CONFIRMED: 'CONFIRMED';
  CANCELLED: 'CANCELLED';
  COMPLETED: 'COMPLETED';
  NO_SHOW: 'NO_SHOW';
}

export interface Booking {
  id: number;
  bookingNumber: string;
  userId?: number;
  // Game-based fields (새 스키마)
  gameId: number;
  gameTimeSlotId: number;
  gameName?: string;
  gameCode?: string;
  frontNineCourseId?: number;
  frontNineCourseName?: string;
  backNineCourseId?: number;
  backNineCourseName?: string;
  clubId?: number;
  clubName?: string;
  // Date & Time
  bookingDate: string; // YYYY-MM-DD format
  startTime: string;   // HH:MM format
  endTime: string;     // HH:MM format
  // Players & Pricing
  playerCount: number;
  pricePerPerson: number;
  serviceFee: number;
  totalPrice: number;
  // Status
  status: BookingStatusType;
  // Contact info
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  // Additional fields
  paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER' | 'MOBILE';
  specialRequests?: string;
  notes?: string;
  idempotencyKey?: string;
  sagaFailReason?: string;
  canCancel?: boolean;
  createdAt: string;
  updatedAt: string;
  // Legacy fields (하위 호환성)
  /** @deprecated Use gameId instead */
  courseId?: number;
  /** @deprecated Use startTime instead */
  timeSlot?: string;
  /** @deprecated Use playerCount instead */
  numberOfPlayers?: number;
  /** @deprecated Use totalPrice instead */
  totalAmount?: number;
  /** @deprecated Use userName instead */
  customerName?: string;
  /** @deprecated Use userPhone instead */
  customerPhone?: string;
  /** @deprecated Use userEmail instead */
  customerEmail?: string;
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
}

export interface CreateBookingDto {
  gameId: number;
  gameTimeSlotId: number;
  bookingDate: string;
  playerCount: number;
  paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER' | 'MOBILE';
  specialRequests?: string;
  // User info (for guest bookings or override)
  userId?: number;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  idempotencyKey?: string;
  // Legacy fields (하위 호환성)
  /** @deprecated Use gameTimeSlotId instead */
  timeSlotId?: number;
  /** @deprecated Use gameId instead */
  courseId?: number;
  /** @deprecated Use startTime from timeSlot instead */
  timeSlot?: string;
  notes?: string;
  /** @deprecated Use userName instead */
  customerName?: string;
  /** @deprecated Use userPhone instead */
  customerPhone?: string;
  /** @deprecated Use userEmail instead */
  customerEmail?: string;
  numberOfPlayers?: number;
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
}

export interface BookingFilters {
  search?: string;
  status?: BookingStatusType;
  gameId?: number;
  clubId?: number;
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;    // YYYY-MM-DD
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  // Legacy fields
  /** @deprecated Use gameId instead */
  courseId?: number;
  /** @deprecated Use startDate instead */
  dateFrom?: string;
  /** @deprecated Use endDate instead */
  dateTo?: string;
}

export interface UpdateBookingDto {
  playerCount?: number;
  specialRequests?: string;
  notes?: string;
  status?: BookingStatusType;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  // Legacy fields
  /** @deprecated Use gameId instead */
  courseId?: number;
  /** @deprecated Use gameTimeSlotId instead */
  timeSlotId?: number;
  bookingDate?: string;
  /** @deprecated Use startTime instead */
  timeSlot?: string;
  /** @deprecated Use userName instead */
  customerName?: string;
  /** @deprecated Use userPhone instead */
  customerPhone?: string;
  /** @deprecated Use userEmail instead */
  customerEmail?: string;
}

// Common types re-export
export * from './common';

