export const CourseStatus = {
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  MAINTENANCE: 'MAINTENANCE',
  PENDING: 'PENDING',
} as const;

export type CourseStatus = typeof CourseStatus[keyof typeof CourseStatus];

// Company 타입은 company.ts에서 관리
export type { Company, CompanyType, CompanyStatus, CompanyFilters, CompanyStats, CreateCompanyDto, UpdateCompanyDto } from './company';


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

// --- DTOs (코스/홀 생성/수정) ---
export interface CreateCourseDto {
  name: string;
  companyId: number;
  // Club/Golf course fields
  golfClubId?: number;       // 골프장 ID (클럽 관리용)
  clubId?: number;           // 클럽 ID 별칭
  code?: string;             // 코스 코드
  subtitle?: string;         // 부제목
  // Course specifications
  holeCount?: number;
  par?: number;              // 기준 타수
  totalDistance?: number;    // 총 거리
  difficulty?: number;       // 난이도 (1-5)
  scenicRating?: number;     // 경관 점수 (1-5)
  courseRating?: number;     // 코스 레이팅
  slopeRating?: number;      // 슬로프 레이팅
  // Location & Contact
  location?: string;
  description?: string;
  imageUrl?: string;
  contactInfo?: string;
  status?: CourseStatus;
}
export interface UpdateCourseDto {
  name?: string;
  code?: string;
  subtitle?: string;
  holeCount?: number;
  par?: number;
  totalDistance?: number;
  difficulty?: number;
  scenicRating?: number;
  courseRating?: number;
  slopeRating?: number;
  location?: string;
  description?: string;
  imageUrl?: string;
  contactInfo?: string;
  status?: CourseStatus;
  isActive?: boolean;
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

// --- Admin Types (v3 - CompanyType 기반 역할 관리) ---

// 플랫폼 역할 (본사, 협회용)
export type PlatformRole =
  | 'PLATFORM_ADMIN'    // 본사 최고 관리자 - 전체 권한
  | 'PLATFORM_SUPPORT'  // 전체 고객지원/조회
  | 'PLATFORM_VIEWER';  // 전체 데이터 조회

// 회사 역할 (가맹점용)
export type CompanyRole =
  | 'COMPANY_ADMIN'    // 회사 대표/총괄
  | 'COMPANY_MANAGER'  // 운영 매니저
  | 'COMPANY_STAFF'    // 현장 직원
  | 'COMPANY_VIEWER';  // 회사 데이터 조회

// 관리자 역할 (플랫폼 + 회사)
export type AdminRole = PlatformRole | CompanyRole;

// 역할 범위 (PLATFORM: 전체, COMPANY: 소속 회사만)
export type AdminScope = 'PLATFORM' | 'COMPANY';

// 회사 유형별 부여 가능 역할
export const ALLOWED_ROLES_BY_COMPANY_TYPE: Record<string, AdminRole[]> = {
  PLATFORM: ['PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_VIEWER'],
  ASSOCIATION: ['PLATFORM_SUPPORT', 'PLATFORM_VIEWER'],
  FRANCHISE: ['COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_STAFF', 'COMPANY_VIEWER'],
};

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

// 관리자-회사 연결 (AdminCompany)
export interface AdminCompany {
  id: number;
  adminId: number;
  companyId: number;
  companyRoleCode: AdminRole;  // 회사 내 역할
  isPrimary: boolean;          // 주 소속 회사
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // 관계 (선택적으로 포함)
  company?: Company;
}

export interface Admin {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  // 프로필
  phone?: string | null;
  department?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  // 회사-역할 연결 (모든 관리자는 회사에 소속)
  companies: AdminCompany[];
  // 권한 (서버에서 계산하여 반환)
  permissions: Permission[];
  // 편의 필드 (주 소속 회사 정보)
  primaryCompany?: AdminCompany;
  primaryRole?: AdminRole;      // 주 소속 회사의 역할
  primaryScope?: AdminScope;    // 역할에서 추론된 범위
  // Legacy fields (하위 호환성)
  /** @deprecated Use companies instead */
  companyId?: number;
  /** @deprecated Use companies instead */
  company?: Company;
  /** @deprecated Use primaryRole instead */
  roleCode?: AdminRole;
  /** @deprecated Use primaryRole instead */
  role?: AdminRole;
  username?: string;            // email.split('@')[0] 으로 생성
}

// 관리자-회사 할당 DTO
export interface AdminCompanyAssignment {
  companyId: number;
  companyRoleCode: AdminRole;
  isPrimary?: boolean;
}

export interface CreateAdminDto {
  email: string;
  name: string;
  password: string;
  // 회사-역할 할당 (필수)
  companyAssignments: AdminCompanyAssignment[];
  // 프로필
  phone?: string;
  department?: string;
  description?: string;
  isActive?: boolean;
  // Legacy fields (하위 호환성)
  /** @deprecated Use companyAssignments instead */
  roleCode?: AdminRole;
  /** @deprecated Use companyAssignments instead */
  companyId?: number;
}

export interface UpdateAdminDto {
  email?: string;
  name?: string;
  password?: string;
  // 회사-역할 업데이트
  companyAssignments?: AdminCompanyAssignment[];
  // 프로필
  phone?: string;
  department?: string;
  description?: string;
  isActive?: boolean;
  // Legacy fields (하위 호환성)
  /** @deprecated Use companyAssignments instead */
  roleCode?: AdminRole;
  /** @deprecated Use companyAssignments instead */
  companyId?: number;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// --- User DTOs (일반 사용자용) ---
export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
  phoneNumber?: string;
  membershipTier?: UserMembershipTier;
  status?: UserStatus;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  password?: string;
  phoneNumber?: string;
  membershipTier?: UserMembershipTier;
  status?: UserStatus;
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

// Club types re-export
export type {
  Club,
  ClubStatus,
  SeasonType,
  CourseCombo,
  GolfTimeSlot,
  CreateClubDto,
  UpdateClubDto,
  ClubFilters,
  TimeSlotFilters,
  ClubListResponse,
  TimeSlotListResponse,
  TimeSlotWizardData,
  CreateTimeSlotBulkDto,
  ClubStats,
  ComboAnalytics,
} from './club';
