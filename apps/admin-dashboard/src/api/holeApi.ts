import { apiClient } from './client';
import type { CreateHoleDto, Hole, UpdateHoleDto } from '../types';

// BFF API 응답 타입
export interface HoleListResponse {
  holes: Hole[];
  total: number;
  page: number;
  limit: number;
}

export interface HoleFilters {
  search?: string;
  courseId?: number;
  par?: number;
}

export const holeApi = {
  async getHoles(filters: HoleFilters = {}, page = 1, limit = 20): Promise<HoleListResponse> {
    try {
      const params = {
        page,
        limit,
        ...filters
      };
      const response = await apiClient.get<HoleListResponse>('/admin/holes', params);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch holes:', error);
      throw error;
    }
  },

  async getHolesByCourse(courseId: number): Promise<Hole[]> {
    try {
      const response = await this.getHoles({ courseId: courseId });
      return response.holes;
    } catch (error) {
      console.error(`Failed to fetch holes for course ${courseId}:`, error);
      throw error;
    }
  },

  async getHoleById(id: number): Promise<Hole> {
    try {
      const response = await apiClient.get<Hole>(`/admin/holes/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch hole ${id}:`, error);
      throw error;
    }
  },

  async createHole(holeData: CreateHoleDto): Promise<Hole> {
    try {
      const response = await apiClient.post<Hole>('/admin/holes', holeData);
      return response.data;
    } catch (error) {
      console.error('Failed to create hole:', error);
      throw error;
    }
  },

  async updateHole(id: number, holeData: UpdateHoleDto): Promise<Hole> {
    try {
      const response = await apiClient.put<Hole>(`/admin/holes/${id}`, holeData);
      return response.data;
    } catch (error) {
      console.error(`Failed to update hole ${id}:`, error);
      throw error;
    }
  },

  async deleteHole(id: number): Promise<void> {
    try {
      await apiClient.delete(`/admin/holes/${id}`);
    } catch (error) {
      console.error(`Failed to delete hole ${id}:`, error);
      throw error;
    }
  }
} as const;

// Legacy exports for backward compatibility
export const fetchHolesByCourse = holeApi.getHolesByCourse;
export const fetchHoleById = holeApi.getHoleById;
export const createHole = holeApi.createHole;
export const updateHole = holeApi.updateHole;
export const deleteHole = holeApi.deleteHole;

// 이전 이름 호환성 유지
export const golfHoleApi = holeApi;