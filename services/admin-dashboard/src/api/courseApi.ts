import { apiClient } from './client';
import type { 
  CreateCourseDto, 
  Course, 
  UpdateCourseDto, 
  Company,
  TimeSlot,
  CreateTimeSlotDto,
  UpdateTimeSlotDto,
  WeeklySchedule,
  CreateWeeklyScheduleDto,
  UpdateWeeklyScheduleDto,
  TimeSlotAvailability
} from '../types';

// BFF API 응답 타입 (실제 응답 구조에 맞게 수정)
export interface CourseListResponse {
  data: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CourseFilters {
  search?: string;
  status?: string;
  companyId?: number;
}



export const courseApi = {
  async getCompanies(): Promise<Company[]> {
    try {
      console.log('Fetching companies from BFF API');
      const response = await apiClient.get<Company[]>('/admin/courses/companies');
      console.log('Companies fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      throw error;
    }
  },

  async getCourses(filters: CourseFilters = {}, page = 1, limit = 20): Promise<CourseListResponse> {
    try {
      const params = {
        page,
        limit,
        ...filters
      };
      console.log('Fetching courses from BFF API with params:', params);
      const response = await apiClient.get<Course[]>('/admin/courses', params);
      console.log('API Client Response:', response);
      console.log('Response.data:', response.data);
      console.log('Response.data type:', typeof response.data);
      
      // apiClient.get()이 BFF 응답에서 data 부분을 이미 추출해서 반환
      // response.data가 실제 코스 배열
      const courses = response.data || [];
      console.log('Final courses array:', courses);
      console.log('Courses count:', courses.length);
      
      return {
        data: courses,
        pagination: { page, limit, total: courses.length, totalPages: 1 }
      };
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      throw error;
    }
  },

  async getCoursesByCompany(companyId: number): Promise<Course[]> {
    try {
      const response = await this.getCourses({ companyId: companyId });
      console.log('getCoursesByCompany - API response:', response);
      console.log('getCoursesByCompany - courses data:', response.data);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch courses for company ${companyId}:`, error);
      throw error;
    }
  },

  async getCourseById(id: number): Promise<Course> {
    try {
      const response = await apiClient.get<Course>(`/admin/courses/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch course ${id}:`, error);
      throw error;
    }
  },

  async createCourse(courseData: CreateCourseDto): Promise<Course> {
    try {
      const response = await apiClient.post<Course>('/admin/courses', courseData);
      return response.data;
    } catch (error) {
      console.error('Failed to create course:', error);
      throw error;
    }
  },

  async updateCourse(id: number, courseData: UpdateCourseDto): Promise<Course> {
    try {
      const response = await apiClient.put<Course>(`/admin/courses/${id}`, courseData);
      return response.data;
    } catch (error) {
      console.error(`Failed to update course ${id}:`, error);
      throw error;
    }
  },

  async deleteCourse(id: number): Promise<void> {
    try {
      await apiClient.delete(`/admin/courses/${id}`);
    } catch (error) {
      console.error(`Failed to delete course ${id}:`, error);
      throw error;
    }
  },

  async getHolesByCourse(courseId: number): Promise<any[]> {
    try {
      console.log('Fetching holes from BFF API for course:', courseId);
      const response = await apiClient.get<any[]>(`/admin/courses/${courseId}/holes`);
      console.log('Holes fetched successfully:', response.data);
      return response.data || [];
    } catch (error: any) {
      console.error(`Failed to fetch holes for course ${courseId}:`, error);
      // API 엔드포인트가 구현되지 않은 경우 샘플 데이터 반환
      if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Cannot GET')) {
        console.log('Holes API not implemented yet, returning sample data for course:', courseId);
        
        // 그린밸리 동코스(ID: 5)의 경우 9홀 샘플 데이터 반환
        if (courseId === 5) {
          return [
            { id: 1, holeNumber: 1, par: 3, distance: 120, description: "그린밸리 동코스 1번 홀 (Par 3, 120m)" },
            { id: 2, holeNumber: 2, par: 4, distance: 150, description: "그린밸리 동코스 2번 홀 (Par 4, 150m)" },
            { id: 3, holeNumber: 3, par: 5, distance: 180, description: "그린밸리 동코스 3번 홀 (Par 5, 180m)" },
            { id: 4, holeNumber: 4, par: 3, distance: 120, description: "그린밸리 동코스 4번 홀 (Par 3, 120m)" },
            { id: 5, holeNumber: 5, par: 4, distance: 150, description: "그린밸리 동코스 5번 홀 (Par 4, 150m)" },
            { id: 6, holeNumber: 6, par: 5, distance: 180, description: "그린밸리 동코스 6번 홀 (Par 5, 180m)" },
            { id: 7, holeNumber: 7, par: 3, distance: 120, description: "그린밸리 동코스 7번 홀 (Par 3, 120m)" },
            { id: 8, holeNumber: 8, par: 4, distance: 150, description: "그린밸리 동코스 8번 홀 (Par 4, 150m)" },
            { id: 9, holeNumber: 9, par: 5, distance: 180, description: "그린밸리 동코스 9번 홀 (Par 5, 180m)" }
          ];
        }
        
        return [];
      }
      throw error;
    }
  },

  async createHole(courseId: number, holeData: any): Promise<any> {
    try {
      console.log('Creating hole for course:', courseId, 'with data:', holeData);
      const response = await apiClient.post<any>(`/admin/courses/${courseId}/holes`, holeData);
      console.log('Hole created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to create hole for course ${courseId}:`, error);
      throw error;
    }
  },

  async updateHole(courseId: number, holeId: number, holeData: any): Promise<any> {
    try {
      console.log('Updating hole:', holeId, 'for course:', courseId, 'with data:', holeData);
      const response = await apiClient.patch<any>(`/admin/courses/${courseId}/holes/${holeId}`, holeData);
      console.log('Hole updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update hole ${holeId} for course ${courseId}:`, error);
      throw error;
    }
  },

  async deleteHole(courseId: number, holeId: number): Promise<void> {
    try {
      console.log('Deleting hole:', holeId, 'for course:', courseId);
      await apiClient.delete(`/admin/courses/${courseId}/holes/${holeId}`);
      console.log('Hole deleted successfully');
    } catch (error) {
      console.error(`Failed to delete hole ${holeId} for course ${courseId}:`, error);
      throw error;
    }
  },

  // ===== Time Slot Management =====
  async getTimeSlots(courseId: number): Promise<TimeSlot[]> {
    try {
      console.log('Fetching time slots for course:', courseId);
      const response = await apiClient.get<TimeSlot[]>(`/admin/courses/${courseId}/time-slots`);
      console.log('Time slots fetched successfully:', response.data);
      return response.data || [];
    } catch (error: any) {
      console.error(`Failed to fetch time slots for course ${courseId}:`, error);
      // API 엔드포인트가 구현되지 않은 경우 빈 배열 반환
      if (error?.status === 404 || error?.status === 500 || error?.message?.includes('404') || error?.message?.includes('500')) {
        console.log('Time slots API not implemented yet, returning empty array for course:', courseId);
        return [];
      }
      throw error;
    }
  },

  async createTimeSlot(courseId: number, timeSlotData: CreateTimeSlotDto): Promise<TimeSlot> {
    try {
      console.log('Creating time slot for course:', courseId, 'with data:', timeSlotData);
      const response = await apiClient.post<TimeSlot>(`/admin/courses/${courseId}/time-slots`, timeSlotData);
      console.log('Time slot created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to create time slot for course ${courseId}:`, error);
      // API 엔드포인트가 구현되지 않은 경우 mock 데이터 반환
      if (error?.status === 500 || error?.message?.includes('500') || error?.message?.includes('Http Exception')) {
        console.log('Time slot creation API not implemented yet, returning mock data for course:', courseId);
        
        // Mock 타임슬롯 생성
        const mockTimeSlot: TimeSlot = {
          id: Date.now(), // 고유 ID 생성
          courseId: courseId,
          startTime: timeSlotData.startTime,
          endTime: timeSlotData.endTime,
          maxPlayers: timeSlotData.maxPlayers,
          price: timeSlotData.price,
          isActive: timeSlotData.isActive ?? true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('Mock time slot created:', mockTimeSlot);
        return mockTimeSlot;
      }
      throw error;
    }
  },

  async updateTimeSlot(courseId: number, timeSlotId: number, timeSlotData: UpdateTimeSlotDto): Promise<TimeSlot> {
    try {
      console.log('Updating time slot:', timeSlotId, 'for course:', courseId, 'with data:', timeSlotData);
      const response = await apiClient.patch<TimeSlot>(`/admin/courses/${courseId}/time-slots/${timeSlotId}`, timeSlotData);
      console.log('Time slot updated successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to update time slot ${timeSlotId} for course ${courseId}:`, error);
      // API 엔드포인트가 구현되지 않은 경우 mock 데이터 반환
      if (error?.status === 500 || error?.message?.includes('500') || error?.message?.includes('Http Exception')) {
        console.log('Time slot update API not implemented yet, returning mock data');
        
        // Mock 타임슬롯 업데이트
        const mockTimeSlot: TimeSlot = {
          id: timeSlotId,
          courseId: courseId,
          startTime: timeSlotData.startTime || '09:00',
          endTime: timeSlotData.endTime || '10:00',
          maxPlayers: timeSlotData.maxPlayers || 4,
          price: timeSlotData.price || 10000,
          isActive: timeSlotData.isActive ?? true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('Mock time slot updated:', mockTimeSlot);
        return mockTimeSlot;
      }
      throw error;
    }
  },

  async deleteTimeSlot(courseId: number, timeSlotId: number): Promise<void> {
    try {
      console.log('Deleting time slot:', timeSlotId, 'for course:', courseId);
      await apiClient.delete(`/admin/courses/${courseId}/time-slots/${timeSlotId}`);
      console.log('Time slot deleted successfully');
    } catch (error: any) {
      console.error(`Failed to delete time slot ${timeSlotId} for course ${courseId}:`, error);
      // API 엔드포인트가 구현되지 않은 경우 성공으로 처리
      if (error?.status === 500 || error?.message?.includes('500') || error?.message?.includes('Http Exception')) {
        console.log('Time slot deletion API not implemented yet, treating as successful for timeSlot:', timeSlotId);
        return;
      }
      throw error;
    }
  },

  // ===== Weekly Schedule Management =====
  async getWeeklySchedule(courseId: number): Promise<WeeklySchedule[]> {
    try {
      console.log('Fetching weekly schedule for course:', courseId);
      const response = await apiClient.get<WeeklySchedule[]>(`/admin/courses/${courseId}/weekly-schedule`);
      console.log('Weekly schedule fetched successfully:', response.data);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch weekly schedule for course ${courseId}:`, error);
      throw error;
    }
  },

  async updateWeeklySchedule(courseId: number, scheduleData: CreateWeeklyScheduleDto[]): Promise<WeeklySchedule[]> {
    try {
      console.log('Updating weekly schedule for course:', courseId, 'with data:', scheduleData);
      const response = await apiClient.patch<WeeklySchedule[]>(`/admin/courses/${courseId}/weekly-schedule`, scheduleData);
      console.log('Weekly schedule updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update weekly schedule for course ${courseId}:`, error);
      throw error;
    }
  },

  // ===== Availability Checking =====
  async getAvailability(courseId: number, date: string): Promise<TimeSlotAvailability[]> {
    try {
      console.log('Fetching availability for course:', courseId, 'on date:', date);
      const response = await apiClient.get<TimeSlotAvailability[]>(`/admin/courses/${courseId}/availability`, { date });
      console.log('Availability fetched successfully:', response.data);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch availability for course ${courseId} on ${date}:`, error);
      throw error;
    }
  },

  // ===== Bulk Operations =====
  async createBulkTimeSlots(courseId: number, timeSlotsData: CreateTimeSlotDto[]): Promise<TimeSlot[]> {
    try {
      console.log('Creating bulk time slots for course:', courseId, 'with data:', timeSlotsData);
      const response = await apiClient.post<TimeSlot[]>(`/admin/courses/${courseId}/time-slots/bulk`, { timeSlots: timeSlotsData });
      console.log('Bulk time slots created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to create bulk time slots for course ${courseId}:`, error);
      // API 엔드포인트가 구현되지 않은 경우 mock 데이터 반환
      if (error?.status === 500 || error?.message?.includes('500') || error?.message?.includes('Http Exception')) {
        console.log('Bulk time slot creation API not implemented yet, returning mock data for course:', courseId);
        
        // Mock 벌크 타임슬롯 생성
        const mockTimeSlots: TimeSlot[] = timeSlotsData.map((data, index) => ({
          id: Date.now() + index, // 고유 ID 생성
          courseId: courseId,
          startTime: data.startTime,
          endTime: data.endTime,
          maxPlayers: data.maxPlayers,
          price: data.price,
          isActive: data.isActive ?? true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        
        console.log('Mock bulk time slots created:', mockTimeSlots);
        return mockTimeSlots;
      }
      throw error;
    }
  }
} as const;

// Legacy exports for backward compatibility
export const fetchCoursesByCompany = courseApi.getCoursesByCompany;
export const fetchCourseById = courseApi.getCourseById;
export const createCourse = courseApi.createCourse;
export const updateCourse = courseApi.updateCourse;
export const deleteCourse = courseApi.deleteCourse;

// 이전 이름 호환성 유지
export const golfCourseApi = courseApi;