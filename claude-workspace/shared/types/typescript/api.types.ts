// API-specific TypeScript types for Park Golf Platform

import {
  BaseEntity,
  User,
  Address,
  Contact,
  Money,
  TimeSlot,
  BookingStatus,
  PaymentStatus,
  Status,
  UserRole
} from './common.types';

// Company Types
export interface Company extends BaseEntity {
  name: string;
  description?: string;
  address: Address;
  contact: Contact;
  logo?: string;
  status: Status;
  courses?: Course[];
}

// Course Types
export interface Course extends BaseEntity {
  companyId: string;
  company?: Company;
  name: string;
  description?: string;
  address: Address;
  contact: Contact;
  facilities: string[];
  amenities: string[];
  holes: Hole[];
  images: string[];
  status: Status;
  rating?: number;
  priceRange: PriceRange;
  operatingHours: OperatingHours[];
}

export interface Hole extends BaseEntity {
  courseId: string;
  holeNumber: number;
  par: number;
  length: number; // in meters
  description?: string;
  teeBoxes: TeeBox[];
}

export interface TeeBox extends BaseEntity {
  holeId: string;
  name: string;
  color: string;
  length: number; // in meters
  slope?: number;
  rating?: number;
}

export interface PriceRange {
  min: Money;
  max: Money;
}

// Schedule Types
export interface WeeklySchedule extends BaseEntity {
  courseId: string;
  dayOfWeek: number; // 0-6
  timeSlots: TimeSlot[];
  basePrice: Money;
  isAvailable: boolean;
}

export interface SpecialSchedule extends BaseEntity {
  courseId: string;
  date: Date;
  timeSlots: TimeSlot[];
  price: Money;
  isAvailable: boolean;
  reason?: string; // holiday, event, etc.
}

// Booking Types
export interface Booking extends BaseEntity {
  userId: string;
  user?: User;
  courseId: string;
  course?: Course;
  date: Date;
  timeSlot: TimeSlot;
  players: number;
  status: BookingStatus;
  totalAmount: Money;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  notes?: string;
  checkinTime?: Date;
  completionTime?: Date;
}

export interface BookingPayment extends BaseEntity {
  bookingId: string;
  booking?: Booking;
  amount: Money;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: Date;
  refundedAt?: Date;
  refundAmount?: Money;
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  KAKAO_PAY = 'KAKAO_PAY',
  NAVER_PAY = 'NAVER_PAY',
  CASH = 'CASH'
}

// Notification Types
export interface NotificationTemplate extends BaseEntity {
  name: string;
  description?: string;
  type: NotificationType;
  subject?: string; // for email
  content: string;
  variables: string[]; // available variables
  isActive: boolean;
}

export interface NotificationLog extends BaseEntity {
  templateId: string;
  template?: NotificationTemplate;
  recipient: string;
  type: NotificationType;
  status: NotificationStatus;
  sentAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED'
}

// Search Types
export interface CourseSearchResult {
  course: Course;
  score: number;
  highlights?: Record<string, string[]>;
  distance?: number; // in kilometers
}

export interface AvailabilitySearchResult {
  courseId: string;
  course?: Course;
  date: Date;
  availableSlots: AvailableSlot[];
}

export interface AvailableSlot {
  timeSlot: TimeSlot;
  price: Money;
  remainingSlots: number;
}

// Dashboard Types
export interface DashboardStats {
  totalBookings: number;
  totalRevenue: Money;
  totalUsers: number;
  totalCourses: number;
  bookingsByStatus: Record<BookingStatus, number>;
  revenueByMonth: MonthlyRevenue[];
  topCourses: CourseStats[];
}

export interface MonthlyRevenue {
  month: string; // YYYY-MM
  revenue: Money;
  bookings: number;
}

export interface CourseStats {
  courseId: string;
  courseName: string;
  bookings: number;
  revenue: Money;
  averageRating: number;
}

// Request DTOs
export interface CreateCourseDto {
  companyId: string;
  name: string;
  description?: string;
  address: Address;
  contact: Contact;
  facilities: string[];
  amenities: string[];
  images: string[];
}

export interface CreateBookingDto {
  userId: string;
  courseId: string;
  date: string; // ISO date string
  timeSlot: TimeSlot;
  players: number;
  notes?: string;
}

export interface UpdateBookingDto {
  status?: BookingStatus;
  players?: number;
  notes?: string;
}

export interface SearchCoursesDto {
  query?: string;
  location?: GeoLocation;
  priceRange?: PriceRange;
  facilities?: string[];
  date?: string;
  players?: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  radius?: number; // in kilometers
}

// Response DTOs
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface BookingResponse extends Booking {
  qrCode?: string;
  cancellationPolicy?: string;
}

export interface AvailabilityResponse {
  courseId: string;
  date: string;
  slots: AvailableSlot[];
}