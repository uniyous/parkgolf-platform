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
  businessNumber: string;
  address: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  description?: string;
  createdAt: string;
  updatedAt: string;
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
  location?: string | null;
  description?: string | null;
  holeCount: number;
  par?: number | null;
  courseRating?: number | null;
  slopeRating?: number | null;
  imageUrl?: string | null;
  contactInfo?: string | null;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
  // 추가 필드
  address?: string;
  phoneNumber?: string;
  numberOfHoles?: number;
  isActive?: boolean;
  // 관계 필드 (선택적)
  // holes?: Hole[];
  // courseWeeklySchedules?: CourseWeeklySchedule[];
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
export type UserMembershipTier = 'PREMIUM' | 'REGULAR' | 'GUEST';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  phoneNumber?: string;
  membershipTier: UserMembershipTier;
  status: UserStatus;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt?: Date;
  // 멤버십 관련 필드
  membershipStartDate?: Date | null;
  membershipEndDate?: Date | null;
  totalBookings?: number;
  totalSpent?: number;
  loyaltyPoints?: number;
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

// --- Admin Types ---
// 플랫폼 레벨 관리자 (본사)
export type PlatformAdminRole = 
  | 'PLATFORM_OWNER'        // 플랫폼 최고 관리자
  | 'PLATFORM_ADMIN'        // 플랫폼 운영 관리자  
  | 'PLATFORM_SUPPORT'      // 플랫폼 지원팀
  | 'PLATFORM_ANALYST';     // 플랫폼 분석가

// 회사 레벨 관리자 (골프장 운영사)
export type CompanyAdminRole = 
  | 'COMPANY_OWNER'         // 회사 대표
  | 'COMPANY_MANAGER'       // 회사 운영 관리자
  | 'COURSE_MANAGER'        // 코스별 관리자
  | 'STAFF'                 // 일반 직원
  | 'READONLY_STAFF';       // 조회 전용 직원

// 통합 관리자 역할
export type AdminRole = PlatformAdminRole | CompanyAdminRole;

// 관리자 범위 타입
export type AdminScope = 'PLATFORM' | 'COMPANY' | 'COURSE';

// 상세 권한 정의
export type Permission = 
  // 플랫폼 권한
  | 'PLATFORM_ALL'               // 플랫폼 전체 권한
  | 'PLATFORM_COMPANY_MANAGE'    // 회사 관리
  | 'PLATFORM_USER_MANAGE'       // 전체 사용자 관리
  | 'PLATFORM_SYSTEM_CONFIG'     // 시스템 설정
  | 'PLATFORM_ANALYTICS'         // 전체 분석
  | 'PLATFORM_SUPPORT'           // 고객 지원
  
  // 회사 권한
  | 'COMPANY_ALL'                // 회사 전체 권한
  | 'COMPANY_ADMIN_MANAGE'       // 회사 관리자 관리
  | 'COMPANY_COURSE_MANAGE'      // 회사 코스 관리
  | 'COMPANY_BOOKING_MANAGE'     // 회사 예약 관리
  | 'COMPANY_USER_MANAGE'        // 회사 고객 관리
  | 'COMPANY_ANALYTICS'          // 회사 분석
  
  // 코스 권한
  | 'COURSE_TIMESLOT_MANAGE'     // 타임슬롯 관리
  | 'COURSE_BOOKING_MANAGE'      // 예약 관리
  | 'COURSE_CUSTOMER_VIEW'       // 고객 조회
  | 'COURSE_ANALYTICS_VIEW'      // 코스 분석 조회
  
  // 기본 권한
  | 'READ_ONLY'                  // 조회 전용
  | 'BOOKING_RECEPTION'          // 예약 접수
  | 'CUSTOMER_SUPPORT'           // 고객 응대
  
  // UI 네비게이션 권한 (통합)
  | 'VIEW_DASHBOARD'             // 대시보드 조회
  | 'MANAGE_COMPANIES'           // 회사 관리
  | 'MANAGE_COURSES'            // 코스 관리
  | 'MANAGE_TIMESLOTS'          // 타임슬롯 관리
  | 'MANAGE_BOOKINGS'           // 예약 관리
  | 'MANAGE_USERS'              // 사용자 관리
  | 'MANAGE_ADMINS'             // 관리자 관리
  | 'MANAGE_PAYMENTS'           // 결제 관리
  | 'VIEW_ANALYTICS'            // 분석 조회
  | 'VIEW_REPORTS'              // 리포트 조회
  | 'MANAGE_NOTIFICATIONS'      // 알림 관리
  | 'MANAGE_SYSTEM'             // 시스템 관리
  | 'MANAGE_PERMISSIONS'        // 권한 관리
  | 'VIEW_LOGS'                 // 로그 조회
  | 'MANAGE_BACKUPS'            // 백업 관리
  | 'VIEW_ADMIN_ROLES';         // 관리자 역할 조회

export interface Admin {
  id: number;
  username: string;
  email: string;
  name: string;
  role: AdminRole;
  scope: AdminScope;
  permissions: Permission[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // 관리 범위 정의
  companyId?: number;           // 특정 회사 관리자인 경우
  courseIds?: number[];         // 특정 코스 관리자인 경우
  
  // 추가 필드
  phone?: string;
  department?: string;
  description?: string;
  
  // 관계 필드
  company?: Company;            // 소속 회사 정보
  managedCourses?: Course[];    // 관리하는 코스들
}

export interface CreateAdminDto {
  username: string;
  email: string;
  name: string;
  password: string;
  role: AdminRole;
  scope: AdminScope;
  permissions?: Permission[];
  isActive?: boolean;
  companyId?: number;           // 회사 관리자인 경우 필수
  courseIds?: number[];         // 코스 관리자인 경우 필수
  phone?: string;
  department?: string;
  description?: string;
}

export interface UpdateAdminDto {
  username?: string;
  email?: string;
  name?: string;
  role?: AdminRole;
  scope?: AdminScope;
  permissions?: Permission[];
  isActive?: boolean;
  companyId?: number;
  courseIds?: number[];
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
  playerCount: number;
  totalPrice: number;
  totalAmount: number; // alias for totalPrice
  status: keyof BookingStatus;
  notes?: string;
  customerName?: string;
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

