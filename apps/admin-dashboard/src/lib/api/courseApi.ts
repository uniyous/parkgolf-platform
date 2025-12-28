/**
 * Course API (Legacy)
 *
 * 이 파일은 하위 호환성을 위해 유지됩니다.
 * 새 코드는 api/courses.ts 또는 api/gamesApi.ts를 사용하세요.
 *
 * - Course/Hole: api/courses.ts 사용
 * - TimeSlot/WeeklySchedule: api/gamesApi.ts 사용
 */

import { apiClient } from './client';
import type { 
  CreateCourseDto, 
  Course, 
  UpdateCourseDto, 
  Company,
  Hole,
  CreateHoleDto,
  UpdateHoleDto,
  TimeSlot,
  CreateTimeSlotDto,
  UpdateTimeSlotDto,
  TimeSlotFilter,
  WeeklySchedule,
  CreateWeeklyScheduleDto,
  TimeSlotAvailability
} from '@/types';

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
      
      // BFF API 응답 구조: {companies: Company[], totalCount: number, totalPages: number, page: number}
      const response = await apiClient.get<{companies: Company[], totalCount: number, totalPages: number, page: number}>('/admin/courses/companies');
      console.log('API Client Response:', response);
      console.log('Response.data:', response.data);
      
      // BFF 응답에서 companies 배열 추출
      const bffResponse = response.data;
      const companies = bffResponse?.companies || [];
      console.log('Final companies array:', companies);
      console.log('Companies count:', companies.length);
      
      return companies;
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
      
      // BFF API 응답 구조: {courses: Course[], totalCount: number, totalPages: number, page: number}
      const response = await apiClient.get<{courses: Course[], totalCount: number, totalPages: number, page: number}>('/admin/courses', params);
      console.log('API Client Response:', response);
      console.log('Response.data:', response.data);
      console.log('Response.data type:', typeof response.data);
      
      // BFF 응답에서 courses 배열 추출
      const bffResponse = response.data;
      const courses = bffResponse?.courses || [];
      console.log('Final courses array:', courses);
      console.log('Courses count:', courses.length);
      console.log('Total count from BFF:', bffResponse?.totalCount);
      
      return {
        data: courses,
        pagination: { 
          page: bffResponse?.page || page, 
          limit, 
          total: bffResponse?.totalCount || courses.length, 
          totalPages: bffResponse?.totalPages || 1 
        }
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
      console.log('Fetching course by ID:', id);
      const response = await apiClient.get<Course>(`/admin/courses/${id}`);
      console.log('getCourseById - API response:', response);
      console.log('getCourseById - course data:', response.data);
      
      // API가 직접 Course 객체를 반환하는 경우
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch course ${id}:`, error);
      throw error;
    }
  },

  // Alias for getCourseById for consistency
  async getCourse(id: number): Promise<Course> {
    return this.getCourseById(id);
  },

  async createCourse(courseData: CreateCourseDto): Promise<Course> {
    try {
      // BFF API 응답 구조: {success: true, data: Course}
      const response = await apiClient.post<{success: boolean, data: Course}>('/admin/courses', courseData);
      
      // BFF 응답에서 data 추출
      const bffResponse = response.data;
      return bffResponse?.data;
    } catch (error) {
      console.error('Failed to create course:', error);
      throw error;
    }
  },

  async updateCourse(id: number, courseData: UpdateCourseDto): Promise<Course> {
    try {
      // BFF API 응답 구조: {success: true, data: Course}
      const response = await apiClient.put<{success: boolean, data: Course}>(`/admin/courses/${id}`, courseData);
      
      // BFF 응답에서 data 추출
      const bffResponse = response.data;
      return bffResponse?.data;
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

  async getHolesByCourse(courseId: number): Promise<Hole[]> {
    try {
      console.log('Fetching holes from BFF API for course:', courseId);
      
      // BFF API 응답 구조: {success: true, data: Hole[]}
      const response = await apiClient.get<{success: boolean, data: Hole[]}>(`/admin/courses/${courseId}/holes`);
      console.log('API Client Response:', response);
      console.log('Response.data:', response.data);
      
      // BFF 응답에서 data 배열 추출
      const bffResponse = response.data;
      const holes = bffResponse?.data || [];
      console.log('Final holes array:', holes);
      console.log('Holes count:', holes.length);
      
      return holes;
    } catch (error: any) {
      console.error(`Failed to fetch holes for course ${courseId}:`, error);
      
      // API 응답에 따른 적절한 에러 처리
      if (error?.status === 404) {
        console.log(`No holes found for course ${courseId}`);
        return []; // 홀이 없는 경우 빈 배열 반환
      }
      
      if (error?.status === 403) {
        console.error(`Access denied to holes for course ${courseId}`);
        throw new Error('홀 정보에 접근할 권한이 없습니다.');
      }
      
      if (error?.status >= 500) {
        console.error(`Server error when fetching holes for course ${courseId}`);
        throw new Error('서버 오류로 홀 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
      }
      
      // 기타 에러의 경우 원본 에러 전파
      throw new Error(error?.message || `코스 ${courseId}의 홀 정보를 불러오는데 실패했습니다.`);
    }
  },

  async createHole(courseId: number, holeData: CreateHoleDto): Promise<Hole> {
    try {
      console.log('Creating hole for course:', courseId, 'with data:', holeData);
      
      // BFF API 응답 구조: {success: true, data: Hole}
      const response = await apiClient.post<{success: boolean, data: Hole}>(`/admin/courses/${courseId}/holes`, holeData);
      console.log('Hole created successfully:', response.data);
      
      // BFF 응답에서 data 추출
      const bffResponse = response.data;
      return bffResponse?.data;
    } catch (error) {
      console.error(`Failed to create hole for course ${courseId}:`, error);
      throw error;
    }
  },

  async updateHole(courseId: number, holeId: number, holeData: UpdateHoleDto): Promise<Hole> {
    try {
      console.log('Updating hole:', holeId, 'for course:', courseId, 'with data:', holeData);
      
      // BFF API 응답 구조: {success: true, data: Hole}
      const response = await apiClient.patch<{success: boolean, data: Hole}>(`/admin/courses/${courseId}/holes/${holeId}`, holeData);
      console.log('Hole updated successfully:', response.data);
      
      // BFF 응답에서 data 추출
      const bffResponse = response.data;
      return bffResponse?.data;
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
  async getTimeSlots(courseId: number, filter?: TimeSlotFilter): Promise<{timeSlots: TimeSlot[], totalCount: number, totalPages: number, page: number}> {
    try {
      console.log('Fetching time slots for course:', courseId, 'with filter:', filter);
      
      const params: any = {};
      if (filter?.dateFrom) params.dateFrom = filter.dateFrom;
      if (filter?.dateTo) params.dateTo = filter.dateTo;
      if (filter?.timeFrom) params.timeFrom = filter.timeFrom;
      if (filter?.timeTo) params.timeTo = filter.timeTo;
      if (filter?.isActive !== undefined) params.isActive = filter.isActive;
      if (filter?.page) params.page = filter.page;
      if (filter?.limit) params.limit = filter.limit;
      
      // Use admin-api endpoint which will communicate with course-service via NATS
      const response = await apiClient.get<{success: boolean, data: {timeSlots: TimeSlot[], totalCount: number, totalPages: number, page: number}}>(`/admin/courses/${courseId}/time-slots`, params);
      console.log('Time slots fetched successfully:', response);
      
      // Extract data from BFF response
      const bffResponse = response.data;
      return bffResponse?.data || {timeSlots: [], totalCount: 0, totalPages: 0, page: 1};
    } catch (error: any) {
      console.error(`Failed to fetch time slots for course ${courseId}:`, error);
      throw error;
    }
  },

  async createTimeSlot(courseId: number, timeSlotData: CreateTimeSlotDto): Promise<TimeSlot> {
    try {
      console.log('Creating time slot for course:', courseId, 'with data:', timeSlotData);
      
      // Use admin-api endpoint which will communicate with course-service via NATS
      const response = await apiClient.post<{success: boolean, data: TimeSlot}>(`/admin/courses/${courseId}/time-slots`, timeSlotData);
      console.log('Time slot created successfully:', response);
      
      // Extract data from BFF response
      const bffResponse = response.data;
      return bffResponse?.data;
    } catch (error: any) {
      console.error(`Failed to create time slot for course ${courseId}:`, error);
      throw error;
    }
  },

  async updateTimeSlot(courseId: number, timeSlotId: number, timeSlotData: UpdateTimeSlotDto): Promise<TimeSlot> {
    try {
      console.log('Updating time slot:', timeSlotId, 'for course:', courseId, 'with data:', timeSlotData);
      
      // Use admin-api endpoint which will communicate with course-service via NATS
      const response = await apiClient.patch<{success: boolean, data: TimeSlot}>(`/admin/courses/${courseId}/time-slots/${timeSlotId}`, timeSlotData);
      console.log('Time slot updated successfully:', response);
      
      // Extract data from BFF response
      const bffResponse = response.data;
      return bffResponse?.data;
    } catch (error: any) {
      console.error(`Failed to update time slot ${timeSlotId} for course ${courseId}:`, error);
      throw error;
    }
  },

  async deleteTimeSlot(courseId: number, timeSlotId: number): Promise<void> {
    try {
      console.log('Deleting time slot:', timeSlotId, 'for course:', courseId);
      
      // Use admin-api endpoint which will communicate with course-service via NATS
      await apiClient.delete(`/admin/courses/${courseId}/time-slots/${timeSlotId}`);
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
      
      // BFF API 응답 구조: {success: boolean, data: WeeklySchedule[]}
      const response = await apiClient.get<{success: boolean, data: WeeklySchedule[]}>(`/admin/courses/${courseId}/weekly-schedules`);
      console.log('API Client Response:', response);
      console.log('Response.data:', response.data);
      
      // BFF 응답에서 data 배열 추출
      const bffResponse = response.data;
      const schedules = bffResponse?.data || [];
      console.log('Final weekly schedules array:', schedules);
      
      return schedules;
    } catch (error) {
      console.error(`Failed to fetch weekly schedule for course ${courseId}:`, error);
      throw error;
    }
  },

  async getWeeklyScheduleById(courseId: number, scheduleId: number): Promise<WeeklySchedule> {
    try {
      console.log('Fetching weekly schedule by ID:', scheduleId, 'for course:', courseId);
      
      // BFF API 응답 구조: {success: boolean, data: WeeklySchedule}
      const response = await apiClient.get<{success: boolean, data: WeeklySchedule}>(`/admin/courses/${courseId}/weekly-schedules/${scheduleId}`);
      console.log('Weekly schedule by ID fetched successfully:', response.data);
      
      // BFF 응답에서 data 추출
      const bffResponse = response.data;
      return bffResponse?.data;
    } catch (error) {
      console.error(`Failed to fetch weekly schedule ${scheduleId} for course ${courseId}:`, error);
      throw error;
    }
  },

  async getWeeklyScheduleByDay(courseId: number, dayOfWeek: number): Promise<WeeklySchedule> {
    try {
      console.log('Fetching weekly schedule by day:', dayOfWeek, 'for course:', courseId);
      
      // BFF API 응답 구조: {success: boolean, data: WeeklySchedule}
      const response = await apiClient.get<{success: boolean, data: WeeklySchedule}>(`/admin/courses/${courseId}/weekly-schedules/day/${dayOfWeek}`);
      console.log('Weekly schedule by day fetched successfully:', response.data);
      
      // BFF 응답에서 data 추출
      const bffResponse = response.data;
      return bffResponse?.data;
    } catch (error) {
      console.error(`Failed to fetch weekly schedule for day ${dayOfWeek} for course ${courseId}:`, error);
      throw error;
    }
  },

  async createWeeklySchedule(courseId: number, scheduleData: CreateWeeklyScheduleDto): Promise<WeeklySchedule> {
    try {
      console.log('Creating weekly schedule for course:', courseId, 'with data:', scheduleData);
      
      // BFF API 응답 구조: {success: boolean, data: WeeklySchedule}
      const response = await apiClient.post<{success: boolean, data: WeeklySchedule}>(`/admin/courses/${courseId}/weekly-schedules`, scheduleData);
      console.log('Weekly schedule created successfully:', response.data);
      
      // BFF 응답에서 data 추출
      const bffResponse = response.data;
      return bffResponse?.data;
    } catch (error) {
      console.error(`Failed to create weekly schedule for course ${courseId}:`, error);
      throw error;
    }
  },

  async updateWeeklySchedule(courseId: number, scheduleId: number, updateData: Partial<CreateWeeklyScheduleDto>): Promise<WeeklySchedule> {
    try {
      console.log('Updating weekly schedule:', scheduleId, 'for course:', courseId, 'with data:', updateData);
      
      // BFF API 응답 구조: {success: boolean, data: WeeklySchedule}
      const response = await apiClient.patch<{success: boolean, data: WeeklySchedule}>(`/admin/courses/${courseId}/weekly-schedules/${scheduleId}`, updateData);
      console.log('Weekly schedule updated successfully:', response.data);
      
      // BFF 응답에서 data 추출
      const bffResponse = response.data;
      return bffResponse?.data;
    } catch (error) {
      console.error(`Failed to update weekly schedule ${scheduleId} for course ${courseId}:`, error);
      throw error;
    }
  },

  async deleteWeeklySchedule(courseId: number, scheduleId: number): Promise<void> {
    try {
      console.log('Deleting weekly schedule:', scheduleId, 'for course:', courseId);
      await apiClient.delete(`/admin/courses/${courseId}/weekly-schedules/${scheduleId}`);
      console.log('Weekly schedule deleted successfully');
    } catch (error) {
      console.error(`Failed to delete weekly schedule ${scheduleId} for course ${courseId}:`, error);
      throw error;
    }
  },

  async updateBulkWeeklySchedule(courseId: number, scheduleData: CreateWeeklyScheduleDto[]): Promise<WeeklySchedule[]> {
    try {
      console.log('Updating bulk weekly schedule for course:', courseId, 'with data:', scheduleData);
      // Weekly schedule는 개별적으로 생성/수정해야 합니다
      const results: WeeklySchedule[] = [];
      
      for (const schedule of scheduleData) {
        try {
          // 먼저 해당 요일의 기존 스케줄이 있는지 확인
          const existingSchedule = await this.getWeeklyScheduleByDay(courseId, schedule.dayOfWeek).catch(() => null);
          
          if (existingSchedule) {
            // 기존 스케줄이 있으면 수정
            const updated = await this.updateWeeklySchedule(courseId, existingSchedule.id, {
              openTime: schedule.openTime,
              closeTime: schedule.closeTime,
              isActive: schedule.isActive
            });
            results.push(updated);
          } else {
            // 없으면 새로 생성
            const created = await this.createWeeklySchedule(courseId, {
              courseId: courseId,
              dayOfWeek: schedule.dayOfWeek,
              openTime: schedule.openTime,
              closeTime: schedule.closeTime,
              isActive: schedule.isActive
            });
            results.push(created);
          }
        } catch (error) {
          console.error(`Failed to update schedule for day ${schedule.dayOfWeek}:`, error);
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Failed to update bulk weekly schedule for course ${courseId}:`, error);
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
      
      // Use admin-api endpoint which will communicate with course-service via NATS
      const response = await apiClient.post<{success: boolean, data: TimeSlot[]}>(`/admin/courses/${courseId}/time-slots/bulk`, { timeSlots: timeSlotsData });
      console.log('Bulk time slots created successfully:', response);
      
      // Extract data from BFF response
      const bffResponse = response.data;
      return bffResponse?.data || [];
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

// Weekly Schedule legacy exports
export const fetchWeeklySchedule = courseApi.getWeeklySchedule;
export const updateWeeklySchedule = courseApi.updateBulkWeeklySchedule;

// 이전 이름 호환성 유지
export const golfCourseApi = courseApi;