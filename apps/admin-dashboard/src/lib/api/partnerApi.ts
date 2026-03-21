import { apiClient, ApiError } from './client';
import { extractList, extractSingle } from './bffParser';
import type {
  PartnerConfig,
  SyncLog,
  BookingMapping,
} from '@/types/partner';

export const partnerApi = {
  // 내 골프장 파트너 설정 조회
  async getMyPartnerConfig(clubId: number): Promise<PartnerConfig | null> {
    try {
      const response = await apiClient.get<unknown>(`/admin/partners/my/club/${clubId}`);
      return extractSingle<PartnerConfig>(response.data, 'partner');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // 동기화 이력 조회
  async getSyncLogs(clubId: number, params?: Record<string, string | number | boolean | undefined>): Promise<SyncLog[]> {
    try {
      const response = await apiClient.get<unknown>(`/admin/partners/my/club/${clubId}/sync-logs`, params);
      return extractList<SyncLog>(response.data, 'syncLogs');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return [];
      }
      throw error;
    }
  },

  // 수동 동기화 실행
  async manualSync(clubId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<unknown>(`/admin/partners/my/club/${clubId}/sync`, {});
    return extractSingle(response.data) ?? { success: false, message: 'Unknown error' };
  },

  // 예약 매핑 목록
  async getBookingMappings(clubId: number, params?: Record<string, string | number | boolean | undefined>): Promise<BookingMapping[]> {
    try {
      const response = await apiClient.get<unknown>(`/admin/partners/my/club/${clubId}/booking-mappings`, params);
      return extractList<BookingMapping>(response.data, 'bookingMappings');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return [];
      }
      throw error;
    }
  },

  // 예약 매핑 충돌 해결
  async resolveConflict(bookingMappingId: number, resolution: Record<string, string | number | boolean | undefined>): Promise<BookingMapping> {
    const response = await apiClient.post<unknown>(`/admin/partners/my/booking-mappings/${bookingMappingId}/resolve`, resolution);
    const data = extractSingle<BookingMapping>(response.data, 'bookingMapping');
    if (!data) throw new Error('Failed to resolve conflict');
    return data;
  },
} as const;
