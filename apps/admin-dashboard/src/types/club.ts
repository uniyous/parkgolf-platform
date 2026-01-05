/**
 * Club 관련 타입 정의
 *
 * Course, Hole, TeeBox 등은 @/types (index.ts)에서 가져오고,
 * Club, CourseCombo 등 클럽 전용 타입만 정의합니다.
 */

import type {
  Course,
  Hole,
  TeeBox,
  CourseStatus,
  CreateCourseDto,
  UpdateCourseDto,
  CreateHoleDto,
  UpdateHoleDto,
  Pagination,
} from '@/types';

// Re-export for convenience
export type { Course, Hole, TeeBox, CourseStatus, CreateCourseDto, UpdateCourseDto, CreateHoleDto, UpdateHoleDto };

// 상태 타입 정의
export type ClubStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'SEASONAL_CLOSED';
export type SeasonType = 'peak' | 'regular' | 'off';

// 기본 엔티티 타입
export interface Club {
  id: number;
  name: string;
  companyId: number;
  location: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  totalHoles: number;
  totalCourses: number;
  status: ClubStatus;
  operatingHours?: {
    open: string;
    close: string;
  };
  seasonInfo?: {
    type: SeasonType;
    startDate: string;
    endDate: string;
  };
  facilities?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: number;
    name: string;
    description?: string;
  };
  courses?: Course[];
}

// Course, Hole, TeeBox 타입은 @/types에서 import (상단 참조)

export interface CourseCombo {
  id: number;
  name: string;
  courseIds: number[];
  courses: Course[];
  totalHoles: number;
  totalPar: number;
  averageDifficulty: number;
  isPopular: boolean;
  isRecommended: boolean;
  isActive: boolean;
}

export interface GolfTimeSlot {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  maxPlayers: number;
  currentBookings: number;
  price: number;
  isAvailable: boolean;
  isBlocked: boolean;
  courseCombo?: CourseCombo;
  weather?: {
    condition: string;
    temperature: number;
  };
}

// ============================================
// Club DTOs (Club 전용 - Course/Hole DTO는 @/types에서 import)
// ============================================

export interface CreateClubDto {
  name: string;
  companyId: number;
  location: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  status?: ClubStatus;
  operatingHours?: {
    open: string;
    close: string;
  };
  facilities?: string[];
}

export interface UpdateClubDto {
  name?: string;
  companyId?: number;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  status?: ClubStatus;
  operatingHours?: {
    open: string;
    close: string;
  };
  seasonInfo?: {
    type: SeasonType;
    startDate: string;
    endDate: string;
  };
  facilities?: string[];
  isActive?: boolean;
}

// 필터 타입
export interface ClubFilters {
  search?: string;
  status?: ClubStatus;
  companyId?: number;
  location?: string;
  minHoles?: number;
  maxHoles?: number;
  facilities?: string[];
  isActive?: boolean;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface TimeSlotFilters {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  startTime?: string;
  endTime?: string;
  courseComboId?: number;
  isAvailable?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

// 응답 타입
export interface ClubListResponse {
  data: Club[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TimeSlotListResponse {
  data: GolfTimeSlot[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 타임슬롯 생성 관련 타입
export interface TimeSlotWizardData {
  clubId: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  timeSlots: {
    startTime: string;
    endTime: string;
    maxPlayers: number;
    price: number;
  }[];
  excludeDates?: string[];
  courseComboIds?: number[];
}

export interface CreateTimeSlotBulkDto {
  clubId: number;
  timeSlots: {
    date: string;
    startTime: string;
    endTime: string;
    maxPlayers: number;
    price: number;
    courseComboId?: number;
  }[];
}

// 통계 및 분석 타입
export interface ClubStats {
  totalBookings: number;
  totalRevenue: number;
  averageUtilization: number;
  monthlyRevenue: number;
  topCourses: string[];
  peakTimes: string[];
}

export interface ComboAnalytics {
  comboId: number;
  comboName: string;
  totalSlots: number;
  bookedSlots: number;
  utilizationRate: number;
  averagePrice: number;
  totalRevenue: number;
  weekdayBookings: number;
  weekendBookings: number;
  peakHours: string[];
}

// ============================================
// 유틸리티 타입 (Pagination은 @/types/common에서 import)
// ============================================

/** @deprecated Pagination 사용 권장 (import from '@/types') */
export type PaginationInfo = Pagination;