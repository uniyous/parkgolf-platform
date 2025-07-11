// Time Slot Management Types
export type TimeSlotStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'CANCELLED';

export interface TimeSlot {
  id: number;
  courseId: number;
  courseName?: string;   // Course name for display
  date: string;          // YYYY-MM-DD format
  startTime: string;     // HH:MM format
  endTime: string;       // HH:MM format
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
  courseId: number;
  date: string;
  startTime: string;
  endTime: string;
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
  courseId: number;
  startDate: string;
  endDate: string;
  pattern: 'HOURLY' | 'CUSTOM_INTERVALS' | 'AM_PM' | 'PEAK_HOURS';
  startTime: string;
  endTime: string;
  interval?: number;      // minutes
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

// Mock data generators
export const generateMockTimeSlots = (count: number = 50): TimeSlot[] => {
  const statuses: TimeSlotStatus[] = ['ACTIVE', 'INACTIVE', 'FULL', 'CANCELLED'];
  const courses = [
    { id: 1, name: '챔피언십 코스', status: 'ACTIVE' },
    { id: 2, name: '이그제큐티브 코스', status: 'ACTIVE' },
    { id: 3, name: '연습 코스', status: 'ACTIVE' },
  ];
  
  return Array.from({ length: count }, (_, i) => {
    const course = courses[i % courses.length];
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(i / 10));
    
    const startHour = 6 + (i % 12);
    const maxPlayers = Math.floor(Math.random() * 4) + 1;
    const currentBookings = Math.floor(Math.random() * (maxPlayers + 1));
    const basePrice = 50000 + Math.floor(Math.random() * 100000);
    
    return {
      id: i + 1,
      courseId: course.id,
      date: date.toISOString().split('T')[0],
      startTime: `${startHour.toString().padStart(2, '0')}:00`,
      endTime: `${(startHour + 1).toString().padStart(2, '0')}:00`,
      maxPlayers,
      currentBookings,
      availableSlots: maxPlayers - currentBookings,
      price: basePrice,
      status: currentBookings >= maxPlayers ? 'FULL' : statuses[Math.floor(Math.random() * statuses.length)],
      isRecurring: Math.random() > 0.7,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      course,
      revenue: currentBookings * basePrice,
      utilizationRate: Math.round((currentBookings / maxPlayers) * 100),
    };
  });
};

export const generateMockTimeSlotStats = (): TimeSlotStats => ({
  totalSlots: 150,
  activeSlots: 120,
  fullyBookedSlots: 45,
  cancelledSlots: 8,
  totalRevenue: 8500000,
  averageUtilization: 75,
  totalBookings: 89,
  peakHours: ['09:00', '10:00', '14:00', '15:00'],
  averagePrice: 85000,
  topCourses: [
    { courseId: 1, courseName: '챔피언십 코스', totalSlots: 60, revenue: 4200000, utilizationRate: 82 },
    { courseId: 2, courseName: '이그제큐티브 코스', totalSlots: 50, revenue: 2800000, utilizationRate: 68 },
    { courseId: 3, courseName: '연습 코스', totalSlots: 40, revenue: 1500000, utilizationRate: 65 },
  ],
});