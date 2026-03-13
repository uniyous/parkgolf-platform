import { apiClient } from './client';
import { extractList, extractPagination, extractSingle } from './bffParser';
import type {
  PartnerConfig,
  CreatePartnerConfigDto,
  UpdatePartnerConfigDto,
  PartnerConfigFilters,
  PartnerListResponse,
  CourseMapping,
  CreateCourseMappingDto,
  UpdateCourseMappingDto,
  SyncLog,
  BookingMapping,
} from '@/types/partner';

export const partnerApi = {
  // ── PartnerConfig CRUD ──

  async getPartners(filters: PartnerConfigFilters = {}, page = 1, limit = 20): Promise<PartnerListResponse> {
    const params: Record<string, unknown> = { page, limit };
    if (filters.search) params.search = filters.search;
    if (filters.isActive !== undefined) params.isActive = filters.isActive;
    if (filters.syncMode) params.syncMode = filters.syncMode;
    if (filters.companyId) params.companyId = filters.companyId;

    const response = await apiClient.get<unknown>('/admin/partners', params);
    const items = extractList<PartnerConfig>(response.data, 'partners');
    const pagination = extractPagination(response.data, items.length, { page, limit });

    return { data: items, pagination };
  },

  async getPartnerById(id: number): Promise<PartnerConfig> {
    const response = await apiClient.get<unknown>(`/admin/partners/${id}`);
    const data = extractSingle<PartnerConfig>(response.data, 'partner');
    if (!data) throw new Error('Partner not found');
    return data;
  },

  async createPartner(dto: CreatePartnerConfigDto): Promise<PartnerConfig> {
    const response = await apiClient.post<unknown>('/admin/partners', dto);
    const data = extractSingle<PartnerConfig>(response.data, 'partner');
    if (!data) throw new Error('Failed to create partner');
    return data;
  },

  async updatePartner(id: number, dto: UpdatePartnerConfigDto): Promise<PartnerConfig> {
    const response = await apiClient.put<unknown>(`/admin/partners/${id}`, dto);
    const data = extractSingle<PartnerConfig>(response.data, 'partner');
    if (!data) throw new Error('Failed to update partner');
    return data;
  },

  async deletePartner(id: number): Promise<void> {
    await apiClient.delete(`/admin/partners/${id}`);
  },

  async testConnection(id: number): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const response = await apiClient.post<unknown>(`/admin/partners/${id}/test`, {});
    return extractSingle(response.data) ?? { success: false, message: 'Unknown error' };
  },

  // ── Course Mapping ──

  async getCourseMappings(partnerId: number): Promise<CourseMapping[]> {
    const response = await apiClient.get<unknown>(`/admin/partners/${partnerId}/course-mappings`);
    return extractList<CourseMapping>(response.data, 'courseMappings');
  },

  async createCourseMapping(dto: CreateCourseMappingDto): Promise<CourseMapping> {
    const { partnerId, ...body } = dto;
    const response = await apiClient.post<unknown>(`/admin/partners/${partnerId}/course-mappings`, body);
    const data = extractSingle<CourseMapping>(response.data, 'courseMapping');
    if (!data) throw new Error('Failed to create course mapping');
    return data;
  },

  async updateCourseMapping(id: number, dto: UpdateCourseMappingDto): Promise<CourseMapping> {
    const response = await apiClient.put<unknown>(`/admin/partners/course-mappings/${id}`, dto);
    const data = extractSingle<CourseMapping>(response.data, 'courseMapping');
    if (!data) throw new Error('Failed to update course mapping');
    return data;
  },

  async deleteCourseMapping(id: number): Promise<void> {
    await apiClient.delete(`/admin/partners/course-mappings/${id}`);
  },

  // ── Sync ──

  async getSyncLogs(partnerId: number, params?: Record<string, unknown>): Promise<SyncLog[]> {
    const response = await apiClient.get<unknown>(`/admin/partners/my/club/${partnerId}/sync-logs`, params);
    return extractList<SyncLog>(response.data, 'syncLogs');
  },

  async manualSync(partnerId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<unknown>(`/admin/partners/my/club/${partnerId}/sync`, {});
    return extractSingle(response.data) ?? { success: false, message: 'Unknown error' };
  },

  // ── Booking Mapping ──

  async getBookingMappings(clubId: number, params?: Record<string, unknown>): Promise<BookingMapping[]> {
    const response = await apiClient.get<unknown>(`/admin/partners/my/club/${clubId}/booking-mappings`, params);
    return extractList<BookingMapping>(response.data, 'bookingMappings');
  },

  async resolveConflict(bookingMappingId: number, resolution: Record<string, unknown>): Promise<BookingMapping> {
    const response = await apiClient.post<unknown>(`/admin/partners/my/booking-mappings/${bookingMappingId}/resolve`, resolution);
    const data = extractSingle<BookingMapping>(response.data, 'bookingMapping');
    if (!data) throw new Error('Failed to resolve conflict');
    return data;
  },
} as const;
