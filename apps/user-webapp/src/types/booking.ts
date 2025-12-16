export interface Course {
  id: number;
  name: string;
  companyName?: string;
  description: string;
  pricePerHour: number;
  location: string;
  address?: string;
  rating: number;
  imageUrl?: string;
  amenities: string[];
  openTime: string;
  closeTime: string;
  isAvailable: boolean;
  holes?: number;
  par?: number;
  length?: number;
  type?: 'regular' | 'public' | 'premium';
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  price: number;
  maxPlayers: number;
  currentBookings: number;
}

export interface EnhancedTimeSlot {
  id: number;
  time: string;
  isAvailable: boolean;
  price: number;
  isPremium?: boolean;
}

export interface BookingRequest {
  courseId: number;
  userId: number;
  bookingDate: string;
  timeSlot: string;
  playerCount: number;
  totalPrice: number;
  notes?: string;
}

export interface Booking {
  id: number;
  courseId: number;
  userId: number;
  courseName: string;
  bookingDate: Date;
  timeSlot: string;
  playerCount: number;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}