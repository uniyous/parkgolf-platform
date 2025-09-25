// 골프장 관리 (GolfRounds) 타입 정의

export interface GolfClub {
  id: number;
  name: string;
  companyId: number;
  location: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  totalHoles: number;      // 전체 홀 수 (18, 27, 36홀 등)
  totalCourses: number;    // 코스 수 (2, 3, 4개 등)
  status: GolfClubStatus;
  operatingHours: {
    open: string;          // "06:00"
    close: string;         // "18:00"
  };
  seasonInfo?: {
    type: 'peak' | 'regular' | 'off';
    startDate: string;
    endDate: string;
  };
  facilities: string[];    // 부대시설
  courses: Course[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  id: number;
  golfClubId: number;
  name: string;           // "A코스", "Lake코스"
  code: string;           // "A", "B", "C", "D"
  subtitle?: string;      // "Lake", "Ocean", "Valley"
  holeCount: 9;          // 항상 9홀
  par: number;           // 9홀 파 합계 (보통 36)
  totalDistance: number; // 미터 단위
  difficulty: 1 | 2 | 3 | 4 | 5; // 난이도 (1=매우쉬움, 5=매우어려움)
  scenicRating: 1 | 2 | 3 | 4 | 5; // 경치 점수
  courseRating?: number;  // 코스 레이팅
  slopeRating?: number;   // 슬로프 레이팅
  description?: string;
  imageUrl?: string;
  holes: Hole[];         // 정확히 9개
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Hole {
  id: number;
  courseId: number;
  holeNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // 1-9번 홀
  par: 3 | 4 | 5;       // 홀 파
  distance: number;      // 미터 단위
  handicap: number;      // 핸디캡 (1-18)
  description?: string;
  tips?: string;
  imageUrl?: string;
  teeBoxes?: TeeBox[];
}

export interface TeeBox {
  id: number;
  holeId: number;
  name: string;          // "Championship", "Regular", "Ladies"
  color: string;         // "Gold", "Blue", "White", "Red"
  distance: number;      // 미터 단위
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';
}

// 18홀 조합 (2개 코스 결합)
export interface CourseCombo {
  id: string;            // "A-B", "Lake-Ocean"
  golfClubId: number;
  frontNine: Course;     // 전반 9홀 코스
  backNine: Course;      // 후반 9홀 코스
  name: string;          // "Lake → Ocean"
  totalPar: number;      // 72 (36+36)
  totalDistance: number; // 미터 단위
  averageDifficulty: number; // (전반 + 후반) / 2
  popularity: number;    // 1-5 (인기도)
  basePrice: number;     // 기본 가격
  isRecommended: boolean; // 추천 조합 여부
  isActive: boolean;
  distribution?: number; // 타임슬롯 분배 비중 (%)
}

// 타임슬롯 (18홀 조합 기반)
export interface GolfTimeSlot {
  id: number;
  golfClubId: number;
  comboId: string;       // CourseCombo.id 참조
  date: Date;
  startTime: string;     // "06:00"
  endTime: string;       // "10:30" (예상 소요시간 4.5시간)
  maxTeams: number;      // 최대 팀 수 (보통 4팀)
  bookedTeams: number;   // 예약된 팀 수
  availableTeams: number; // 예약 가능 팀 수
  price: number;         // 해당 조합/시간대 가격
  specialPrice?: {
    type: 'early_bird' | 'late_afternoon' | 'weekend' | 'holiday';
    rate: number;        // 할인/할증률 (%)
  };
  status: TimeSlotStatus;
  weather?: WeatherInfo;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 마법사용 데이터 구조
export interface TimeSlotWizardData {
  golfClubId: number;
  dateRange: {
    startDate: string;   // "2024-01-01"
    endDate: string;     // "2024-01-31"
  };
  combos: CourseComboSetting[]; // 선택된 조합들
  timePattern: {
    type: 'STANDARD' | 'PEAK' | 'OFF_PEAK' | 'CUSTOM';
    startTime: string;   // "06:00"
    endTime: string;     // "15:00"
    interval: number;    // 분 단위 (7, 8, 10분)
    maxTeamsPerSlot: number; // 슬롯당 최대 팀 수
    excludeHolidays?: boolean;
    excludeWeekends?: boolean;
  };
  pricing: {
    basePrice: number;
    weekdayRate: number;  // 평일 비율 (%)
    weekendRate: number;  // 주말 비율 (%)
    holidayRate: number;  // 공휴일 비율 (%)
    earlyBirdDiscount: number; // 얼리버드 할인 (%)
    lateAfternoonDiscount: number; // 늦은 오후 할인 (%)
  };
  distribution: {
    type: 'AUTO' | 'MANUAL' | 'EQUAL';
    customRates?: Record<string, number>; // 조합별 분배율
  };
}

export interface CourseComboSetting {
  comboId: string;
  name: string;
  frontNine: string;    // 코스명
  backNine: string;     // 코스명
  popularity: number;   // 1-5
  distribution: number; // 분배 비중 (%)
  isActive: boolean;
  basePrice: number;
  priceModifier: number; // 가격 조정 (%)
}

// Enum 타입들
export type GolfClubStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'SEASONAL_CLOSED';
export type TimeSlotStatus = 'AVAILABLE' | 'FULLY_BOOKED' | 'CLOSED' | 'MAINTENANCE';

export interface WeatherInfo {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  temperature: number;
  windSpeed: number;
  humidity: number;
}

// 필터 및 검색
export interface GolfClubFilters {
  search?: string;
  location?: string;
  status?: GolfClubStatus;
  minHoles?: number;
  maxHoles?: number;
  facilities?: string[];
  sortBy?: 'name' | 'holes' | 'popularity' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TimeSlotFilters {
  golfClubId?: number;
  comboId?: string;
  dateFrom?: string;
  dateTo?: string;
  timeFrom?: string;
  timeTo?: string;
  status?: TimeSlotStatus;
  minAvailableTeams?: number;
}

// API 응답 타입
export interface GolfClubListResponse {
  data: GolfClub[];
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

// DTO 타입들
export interface CreateGolfClubDto {
  name: string;
  companyId: number;
  location: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  operatingHours: {
    open: string;
    close: string;
  };
  facilities?: string[];
}

export interface UpdateGolfClubDto extends Partial<CreateGolfClubDto> {
  status?: GolfClubStatus;
}

export interface CreateCourseDto {
  golfClubId: number;
  name: string;
  code: string;
  subtitle?: string;
  par: number;
  totalDistance: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  scenicRating: 1 | 2 | 3 | 4 | 5;
  description?: string;
  imageUrl?: string;
}

export interface UpdateCourseDto extends Partial<CreateCourseDto> {
  isActive?: boolean;
}

export interface CreateHoleDto {
  courseId: number;
  holeNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  par: 3 | 4 | 5;
  distance: number;
  handicap: number;
  description?: string;
  tips?: string;
  imageUrl?: string;
}

export interface UpdateHoleDto extends Partial<CreateHoleDto> {}

export interface CreateTimeSlotBulkDto {
  golfClubId: number;
  wizardData: TimeSlotWizardData;
}

// 통계 및 분석 타입
export interface GolfClubStats {
  totalClubs: number;
  activeClubs: number;
  totalCourses: number;
  totalHoles: number;
  totalTimeSlots: number;
  averageUtilization: number; // 평균 가동률
  monthlyRevenue: number;
  topPerformingClub: GolfClub | null;
  popularCombos: CourseCombo[];
}

export interface ComboAnalytics {
  comboId: string;
  comboName: string;
  totalSlots: number;
  bookedSlots: number;
  utilizationRate: number; // 가동률 (%)
  averagePrice: number;
  totalRevenue: number;
  weekdayBookings: number;
  weekendBookings: number;
  peakHours: string[];
  customerRating?: number;
}