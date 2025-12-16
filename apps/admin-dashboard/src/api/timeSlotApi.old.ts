import { apiClient } from './client';
import type { 
  TimeSlot, 
  CreateTimeSlotDto, 
  UpdateTimeSlotDto,
  TimeSlotFilters,
  TimeSlotStats,
  TimeSlotGenerationConfig,
  BulkTimeSlotOperation
} from '../types/timeslot';

export interface TimeSlotListResponse {
  timeSlots: TimeSlot[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TimeSlotStatsResponse {
  stats: TimeSlotStats;
}

/**
 * 타임슬롯 API 클라이언트
 * admin-api와 통신하여 타임슬롯 관리 기능을 제공합니다.
 */
export const timeSlotApi = {
  /**
   * 타임슬롯 목록 조회
   */
  async getTimeSlots(courseId: number, filters: Partial<TimeSlotFilters> = {}): Promise<TimeSlotListResponse> {
    const params: Record<string, any> = {};
    
    // 필터 파라미터 변환
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.timeFrom) params.timeFrom = filters.timeFrom;
    if (filters.timeTo) params.timeTo = filters.timeTo;
    if (filters.minAvailableSlots !== undefined) params.minAvailableSlots = filters.minAvailableSlots;
    if (filters.maxAvailableSlots !== undefined) params.maxAvailableSlots = filters.maxAvailableSlots;
    if (filters.minPrice !== undefined) params.minPrice = filters.minPrice;
    if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
    if (filters.isRecurring !== undefined) params.isRecurring = filters.isRecurring;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    const response = await apiClient.get<TimeSlotListResponse>(
      `/admin/courses/${courseId}/time-slots`,
      params
    );
    
    return response.data;
  },

  /**
   * 타임슬롯 생성
   */
  async createTimeSlot(courseId: number, data: CreateTimeSlotDto): Promise<TimeSlot> {
    const response = await apiClient.post<TimeSlot>(
      `/admin/courses/${courseId}/time-slots`,
      data
    );
    
    return response.data;
  },

  /**
   * 타임슬롯 수정
   */
  async updateTimeSlot(courseId: number, timeSlotId: number, data: UpdateTimeSlotDto): Promise<TimeSlot> {
    const response = await apiClient.patch<TimeSlot>(
      `/admin/courses/${courseId}/time-slots/${timeSlotId}`,
      data
    );
    
    return response.data;
  },

  /**
   * 타임슬롯 삭제
   */
  async deleteTimeSlot(courseId: number, timeSlotId: number): Promise<void> {
    await apiClient.delete(`/admin/courses/${courseId}/time-slots/${timeSlotId}`);
  },

  /**
   * 타임슬롯 통계 조회
   */
  async getTimeSlotStats(courseId?: number): Promise<TimeSlotStats> {
    const params: Record<string, any> = {};
    if (courseId) params.courseId = courseId;

    const response = await apiClient.get<TimeSlotStatsResponse>(
      '/admin/time-slots/stats',
      params
    );
    
    return response.data.stats;
  },

  /**
   * 대량 타임슬롯 생성
   */
  async generateTimeSlots(courseId: number, config: TimeSlotGenerationConfig): Promise<TimeSlot[]> {
    const response = await apiClient.post<TimeSlot[]>(
      `/admin/courses/${courseId}/time-slots/generate`,
      config
    );
    
    return response.data;
  },

  /**
   * 대량 작업 (삭제, 상태 변경 등)
   */
  async bulkOperation(courseId: number, operation: BulkTimeSlotOperation, timeSlotIds: number[]): Promise<void> {
    await apiClient.post(
      `/admin/courses/${courseId}/time-slots/bulk`,
      {
        operation,
        timeSlotIds,
      }
    );
  },

  /**
   * 타임슬롯 상태 변경
   */
  async updateTimeSlotStatus(courseId: number, timeSlotId: number, status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED'): Promise<TimeSlot> {
    const response = await apiClient.patch<TimeSlot>(
      `/admin/courses/${courseId}/time-slots/${timeSlotId}/status`,
      { status }
    );
    
    return response.data;
  },

  /**
   * 특정 날짜의 타임슬롯 조회
   */
  async getTimeSlotsByDate(courseId: number, date: string): Promise<TimeSlot[]> {
    const response = await apiClient.get<TimeSlot[]>(
      `/admin/courses/${courseId}/time-slots`,
      { date }
    );
    
    return response.data;
  },

  /**
   * 타임슬롯 상세 정보 조회
   */
  async getTimeSlotById(courseId: number, timeSlotId: number): Promise<TimeSlot> {
    const response = await apiClient.get<TimeSlot>(
      `/admin/courses/${courseId}/time-slots/${timeSlotId}`
    );
    
    return response.data;
  },
};