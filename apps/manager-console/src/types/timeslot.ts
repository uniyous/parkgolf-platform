// Time Slot Management Types
export type TimeSlotStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'CANCELLED';

export interface TimeSlot {
  id: number;
  courseId: number;      // Legacy field for backward compatibility
  courseName?: string;   // Course name for display
  // Dual course fields for 18-hole rounds
  frontNineCourseId?: number;    // 전반 9홀 코스 ID
  frontNineCourseName?: string;  // 전반 9홀 코스명
  backNineCourseId?: number;     // 후반 9홀 코스 ID
  backNineCourseName?: string;   // 후반 9홀 코스명
  isDualCourse?: boolean;        // 18홀 라운딩 여부
  date: string;          // YYYY-MM-DD format
  startTime: string;     // HH:MM format (전반 시작 시간)
  endTime: string;       // HH:MM format (후반 종료 시간)
  breakTime?: number;    // 휴식 시간 (분)
  maxSlots: number;      // Maximum number of slots
  bookedSlots: number;   // Currently booked slots
  availableSlots: number; // Available slots (maxSlots - bookedSlots)
  price: number;
  status: TimeSlotStatus;
  description?: string;  // Optional description
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  createdAt: string;
  updatedAt: string;
  // Related data
  course?: {
    id: number;
    name: string;
    status: string;
  };
  frontNineCourse?: {
    id: number;
    name: string;
    par: number;
  };
  backNineCourse?: {
    id: number;
    name: string;
    par: number;
  };
  bookings?: TimeSlotBooking[];
  revenue?: number;
  utilizationRate?: number;
}

export interface TimeSlotBooking {
  id: number;
  timeSlotId: number;
  userId: number;
  playerCount: number;
  bookingStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  totalPrice: number;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface RecurringPattern {
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  frequency: number;     // Every N days/weeks/months
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc. (for weekly)
  endDate?: string;      // When to stop recurring
  maxOccurrences?: number;
}

export interface TimeSlotFilters {
  search?: string;
  courseId?: number;
  dateFrom?: string;
  dateTo?: string;
  timeFrom?: string;
  timeTo?: string;
  status?: TimeSlotStatus;
  minAvailableSlots?: number;
  maxAvailableSlots?: number;
  minPrice?: number;
  maxPrice?: number;
  isRecurring?: boolean;
  sortBy?: 'date' | 'time' | 'price' | 'availableSlots' | 'utilizationRate' | 'revenue';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface TimeSlotStats {
  totalSlots: number;
  activeSlots: number;
  fullyBookedSlots: number;
  cancelledSlots: number;
  totalRevenue: number;
  averageUtilization: number;
  totalBookings: number;
  peakHours: string[];
  averagePrice: number;
  topCourses: Array<{
    courseId: number;
    courseName: string;
    totalSlots: number;
    revenue: number;
    utilizationRate: number;
  }>;
}

export interface CreateTimeSlotDto {
  courseId?: number;     // Legacy field
  frontNineCourseId?: number;  // 전반 9홀 코스
  backNineCourseId?: number;   // 후반 9홀 코스
  isDualCourse?: boolean;
  date: string;
  startTime: string;
  endTime: string;
  breakTime?: number;    // 휴식 시간 (분, 기본값: 30)
  maxPlayers: number;
  price: number;
  status?: TimeSlotStatus;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
}

export interface UpdateTimeSlotDto {
  date?: string;
  startTime?: string;
  endTime?: string;
  maxPlayers?: number;
  price?: number;
  status?: TimeSlotStatus;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
}

export interface BulkTimeSlotOperation {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
  timeSlotIds?: number[];
  data?: Partial<UpdateTimeSlotDto>;
  createData?: CreateTimeSlotDto[];
}

export interface TimeSlotGenerationConfig {
  courseId?: number;     // Legacy field
  frontNineCourseId?: number;  // 전반 9홀 코스
  backNineCourseId?: number;   // 후반 9홀 코스
  isDualCourse?: boolean;
  startDate: string;
  endDate: string;
  pattern: 'HOURLY' | 'CUSTOM_INTERVALS' | 'AM_PM' | 'PEAK_HOURS';
  startTime: string;
  endTime: string;
  interval?: number;      // minutes
  breakTime?: number;     // 휴식 시간 (분)
  maxPlayers: number;
  price: number;
  excludeWeekends?: boolean;
  excludeHolidays?: boolean;
  customIntervals?: Array<{
    startTime: string;
    endTime: string;
    maxPlayers?: number;
    price?: number;
  }>;
}

export interface TimeSlotConflict {
  timeSlotId: number;
  conflictType: 'OVERLAP' | 'DUPLICATE' | 'COURSE_CLOSED' | 'BOOKING_EXISTS';
  message: string;
  affectedBookings?: number[];
}

export interface TimeSlotAnalytics {
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  data: Array<{
    date: string;
    totalSlots: number;
    bookedSlots: number;
    revenue: number;
    utilizationRate: number;
  }>;
  trends: {
    revenueGrowth: number;
    bookingGrowth: number;
    utilizationTrend: number;
  };
  recommendations: string[];
}

export interface TimeSlotAvailabilityCheck {
  courseId: number;
  date: string;
  timeSlot: {
    startTime: string;
    endTime: string;
  };
  isAvailable: boolean;
  conflicts: TimeSlotConflict[];
  alternativeSlots?: Array<{
    startTime: string;
    endTime: string;
    availableSlots: number;
  }>;
}

