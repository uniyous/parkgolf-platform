// 상태 타입 정의
export type ClubStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'SEASONAL_CLOSED';
export type CourseStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
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

export interface Course {
  id: number;
  name: string;
  code?: string;
  subtitle?: string;
  description?: string;
  holeCount?: number;
  par?: number;
  totalDistance?: number;
  difficulty?: number;
  scenicRating?: number;
  courseRating?: number;
  slopeRating?: number;
  imageUrl?: string;
  status?: CourseStatus;
  clubId?: number;
  companyId?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  holes?: Hole[];
  // 추가 호환성 필드
  totalBookings?: number;
  monthlyBookings?: number;
  totalRevenue?: number;
  monthlyRevenue?: number;
  location?: string;
  address?: string;
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
  courseId: number;
  createdAt: string;
  updatedAt: string;
  teeBoxes?: TeeBox[];
}

export interface TeeBox {
  id: number;
  name: string;
  color: string;
  distance: number;
  difficulty: string;
  holeId: number;
  createdAt: string;
  updatedAt: string;
}

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

// DTO 타입 (Create/Update)
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

export interface CreateCourseDto {
  name: string;
  code: string;
  subtitle?: string;
  description?: string;
  holeCount?: number;
  par?: number;
  totalDistance?: number;
  difficulty?: number;
  scenicRating?: number;
  courseRating?: number;
  slopeRating?: number;
  imageUrl?: string;
  golfClubId: number;
  companyId: number;
}

export interface UpdateCourseDto {
  name?: string;
  code?: string;
  subtitle?: string;
  description?: string;
  holeCount?: number;
  par?: number;
  totalDistance?: number;
  difficulty?: number;
  scenicRating?: number;
  courseRating?: number;
  slopeRating?: number;
  imageUrl?: string;
  status?: CourseStatus;
  isActive?: boolean;
}

export interface CreateHoleDto {
  holeNumber: number;
  par: number;
  distance: number;
  handicap: number;
  description?: string;
  tips?: string;
  imageUrl?: string;
  courseId: number;
}

export interface UpdateHoleDto {
  holeNumber?: number;
  par?: number;
  distance?: number;
  handicap?: number;
  description?: string;
  tips?: string;
  imageUrl?: string;
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

// 유틸리티 타입
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}