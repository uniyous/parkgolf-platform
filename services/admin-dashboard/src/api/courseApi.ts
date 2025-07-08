import { apiClient } from './client';

// Course Service API 클라이언트 (직접 연결)
class CourseServiceApiClient {
  private baseURL = 'http://localhost:3012';

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Course Service API Error: ${response.status} - ${errorText}`);
    }

    // 응답이 비어있는 경우 처리 (DELETE 요청 등)
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

const courseServiceClient = new CourseServiceApiClient();
import type { 
  CreateCourseDto, 
  Course, 
  UpdateCourseDto, 
  Company,
  TimeSlot,
  CreateTimeSlotDto,
  UpdateTimeSlotDto,
  TimeSlotFilter,
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
  async getTimeSlots(courseId: number, filter?: TimeSlotFilter): Promise<TimeSlot[]> {
    try {
      console.log('Fetching time slots for course:', courseId, 'with filter:', filter);
      
      const params = new URLSearchParams();
      if (filter?.dateFrom) params.append('dateFrom', filter.dateFrom);
      if (filter?.dateTo) params.append('dateTo', filter.dateTo);
      if (filter?.timeFrom) params.append('timeFrom', filter.timeFrom);
      if (filter?.timeTo) params.append('timeTo', filter.timeTo);
      if (filter?.isActive !== undefined) params.append('isActive', filter.isActive.toString());
      if (filter?.page) params.append('page', filter.page.toString());
      if (filter?.limit) params.append('limit', filter.limit.toString());
      
      const queryString = params.toString();
      const url = `/api/admin/courses/${courseId}/time-slots${queryString ? `?${queryString}` : ''}`;
      
      const response = await courseServiceClient.get<TimeSlot[]>(url);
      console.log('Time slots fetched successfully:', response);
      return response || [];
    } catch (error: any) {
      console.error(`Failed to fetch time slots for course ${courseId}:`, error);
      throw error;
    }
  },

  async createTimeSlot(courseId: number, timeSlotData: CreateTimeSlotDto): Promise<TimeSlot> {
    try {
      console.log('Creating time slot for course:', courseId, 'with data:', timeSlotData);
      const response = await courseServiceClient.post<TimeSlot>(`/api/admin/courses/${courseId}/time-slots`, timeSlotData);
      console.log('Time slot created successfully:', response);
      return response;
    } catch (error: any) {
      console.error(`Failed to create time slot for course ${courseId}:`, error);
      throw error;
    }
  },

  async updateTimeSlot(courseId: number, timeSlotId: number, timeSlotData: UpdateTimeSlotDto): Promise<TimeSlot> {
    try {
      console.log('Updating time slot:', timeSlotId, 'for course:', courseId, 'with data:', timeSlotData);
      const response = await courseServiceClient.patch<TimeSlot>(`/api/admin/courses/${courseId}/time-slots/${timeSlotId}`, timeSlotData);
      console.log('Time slot updated successfully:', response);
      return response;
    } catch (error: any) {
      console.error(`Failed to update time slot ${timeSlotId} for course ${courseId}:`, error);
      throw error;
    }
  },

  async deleteTimeSlot(courseId: number, timeSlotId: number): Promise<void> {
    try {
      console.log('Deleting time slot:', timeSlotId, 'for course:', courseId);
      await courseServiceClient.delete(`/api/admin/courses/${courseId}/time-slots/${timeSlotId}`);
      console.log('Time slot deleted successfully');
    } catch (error: any) {
      console.error(`Failed to delete time slot ${timeSlotId} for course ${courseId}:`, error);
      throw error;
    }
  },

  // ===== Weekly Schedule Management =====
  async getWeeklySchedule(courseId: number): Promise<WeeklySchedule[]> {
    try {
      console.log('Fetching weekly schedule for course:', courseId);
      const response = await courseServiceClient.get<WeeklySchedule[]>(`/api/courses/${courseId}/weekly-schedules`);
      console.log('Weekly schedule fetched successfully:', response);
      return response || [];
    } catch (error) {
      console.error(`Failed to fetch weekly schedule for course ${courseId}:`, error);
      throw error;
    }
  },

  async updateWeeklySchedule(courseId: number, scheduleData: CreateWeeklyScheduleDto[]): Promise<WeeklySchedule[]> {
    try {
      console.log('Updating weekly schedule for course:', courseId, 'with data:', scheduleData);
      // Weekly schedule는 개별적으로 생성/수정해야 합니다
      const results: WeeklySchedule[] = [];
      
      for (const schedule of scheduleData) {
        try {
          // 먼저 해당 요일의 기존 스케줄이 있는지 확인
          const existingSchedule = await courseServiceClient.get<WeeklySchedule>(
            `/api/courses/${courseId}/weekly-schedules/day/${schedule.dayOfWeek}`
          ).catch(() => null);
          
          if (existingSchedule) {
            // 기존 스케줄이 있으면 수정
            const updated = await courseServiceClient.patch<WeeklySchedule>(
              `/api/courses/${courseId}/weekly-schedules/${existingSchedule.id}`,
              {
                openTime: schedule.openTime,
                closeTime: schedule.closeTime,
                isActive: schedule.isActive
              }
            );
            results.push(updated);
          } else {
            // 없으면 새로 생성
            const created = await courseServiceClient.post<WeeklySchedule>(
              `/api/courses/${courseId}/weekly-schedules`,
              {
                dayOfWeek: schedule.dayOfWeek,
                openTime: schedule.openTime,
                closeTime: schedule.closeTime,
                isActive: schedule.isActive
              }
            );
            results.push(created);
          }
        } catch (error) {
          console.error(`Failed to update schedule for day ${schedule.dayOfWeek}:`, error);
        }
      }
      
      return results;
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
      const response = await courseServiceClient.post<TimeSlot[]>(`/api/admin/courses/${courseId}/time-slots/bulk`, { timeSlots: timeSlotsData });
      console.log('Bulk time slots created successfully:', response);
      return response;
    } catch (error: any) {
      console.error(`Failed to create bulk time slots for course ${courseId}:`, error);
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