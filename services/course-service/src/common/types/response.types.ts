/**
 * Entity Response Types
 * Prisma 모델 기반 응답 타입 정의
 */

import {
  CompanyStatus,
  ClubStatus,
  CourseStatus,
  GameStatus,
  TimeSlotStatus,
  TeeBoxLevel,
} from '@prisma/client';

// ============================================
// Re-export Prisma Enums
// ============================================
export {
  CompanyStatus,
  ClubStatus,
  CourseStatus,
  GameStatus,
  TimeSlotStatus,
  TeeBoxLevel,
};

// ============================================
// Flexible Input Types (accepts both Prisma and DTO)
// ============================================

/** Company 입력 타입 (Prisma/DTO 호환) */
export interface CompanyInput {
  id: number;
  name: string;
  businessNumber?: string | null;
  description?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  website?: string | null;
  establishedDate?: Date | string | null;
  logoUrl?: string | null;
  status: CompanyStatus;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  clubs?: ClubInput[];
  courses?: CourseInput[];
}

/** Club 입력 타입 (Prisma/DTO 호환) */
export interface ClubInput {
  id: number;
  name: string;
  companyId: number;
  location: string;
  address: string;
  phone: string;
  email?: string | null;
  website?: string | null;
  totalHoles: number;
  totalCourses: number;
  status: ClubStatus;
  operatingHours?: unknown;
  seasonInfo?: unknown;
  facilities: string[];
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  company?: CompanyInput;
  courses?: CourseInput[];
}

/** Course 입력 타입 (Prisma/DTO 호환) */
export interface CourseInput {
  id: number;
  name: string;
  code: string;
  subtitle?: string | null;
  description?: string | null;
  companyId: number;
  clubId: number;
  holeCount: number;
  par: number;
  totalDistance?: number | null;
  difficulty: number;
  scenicRating: number;
  courseRating?: number | null;
  slopeRating?: number | null;
  imageUrl?: string | null;
  status: CourseStatus;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  company?: CompanyInput;
  club?: ClubInput;
  holes?: HoleInput[];
}

/** Hole 입력 타입 (Prisma/DTO 호환) */
export interface HoleInput {
  id: number;
  courseId: number;
  holeNumber: number;
  par: number;
  distance: number;
  handicap: number;
  description?: string | null;
  tips?: string | null;
  imageUrl?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  course?: CourseInput;
  teeBoxes?: TeeBoxInput[];
}

/** TeeBox 입력 타입 (Prisma/DTO 호환) */
export interface TeeBoxInput {
  id: number;
  holeId: number;
  name: string;
  color: string;
  distance: number;
  difficulty?: TeeBoxLevel;
  createdAt: Date | string;
  updatedAt: Date | string;
  hole?: HoleInput;
}

/** Game 입력 타입 (Prisma/DTO 호환) */
export interface GameInput {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  frontNineCourseId: number;
  backNineCourseId: number;
  totalHoles: number;
  estimatedDuration: number;
  breakDuration: number;
  maxPlayers: number;
  basePrice: number | { toNumber?: () => number };
  weekendPrice?: number | { toNumber?: () => number } | null;
  holidayPrice?: number | { toNumber?: () => number } | null;
  clubId: number;
  status: GameStatus;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  club?: ClubInput;
  frontNineCourse?: CourseInput;
  backNineCourse?: CourseInput;
}

/** GameTimeSlot 입력 타입 (Prisma/DTO 호환) */
export interface GameTimeSlotInput {
  id: number;
  gameId: number;
  date: Date | string;
  startTime: string;
  endTime: string;
  maxPlayers: number;
  bookedPlayers: number;
  price: number | { toNumber?: () => number };
  isPremium: boolean;
  status: TimeSlotStatus;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  game?: GameInput;
}

/** GameWeeklySchedule 입력 타입 (Prisma/DTO 호환) */
export interface GameWeeklyScheduleInput {
  id: number;
  gameId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  interval: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Legacy type aliases for backward compatibility
export type CompanyWithRelations = CompanyInput;
export type ClubWithRelations = ClubInput;
export type CourseWithRelations = CourseInput;
export type HoleWithRelations = HoleInput;
export type TeeBoxWithRelations = TeeBoxInput;
export type GameWithRelations = GameInput;
export type GameTimeSlotWithRelations = GameTimeSlotInput;
export type GameWeeklyScheduleWithRelations = GameWeeklyScheduleInput;

// ============================================
// Response Types (Output)
// ============================================

/** Company 응답 타입 */
export interface CompanyResponse {
  id: number;
  name: string;
  businessNumber: string | null;
  description: string | null;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  website: string | null;
  establishedDate: string | null;
  logoUrl: string | null;
  status: CompanyStatus;
  isActive: boolean;
  coursesCount: number;
  clubsCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Club 응답 타입 */
export interface ClubResponse {
  id: number;
  name: string;
  companyId: number;
  location: string;
  address: string;
  phone: string;
  email: string | null;
  website: string | null;
  totalHoles: number;
  totalCourses: number;
  status: ClubStatus;
  operatingHours: Record<string, unknown> | null;
  seasonInfo: Record<string, unknown> | null;
  facilities: string[];
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  company?: CompanyInput;
  courses?: CourseResponse[];
}

/** Course 응답 타입 */
export interface CourseResponse {
  id: number;
  name: string;
  code: string;
  subtitle: string | null;
  description: string | null;
  companyId: number;
  clubId: number;
  holeCount: number;
  par: number;
  totalDistance: number | null;
  difficulty: number;
  scenicRating: number;
  courseRating: number | null;
  slopeRating: number | null;
  imageUrl: string | null;
  status: CourseStatus;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  company?: CompanyInput;
  club?: ClubInput;
  holes?: HoleResponse[];
}

/** Hole 응답 타입 */
export interface HoleResponse {
  id: number;
  courseId: number;
  holeNumber: number;
  par: number;
  distance: number;
  handicap: number;
  description: string | null;
  tips: string | null;
  imageUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  course?: CourseInput;
  teeBoxes?: TeeBoxResponse[];
}

/** TeeBox 응답 타입 */
export interface TeeBoxResponse {
  id: number;
  holeId: number;
  name: string;
  color: string;
  distance: number;
  difficulty?: TeeBoxLevel;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Game 응답 타입 */
export interface GameResponse {
  id: number;
  name: string;
  code: string;
  description: string | null;
  frontNineCourseId: number;
  backNineCourseId: number;
  frontNineCourse: CourseResponse | null;
  backNineCourse: CourseResponse | null;
  totalHoles: number;
  estimatedDuration: number;
  breakDuration: number;
  maxPlayers: number;
  basePrice: number;
  weekendPrice: number | null;
  holidayPrice: number | null;
  clubId: number;
  club: ClubResponse | null;
  status: GameStatus;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/** GameTimeSlot 응답 타입 */
export interface GameTimeSlotResponse {
  id: number;
  gameId: number;
  game: GameResponse | null;
  date: string;
  startTime: string;
  endTime: string;
  maxPlayers: number;
  bookedPlayers: number;
  availablePlayers: number;
  price: number;
  isPremium: boolean;
  status: TimeSlotStatus;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/** GameWeeklySchedule 응답 타입 */
export interface GameWeeklyScheduleResponse {
  id: number;
  gameId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  interval: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

// ============================================
// API Response Wrapper Types
// ============================================

/** 성공 응답 타입 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

/** 에러 응답 타입 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** API 응답 타입 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/** 페이지네이션 메타 타입 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// NATS Payload Types
// NATS 메시지는 외부에서 들어오므로 data 필드는 unknown으로 정의
// 컨트롤러에서 필요시 타입 단언 사용
// ============================================

/** Company NATS 페이로드 */
export interface CompanyPayload {
  companyId?: number;
  page?: number;
  limit?: number;
  data?: unknown;
  token?: string;
}

/** Club NATS 페이로드 */
export interface ClubPayload {
  id?: number;
  companyId?: number;
  query?: string;
  search?: string;
  location?: string;
  status?: ClubStatus;
  page?: number;
  limit?: number;
  data?: unknown;
  updateClubDto?: unknown;
  token?: string;
}

/** Course NATS 페이로드 */
export interface CoursePayload {
  courseId?: number;
  companyId?: number;
  clubId?: number;
  page?: number;
  limit?: number;
  data?: unknown;
  token?: string;
}

/** Hole NATS 페이로드 */
export interface HolePayload {
  courseId?: number;
  holeId?: number;
  holeNumber?: number;
  par?: number;
  data?: {
    holeNumber: number;
    par: number;
    distance: number;
    handicap?: number;
  };
  token?: string;
}

/** TeeBox NATS 페이로드 */
export interface TeeBoxPayload {
  holeId?: number;
  teeBoxId?: number;
  data?: unknown;
  token?: string;
}

/** Game NATS 페이로드 */
export interface GamePayload {
  gameId?: number;
  clubId?: number;
  page?: number;
  limit?: number;
  data?: unknown;
  token?: string;
}

/** GameTimeSlot NATS 페이로드 */
export interface GameTimeSlotPayload {
  gameId?: number;
  slotId?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  data?: unknown;
  token?: string;
}
