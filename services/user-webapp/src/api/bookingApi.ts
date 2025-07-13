import { authApi } from './authApi';

export interface Course {
  id: number;
  name: string;
  location: string;
  description: string;
  rating: number;
  pricePerHour: number;
  imageUrl: string;
  amenities: string[];
  openTime: string;
  closeTime: string;
}

export interface TimeSlot {
  id: number;
  time: string;
  date: string;
  available: boolean;
  price: number;
  isPremium?: boolean;
  remaining: number;
}

export interface CreateBookingRequest {
  courseId: number;
  bookingDate: string;
  timeSlot: string;
  playerCount: number;
  paymentMethod?: string;
  specialRequests?: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
}

export interface BookingResponse {
  id: number;
  bookingNumber: string;
  userId: number;
  courseId: number;
  courseName: string;
  courseLocation: string;
  bookingDate: string;
  timeSlot: string;
  playerCount: number;
  pricePerPerson: number;
  serviceFee: number;
  totalPrice: number;
  status: string;
  paymentMethod?: string;
  specialRequests?: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  createdAt: string;
  updatedAt: string;
}

// Mock data for development (실제 API 연동 전까지 사용)
const mockCourses: Course[] = [
  {
    id: 1,
    name: '그린밸리 골프클럽',
    location: '경기도 용인시',
    description: '아름다운 자연 속 프리미엄 18홀 골프코스',
    rating: 4.8,
    pricePerHour: 80000,
    imageUrl: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&q=80',
    amenities: ['클럽하우스', '레스토랑', '프로샵', '주차장'],
    openTime: '06:00',
    closeTime: '18:00',
  },
  {
    id: 2,
    name: '선셋힐 컨트리클럽',
    location: '강원도 춘천시',
    description: '석양이 아름다운 언덕 위의 골프코스',
    rating: 4.6,
    pricePerHour: 65000,
    imageUrl: 'https://images.unsplash.com/photo-1587174486073-ae5e5cec4cdf?w=800&q=80',
    amenities: ['클럽하우스', '레스토랑', '연습장'],
    openTime: '06:30',
    closeTime: '17:30',
  },
  {
    id: 3,
    name: '오션뷰 리조트',
    location: '부산광역시 기장군',
    description: '바다가 보이는 럭셔리 골프 리조트',
    rating: 4.9,
    pricePerHour: 120000,
    imageUrl: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80',
    amenities: ['클럽하우스', '레스토랑', '프로샵', '호텔', '스파'],
    openTime: '06:00',
    closeTime: '19:00',
  },
];

class BookingApiService {
  private baseURL = process.env.REACT_APP_USER_API_URL || 'http://localhost:3092';

  // 코스 검색 (현재는 mock 데이터 사용)
  async searchCourses(filters: {
    keyword?: string;
    location?: string;
    priceRange?: [number, number];
    rating?: number;
  }): Promise<Course[]> {
    // TODO: 실제 API 호출로 교체
    // const response = await authApi.get('/courses/search', { params: filters });
    // return response.data;
    
    // Mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        let filteredCourses = [...mockCourses];
        
        if (filters.keyword) {
          const keyword = filters.keyword.toLowerCase();
          filteredCourses = filteredCourses.filter(course =>
            course.name.toLowerCase().includes(keyword) ||
            course.location.toLowerCase().includes(keyword) ||
            course.amenities.some(amenity => amenity.toLowerCase().includes(keyword))
          );
        }
        
        if (filters.priceRange) {
          filteredCourses = filteredCourses.filter(course =>
            course.pricePerHour >= filters.priceRange![0] &&
            course.pricePerHour <= filters.priceRange![1]
          );
        }
        
        if (filters.rating) {
          filteredCourses = filteredCourses.filter(course =>
            course.rating >= filters.rating!
          );
        }
        
        resolve(filteredCourses);
      }, 500);
    });
  }

  // 타임슬롯 가용성 조회
  async getTimeSlotAvailability(courseId: number, date: string): Promise<TimeSlot[]> {
    try {
      const response = await authApi.get(`/bookings/courses/${courseId}/time-slots`, {
        params: { date }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get time slot availability:', error);
      
      // Fallback to mock data
      const course = mockCourses.find(c => c.id === courseId);
      if (!course) return [];
      
      const slots: TimeSlot[] = [];
      const startHour = parseInt(course.openTime.split(':')[0]);
      const endHour = parseInt(course.closeTime.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const timeString = `${hour.toString().padStart(2, '0')}:00`;
        const isAvailable = Math.random() > 0.3;
        const isPremium = hour >= 12 && hour <= 16;
        const basePrice = course.pricePerHour;
        
        slots.push({
          id: hour + (courseId * 100),
          time: timeString,
          date: date,
          available: isAvailable,
          price: isPremium ? Math.floor(basePrice * 1.2) : basePrice,
          isPremium,
          remaining: Math.floor(Math.random() * 4) + 1
        });
      }
      
      return slots.filter(slot => slot.available);
    }
  }

  // 예약 생성
  async createBooking(bookingData: CreateBookingRequest): Promise<BookingResponse> {
    try {
      const response = await authApi.post('/bookings', bookingData);
      return response.data;
    } catch (error) {
      console.error('Failed to create booking:', error);
      throw new Error('예약 생성에 실패했습니다.');
    }
  }

  // 내 예약 목록 조회
  async getMyBookings(): Promise<BookingResponse[]> {
    try {
      const response = await authApi.get('/bookings');
      return response.data;
    } catch (error) {
      console.error('Failed to get my bookings:', error);
      throw new Error('예약 목록 조회에 실패했습니다.');
    }
  }

  // 예약번호로 예약 조회
  async getBookingByNumber(bookingNumber: string): Promise<BookingResponse> {
    try {
      const response = await authApi.get(`/bookings/number/${bookingNumber}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get booking by number:', error);
      throw new Error('예약 조회에 실패했습니다.');
    }
  }

  // 예약 취소
  async cancelBooking(bookingId: number, reason?: string): Promise<BookingResponse> {
    try {
      const response = await authApi.delete(`/bookings/${bookingId}`, {
        data: { reason }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      throw new Error('예약 취소에 실패했습니다.');
    }
  }

  // 예약 수정
  async updateBooking(bookingId: number, updates: {
    playerCount?: number;
    specialRequests?: string;
    userPhone?: string;
  }): Promise<BookingResponse> {
    try {
      const response = await authApi.put(`/bookings/${bookingId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update booking:', error);
      throw new Error('예약 수정에 실패했습니다.');
    }
  }
}

export const bookingApi = new BookingApiService();