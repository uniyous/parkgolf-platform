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
export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  permissions?: string[];
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// --- Admin Types ---
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'VIEWER';

export type Permission = 
  | 'ADMIN_READ' | 'ADMIN_WRITE' | 'ADMIN_DELETE'
  | 'COURSE_READ' | 'COURSE_WRITE' | 'COURSE_DELETE'
  | 'USER_READ' | 'USER_WRITE' | 'USER_DELETE'
  | 'SYSTEM_READ' | 'SYSTEM_WRITE' | 'SYSTEM_SETTINGS'
  | 'BOOKING_READ' | 'BOOKING_WRITE' | 'BOOKING_DELETE'
  | 'TIMESLOT_READ' | 'TIMESLOT_WRITE' | 'TIMESLOT_DELETE';

export interface Admin {
  id: number;
  username: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: Permission[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminDto {
  username: string;
  email: string;
  name: string;
  password: string;
  role: AdminRole;
  permissions?: Permission[];
}

export interface UpdateAdminDto {
  username?: string;
  email?: string;
  name?: string;
  role?: AdminRole;
  permissions?: Permission[];
  isActive?: boolean;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

// --- Time Slot & Booking Types ---
export interface TimeSlot {
  id: number;
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
  startTime: string;
  endTime: string;
  maxPlayers: number;
  price: number;
  isActive?: boolean;
}

export interface UpdateTimeSlotDto {
  startTime?: string;
  endTime?: string;
  maxPlayers?: number;
  price?: number;
  isActive?: boolean;
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
  status: keyof BookingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingDto {
  userId: number;
  courseId: number;
  bookingDate: string;
  timeSlot: string;
  playerCount: number;
  notes?: string;
}