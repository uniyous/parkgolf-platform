import { apiClient } from './client';
import { extractList, extractPagination, extractSingle } from './bffParser';
import type { Club, ClubFilters } from '@/types/club';
import type { Game } from '@/types/course';
import type { Pagination } from '@/types/common';

export interface ClubListResponse {
  data: Club[];
  pagination: Pagination;
}

export const courseApi = {
  async getClubsByCompany(companyId: number): Promise<Club[]> {
    const response = await apiClient.get<unknown>(`/admin/courses/clubs/company/${companyId}`);
    return extractList<Club>(response.data);
  },

  async getClubs(params?: ClubFilters): Promise<ClubListResponse> {
    const response = await apiClient.get<unknown>('/admin/courses/clubs', params);
    const data = extractList<Club>(response.data);
    const pagination = extractPagination(response.data, data.length, { page: params?.page ?? 1, limit: params?.limit ?? 20 });
    return { data, pagination };
  },

  async getClubStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
    byBookingMode: { platform: number; partner: number };
    byClubType: { paid: number; free: number };
  }> {
    const response = await apiClient.get<unknown>('/admin/courses/clubs/stats');
    const stats = extractSingle<any>(response.data);
    return {
      total: stats?.total || 0,
      active: stats?.active || 0,
      inactive: stats?.inactive || 0,
      maintenance: stats?.maintenance || 0,
      byBookingMode: stats?.byBookingMode || { platform: 0, partner: 0 },
      byClubType: stats?.byClubType || { paid: 0, free: 0 },
    };
  },

  async getClubById(id: number): Promise<Club | null> {
    const response = await apiClient.get<unknown>(`/admin/courses/clubs/${id}`);
    return extractSingle<Club>(response.data);
  },

  async getGamesByCompany(companyId: number): Promise<Game[]> {
    const response = await apiClient.get<unknown>('/admin/games', { companyId, limit: 100 });
    return extractList<Game>(response.data);
  },
};
