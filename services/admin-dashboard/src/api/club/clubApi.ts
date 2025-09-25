import { apiClient } from '../client';
import type {
  Club,
  Course,
  Hole,
  CourseCombo,
  GolfTimeSlot,
  ClubFilters,
  TimeSlotFilters,
  ClubListResponse,
  TimeSlotListResponse,
  CreateClubDto,
  UpdateClubDto,
  CreateCourseDto,
  UpdateCourseDto,
  CreateHoleDto,
  UpdateHoleDto,
  CreateTimeSlotBulkDto,
  ClubStats,
  ComboAnalytics
} from '../../types/club';

class ClubApi {
  private baseURL = '/admin/club';

  // =================== 골프장 관리 ===================
  
  /**
   * 골프장 목록 조회
   */
  async getClubs(filters: ClubFilters = {}, page = 1, limit = 20): Promise<ClubListResponse> {
    try {
      const params = {
        page,
        limit,
        ...filters
      };
      
      const response = await apiClient.get<{data: Club[], total: number, totalPages: number, page: number, limit: number}>(`${this.baseURL}/clubs`, params);
      
      return {
        data: response.data?.data || [],
        pagination: {
          page: response.data?.page || page,
          limit: response.data?.limit || limit,
          total: response.data?.total || 0,
          totalPages: response.data?.totalPages || 1
        }
      };
    } catch (error) {
      console.error('Failed to fetch clubs:', error);
      throw error;
    }
  }

  /**
   * 골프장 상세 조회
   */
  async getClubById(id: number): Promise<Club> {
    try {
      const response = await apiClient.get<Club>(`${this.baseURL}/clubs/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch club ${id}:`, error);
      throw error;
    }
  }

  /**
   * 골프장 생성
   */
  async createClub(data: CreateClubDto): Promise<Club> {
    try {
      const response = await apiClient.post<Club>(`${this.baseURL}/clubs`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to create club:', error);
      throw error;
    }
  }

  /**
   * 골프장 수정
   */
  async updateClub(id: number, data: UpdateClubDto): Promise<Club> {
    try {
      const response = await apiClient.put<Club>(`${this.baseURL}/clubs/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update club ${id}:`, error);
      throw error;
    }
  }

  /**
   * 골프장 삭제
   */
  async deleteClub(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.baseURL}/clubs/${id}`);
    } catch (error) {
      console.error(`Failed to delete club ${id}:`, error);
      throw error;
    }
  }

  // =================== 코스 관리 (9홀 단위) ===================

  /**
   * 특정 골프장의 코스 목록 조회
   */
  async getCoursesByClub(clubId: number): Promise<Course[]> {
    try {
      const response = await apiClient.get<{data: Course[]}>(`${this.baseURL}/clubs/${clubId}/courses`);
      return response.data?.data || [];
    } catch (error) {
      console.error(`Failed to fetch courses for club ${clubId}:`, error);
      throw error;
    }
  }

  /**
   * 코스 상세 조회
   */
  async getCourseById(id: number): Promise<Course> {
    try {
      const response = await apiClient.get<Course>(`${this.baseURL}/courses/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch course ${id}:`, error);
      throw error;
    }
  }

  /**
   * 코스 생성 (9홀)
   */
  async createCourse(data: CreateCourseDto): Promise<Course> {
    try {
      const response = await apiClient.post<Course>(`${this.baseURL}/courses`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to create course:', error);
      throw error;
    }
  }

  /**
   * 코스 수정
   */
  async updateCourse(id: number, data: UpdateCourseDto): Promise<Course> {
    try {
      const response = await apiClient.patch<Course>(`${this.baseURL}/courses/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update course ${id}:`, error);
      throw error;
    }
  }

  /**
   * 코스 삭제
   */
  async deleteCourse(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.baseURL}/courses/${id}`);
    } catch (error) {
      console.error(`Failed to delete course ${id}:`, error);
      throw error;
    }
  }

  // =================== 홀 관리 ===================

  /**
   * 특정 코스의 홀 목록 조회 (9개)
   */
  async getHolesByCourse(courseId: number): Promise<Hole[]> {
    try {
      const response = await apiClient.get<{data: Hole[]}>(`${this.baseURL}/courses/${courseId}/holes`);
      return response.data?.data || [];
    } catch (error) {
      console.error(`Failed to fetch holes for course ${courseId}:`, error);
      throw error;
    }
  }

  /**
   * 홀 생성
   */
  async createHole(data: CreateHoleDto): Promise<Hole> {
    try {
      const response = await apiClient.post<Hole>(`${this.baseURL}/holes`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to create hole:', error);
      throw error;
    }
  }

  /**
   * 홀 수정
   */
  async updateHole(id: number, data: UpdateHoleDto): Promise<Hole> {
    try {
      const response = await apiClient.patch<Hole>(`${this.baseURL}/holes/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update hole ${id}:`, error);
      throw error;
    }
  }

  /**
   * 홀 삭제
   */
  async deleteHole(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.baseURL}/holes/${id}`);
    } catch (error) {
      console.error(`Failed to delete hole ${id}:`, error);
      throw error;
    }
  }

  // =================== 18홀 조합 관리 ===================

  /**
   * 골프장의 가능한 18홀 조합 조회
   */
  async getCombosForClub(clubId: number): Promise<CourseCombo[]> {
    try {
      const response = await apiClient.get<{data: CourseCombo[]}>(`${this.baseURL}/clubs/${clubId}/combos`);
      return response.data?.data || [];
    } catch (error) {
      console.error(`Failed to fetch combos for club ${clubId}:`, error);
      throw error;
    }
  }

  /**
   * 18홀 조합 자동 생성 (코스 목록 기반)
   */
  async generateCombos(clubId: number): Promise<CourseCombo[]> {
    try {
      const response = await apiClient.post<{data: CourseCombo[]}>(`${this.baseURL}/clubs/${clubId}/combos/generate`);
      return response.data?.data || [];
    } catch (error) {
      console.error(`Failed to generate combos for club ${clubId}:`, error);
      throw error;
    }
  }

  // =================== 타임슬롯 관리 ===================

  /**
   * 골프장의 타임슬롯 목록 조회
   */
  async getTimeSlots(clubId: number, filters: TimeSlotFilters = {}, page = 1, limit = 20): Promise<TimeSlotListResponse> {
    try {
      const params = {
        page,
        limit,
        clubId,
        ...filters
      };
      
      const response = await apiClient.get<{data: GolfTimeSlot[], total: number, totalPages: number, page: number, limit: number}>(`${this.baseURL}/timeslots`, params);
      
      return {
        data: response.data?.data || [],
        pagination: {
          page: response.data?.page || page,
          limit: response.data?.limit || limit,
          total: response.data?.total || 0,
          totalPages: response.data?.totalPages || 1
        }
      };
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
      throw error;
    }
  }

  /**
   * 타임슬롯 일괄 생성 (마법사)
   */
  async createTimeSlotsWithWizard(data: CreateTimeSlotBulkDto): Promise<GolfTimeSlot[]> {
    try {
      const response = await apiClient.post<{data: GolfTimeSlot[]}>(`${this.baseURL}/timeslots/bulk`, data);
      return response.data?.data || [];
    } catch (error) {
      console.error('Failed to create time slots with wizard:', error);
      throw error;
    }
  }

  /**
   * 타임슬롯 수정
   */
  async updateTimeSlot(id: number, data: Partial<GolfTimeSlot>): Promise<GolfTimeSlot> {
    try {
      const response = await apiClient.patch<GolfTimeSlot>(`${this.baseURL}/timeslots/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update time slot ${id}:`, error);
      throw error;
    }
  }

  /**
   * 타임슬롯 삭제
   */
  async deleteTimeSlot(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.baseURL}/timeslots/${id}`);
    } catch (error) {
      console.error(`Failed to delete time slot ${id}:`, error);
      throw error;
    }
  }

  /**
   * 타임슬롯 일괄 삭제
   */
  async deleteTimeSlots(ids: number[]): Promise<void> {
    try {
      await apiClient.delete(`${this.baseURL}/timeslots/bulk`, { ids });
    } catch (error) {
      console.error('Failed to delete time slots:', error);
      throw error;
    }
  }

  // =================== 통계 및 분석 ===================

  /**
   * 골프장 통계 조회
   */
  async getClubStats(): Promise<ClubStats> {
    try {
      const response = await apiClient.get<ClubStats>(`${this.baseURL}/stats`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch club stats:', error);
      throw error;
    }
  }

  /**
   * 18홀 조합별 분석 데이터
   */
  async getComboAnalytics(clubId: number, dateFrom?: string, dateTo?: string): Promise<ComboAnalytics[]> {
    try {
      const params: any = { clubId };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      
      const response = await apiClient.get<{data: ComboAnalytics[]}>(`${this.baseURL}/analytics/combos`, params);
      return response.data?.data || [];
    } catch (error) {
      console.error('Failed to fetch combo analytics:', error);
      throw error;
    }
  }

  // =================== 유틸리티 메서드 ===================

  /**
   * 골프장 이름으로 검색
   */
  async searchClubs(query: string): Promise<Club[]> {
    try {
      const response = await apiClient.get<{data: Club[]}>(`${this.baseURL}/search`, { q: query });
      return response.data?.data || [];
    } catch (error) {
      console.error('Failed to search clubs:', error);
      throw error;
    }
  }

  /**
   * 특정 회사의 골프장 목록 조회
   */
  async getClubsByCompany(companyId: number): Promise<Club[]> {
    try {
      const response = await this.getClubs({ companyId }, 1, 100);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch clubs for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * 인기 골프장 Top 10
   */
  async getPopularClubs(): Promise<Club[]> {
    try {
      const response = await apiClient.get<{data: Club[]}>(`${this.baseURL}/clubs/popular`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Failed to fetch popular clubs:', error);
      throw error;
    }
  }

  /**
   * 특정 날짜의 타임슬롯 가용성 체크
   */
  async checkAvailability(clubId: number, date: string): Promise<{available: number, total: number}> {
    try {
      const response = await apiClient.get<{available: number, total: number}>(`${this.baseURL}/clubs/${clubId}/availability`, { date });
      return response.data;
    } catch (error) {
      console.error('Failed to check availability:', error);
      throw error;
    }
  }
}

// API 인스턴스 생성 및 내보내기
export const clubApi = new ClubApi();

// 개별 메서드들도 내보내기 (편의를 위해)
export const {
  getClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
  getClubsByCompany,
  getCoursesByClub,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getHolesByCourse,
  createHole,
  updateHole,
  deleteHole,
  getCombosForClub,
  generateCombos,
  getTimeSlots,
  createTimeSlotsWithWizard,
  updateTimeSlot,
  deleteTimeSlot,
  deleteTimeSlots,
  getClubStats,
  getComboAnalytics,
  searchClubs,
  getPopularClubs,
  checkAvailability
} = clubApi;