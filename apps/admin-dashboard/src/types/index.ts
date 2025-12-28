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
  holes?: Hole[] | number; // Hole 배열 또는 홀 수
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
  distance?: number | null;
  imageUrl?: string | null;
  mapUrl?: string | null;
  description?: string | null;
  courseId: number;
  createdAt: string;
  updatedAt: string;
  // teeBoxes?: TeeBox[];
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
  username: string;
  email: string;
  name: string;
  phoneNumber?: string;
  membershipTier?: UserMembershipTier;
  status?: UserStatus;
  isActive: boolean;
  lastLoginAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  // 멤버십 관련 필드
  membershipStartDate?: Date | null;
  membershipEndDate?: Date | null;
  totalBookings?: number;
  totalSpent?: number;
  loyaltyPoints?: number;
  
  // Admin 관련 필드 (관리자 사용자인 경우)
  role?: AdminRole | UserMembershipTier;
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
  username: string;
  email: string;
  name: string;
  role: AdminRole;
  scope?: AdminScope;           // 역할에서 자동 추론 가능
  permissions: Permission[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;

  // 추가 필드
  phone?: string;
  department?: string;
  description?: string;

  // 관계 필드 (선택)
  companyId?: number;
  company?: Company;
  courseIds?: number[];  // 접근 가능한 코스 ID 목록
}

export interface CreateAdminDto {
  email: string;
  name: string;
  password: string;
  role: AdminRole;
  permissions?: Permission[];
  isActive?: boolean;
  phone?: string;
  department?: string;
  description?: string;
}

export interface UpdateAdminDto {
  email?: string;
  name?: string;
  role?: AdminRole;
  permissions?: Permission[];
  isActive?: boolean;
  phone?: string;
  department?: string;
  description?: string;
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

export interface BookingStatus {
  PENDING: 'PENDING';
  CONFIRMED: 'CONFIRMED';
  CANCELLED: 'CANCELLED';
  COMPLETED: 'COMPLETED';
  NO_SHOW: 'NO_SHOW';
}

export interface Booking {
  id: number;
  userId: number;
  courseId: number;
  bookingDate: string; // YYYY-MM-DD format
  timeSlot: string;    // HH:MM format
  startTime?: string;  // HH:MM format (optional for display)
  endTime?: string;    // HH:MM format (optional for display)
  playerCount: number;
  numberOfPlayers?: number; // alias for playerCount
  totalPrice: number;
  totalAmount: number; // alias for totalPrice
  status: keyof BookingStatus;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  specialRequests?: string;
  paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER' | 'MOBILE';
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingDto {
  userId: number;
  courseId: number;
  timeSlotId: number;
  bookingDate: string;
  timeSlot: string;
  playerCount: number;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  numberOfPlayers?: number;
  specialRequests?: string;
  paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER' | 'MOBILE';
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
}

export interface BookingFilters {
  search?: string;
  status?: keyof BookingStatus;
  courseId?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateBookingDto {
  courseId?: number;
  timeSlotId?: number;
  bookingDate?: string;
  timeSlot?: string;
  playerCount?: number;
  notes?: string;
  status?: keyof BookingStatus;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

// Common types re-export
export * from './common';

