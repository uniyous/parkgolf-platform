import { apiClient } from './client';
import { extractList, extractSingle } from './bffParser';
import type { Club, ClubFilters } from '@/types/club';
import type { Game } from '@/types/course';

export const courseApi = {
  async getClubsByCompany(companyId: number): Promise<Club[]> {
    const response = await apiClient.get<unknown>(`/admin/courses/clubs/company/${companyId}`);
    return extractList<Club>(response.data);
  },

  async getClubs(params?: ClubFilters): Promise<Club[]> {
    const response = await apiClient.get<unknown>('/admin/courses/clubs', params);
    return extractList<Club>(response.data);
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
