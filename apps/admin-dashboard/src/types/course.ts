export type CourseStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'PENDING';
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';
export type CourseType = 'CHAMPIONSHIP' | 'PRACTICE' | 'EXECUTIVE' | 'RESORT';

export interface Course {
  id: number;
  name: string;
  companyId: number;
  companyName?: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  imageUrl?: string | null;
  
  // Course specifications
  holeCount: number;
  par: number;
  yardage: number;
  courseRating: number;
  slopeRating: number;
  difficultyLevel: DifficultyLevel;
  courseType: CourseType;
  
  // Facilities
  facilities: string[];
  amenities: string[];
  dressCode?: string;
  
  // Pricing
  weekdayPrice: number;
  weekendPrice: number;
  memberPrice?: number;
  cartFee?: number;
  caddyFee?: number;
  
  // Operational
  status: CourseStatus;
  isActive: boolean;
  openTime: string;
  closeTime: string;
  restDays: string[];
  
  // Analytics
  totalBookings: number;
  monthlyBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageRating: number;
  reviewCount: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  establishedDate?: Date;
}

export interface CourseFilters {
  search: string;
  companyId?: number;
  status?: CourseStatus;
  difficultyLevel?: DifficultyLevel;
  courseType?: CourseType;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  showOnlyActive: boolean;
  priceRange?: {
    min: number;
    max: number;
  };
}

export interface CourseStats {
  totalCourses: number;
  activeCourses: number;
  inactiveCourses: number;
  maintenanceCourses: number;
  totalHoles: number;
  averagePar: number;
  totalRevenue: number;
  averageRevenue: number;
  topPerformer: Course | null;
}

export interface CreateCourseDto {
  name: string;
  companyId: number;
  description?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  imageUrl?: string;
  holeCount: number;
  par: number;
  yardage: number;
  courseRating: number;
  slopeRating: number;
  difficultyLevel: DifficultyLevel;
  courseType: CourseType;
  facilities: string[];
  amenities: string[];
  dressCode?: string;
  weekdayPrice: number;
  weekendPrice: number;
  memberPrice?: number;
  cartFee?: number;
  caddyFee?: number;
  status?: CourseStatus;
  openTime: string;
  closeTime: string;
  restDays: string[];
  establishedDate?: Date;
}

export interface UpdateCourseDto {
  name?: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  imageUrl?: string;
  holeCount?: number;
  par?: number;
  yardage?: number;
  courseRating?: number;
  slopeRating?: number;
  difficultyLevel?: DifficultyLevel;
  courseType?: CourseType;
  facilities?: string[];
  amenities?: string[];
  dressCode?: string;
  weekdayPrice?: number;
  weekendPrice?: number;
  memberPrice?: number;
  cartFee?: number;
  caddyFee?: number;
  status?: CourseStatus;
  openTime?: string;
  closeTime?: string;
  restDays?: string[];
  establishedDate?: Date;
}

export interface Hole {
  id: number;
  courseId: number;
  holeNumber: number;
  par: number;
  yardage: number;
  handicap: number;
  description?: string;
  tips?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingTrend {
  month: string;
  bookings: number;
  revenue: number;
  averageRating: number;
}

// Course constants
export const COURSE_FACILITIES = [
  'driving_range', 'putting_green', 'pro_shop', 'restaurant', 'bar',
  'locker_room', 'spa', 'swimming_pool', 'tennis_court', 'parking',
  'golf_cart', 'caddy_service', 'club_rental', 'golf_lessons'
];

export const COURSE_AMENITIES = [
  'wifi', 'air_conditioning', 'heating', 'shower', 'sauna',
  'conference_room', 'wedding_venue', 'hotel', 'valet_parking',
  'electric_cart', 'gps_cart', 'beverage_cart', 'snack_bar'
];

export const WEEK_DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 
  'friday', 'saturday', 'sunday'
];