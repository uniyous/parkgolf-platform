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

interface NineHoleTimeSlotFilters {
  companyId?: number;
  firstCourseId?: number;
  secondCourseId?: number;
  dateFrom?: string;
  dateTo?: string;
  roundType?: 'NINE_HOLE' | 'EIGHTEEN_HOLE';
  page: number;
  limit: number;
}

/**
 * 타임슬롯 API 클라이언트 (9홀 기준)
 * admin-api와 통신하여 타임슬롯 관리 기능을 제공합니다.
 */
export const timeSlotApi = {
  /**
   * 타임슬롯 목록 조회 (9홀 기준)
   */
  async getTimeSlots(filters: Partial<NineHoleTimeSlotFilters> = {}): Promise<TimeSlotListResponse> {
    const params: Record<string, any> = {};
    
    // 필터 파라미터 변환
    if (filters.companyId) params.companyId = filters.companyId;
    if (filters.firstCourseId) params.firstCourseId = filters.firstCourseId;
    if (filters.secondCourseId) params.secondCourseId = filters.secondCourseId;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.roundType) params.roundType = filters.roundType;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    
    const response = await apiClient.get<{
      success: boolean;
      data: TimeSlotListResponse;
    }>('/admin/time-slots', params);
    
    return response.data.data;
  },

  /**
   * 타임슬롯 생성 (9홀 기준)
   */
  async createTimeSlot(data: CreateTimeSlotDto): Promise<TimeSlot> {
    const response = await apiClient.post<{
      success: boolean;
      data: TimeSlot;
    }>('/admin/time-slots', data);
    
    return response.data.data;
  },

  /**
   * 타임슬롯 수정
   */
  async updateTimeSlot(id: number, data: UpdateTimeSlotDto): Promise<TimeSlot> {
    const response = await apiClient.put<{
      success: boolean;
      data: TimeSlot;
    }>(`/admin/time-slots/${id}`, data);
    
    return response.data.data;
  },

  /**
   * 타임슬롯 삭제
   */
  async deleteTimeSlot(id: number): Promise<void> {
    await apiClient.delete(`/admin/time-slots/${id}`);
  },

  /**
   * 타임슬롯 통계 조회
   */
  async getStats(filters: {
    companyId?: number;
    firstCourseId?: number;
    roundType?: 'NINE_HOLE' | 'EIGHTEEN_HOLE';
    startDate?: string;
    endDate?: string;
  } = {}): Promise<TimeSlotStats> {
    const params: Record<string, any> = {};
    
    if (filters.companyId) params.companyId = filters.companyId;
    if (filters.firstCourseId) params.firstCourseId = filters.firstCourseId;
    if (filters.roundType) params.roundType = filters.roundType;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    
    const response = await apiClient.get<{
      success: boolean;
      data: { stats: TimeSlotStats };
    }>('/admin/time-slots/stats', { params });
    
    return response.data.data.stats;
  },

  /**
   * 타임슬롯 일괄 생성
   */
  async bulkCreateTimeSlots(timeSlots: CreateTimeSlotDto[]): Promise<TimeSlot[]> {
    const response = await apiClient.post<{
      success: boolean;
      data: TimeSlot[];
    }>('/admin/time-slots/bulk', { timeSlots });
    
    return response.data.data;
  },

  /**
   * 타임슬롯 일괄 수정
   */
  async bulkUpdateTimeSlots(ids: number[], data: Partial<UpdateTimeSlotDto>): Promise<TimeSlot[]> {
    const response = await apiClient.put<{
      success: boolean;
      data: TimeSlot[];
    }>('/admin/time-slots/bulk', { ids, data });
    
    return response.data.data;
  },

  /**
   * 타임슬롯 일괄 삭제
   */
  async bulkDeleteTimeSlots(ids: number[]): Promise<void> {
    await apiClient.delete('/admin/time-slots/bulk', { 
      data: { ids } 
    });
  },

  /**
   * 타임슬롯 템플릿으로 일괄 생성
   */
  async generateFromTemplate(config: TimeSlotGenerationConfig): Promise<TimeSlot[]> {
    const response = await apiClient.post<{
      success: boolean;
      data: TimeSlot[];
    }>('/admin/time-slots/generate', config);
    
    return response.data.data;
  },

  /**
   * 특정 기간의 타임슬롯 가용성 확인
   */
  async checkAvailability(params: {
    firstCourseId: number;
    secondCourseId?: number;
    dateFrom: string;
    dateTo: string;
    startTime: string;
    endTime: string;
  }): Promise<{
    available: boolean;
    conflicts: TimeSlot[];
  }> {
    const response = await apiClient.get<{
      success: boolean;
      data: {
        available: boolean;
        conflicts: TimeSlot[];
      };
    }>('/admin/time-slots/availability', { params });
    
    return response.data.data;
  },

  /**
   * 타임슬롯 복제
   */
  async duplicateTimeSlot(id: number, params: {
    targetDates: string[];
    adjustments?: Partial<CreateTimeSlotDto>;
  }): Promise<TimeSlot[]> {
    const response = await apiClient.post<{
      success: boolean;
      data: TimeSlot[];
    }>(`/admin/time-slots/${id}/duplicate`, params);
    
    return response.data.data;
  },

  /**
   * 타임슬롯 상태 변경 (활성화/비활성화)
   */
  async toggleStatus(id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<TimeSlot> {
    const response = await apiClient.patch<{
      success: boolean;
      data: TimeSlot;
    }>(`/admin/time-slots/${id}/status`, { status });
    
    return response.data.data;
  },

  /**
   * 타임슬롯 사용률 분석
   */
  async getUtilizationAnalysis(params: {
    companyId?: number;
    firstCourseId?: number;
    roundType?: 'NINE_HOLE' | 'EIGHTEEN_HOLE';
    period: 'week' | 'month' | 'quarter';
  }): Promise<{
    overall: number;
    byHour: { hour: string; utilization: number }[];
    byDayOfWeek: { day: string; utilization: number }[];
    trends: { date: string; utilization: number }[];
  }> {
    const response = await apiClient.get<{
      success: boolean;
      data: any;
    }>('/admin/time-slots/utilization', { params });
    
    return response.data.data;
  }
};