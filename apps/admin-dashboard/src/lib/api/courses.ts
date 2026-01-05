/**
 * Course API - BFF 통합 클라이언트
 *
 * BFF: /api/admin/courses
 * - Clubs (골프장)
 * - Courses (코스)
 * - Holes (홀)
 */

import { apiClient } from './client';
import { extractPaginatedList, extractSingle, extractList, type PaginatedResult } from './bffParser';
import type {
  Course,
  Hole,
  CreateCourseDto,
  UpdateCourseDto,
  CreateHoleDto,
  UpdateHoleDto,
  Company,
} from '@/types';

// ============================================
// Types
// ============================================

export interface Club {
  id: number;
  companyId: number;
  name: string;
  location: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  operatingHours: {
    open: string;
    close: string;
  };
  facilities?: string[];
  status: 'ACTIVE' | 'MAINTENANCE' | 'SEASONAL_CLOSED' | 'INACTIVE';
  seasonInfo?: {
    type: 'peak' | 'regular' | 'off';
    startDate: string;
    endDate: string;
  };
  totalHoles: number;
  totalCourses: number;
  isActive: boolean;
  courses?: Course[];
  company?: {
    id: number;
    name: string;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateClubDto {
  companyId: number;
  name: string;
  location: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  operatingHours: {
    open: string;
    close: string;
  };
  facilities?: string[];
  status: 'ACTIVE' | 'MAINTENANCE' | 'SEASONAL_CLOSED' | 'INACTIVE';
}

export interface UpdateClubDto {
  name?: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  operatingHours?: {
    open: string;
    close: string;
  };
  facilities?: string[];
  status?: 'ACTIVE' | 'MAINTENANCE' | 'SEASONAL_CLOSED' | 'INACTIVE';
  seasonInfo?: {
    type: 'peak' | 'regular' | 'off';
    startDate: string;
    endDate: string;
  };
}

export interface ClubFilters {
  companyId?: number;
  location?: string;
  status?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface CourseFilters {
  search?: string;
  status?: string;
  companyId?: number;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

/** @deprecated PaginatedResult 사용 권장 */
export type CoursesPaginatedResult<T> = PaginatedResult<T>;

export interface CourseStats {
  totalClubs: number;
  totalCourses: number;
  totalHoles: number;
  activeClubs: number;
  byStatus: Record<string, number>;
}

// ============================================
// Course API
// ============================================

export const courseApi = {
  // ============================================
  // Club Management
  // ============================================

  /**
   * 골프장 목록 조회
   */
  async getClubs(filters: ClubFilters = {}): Promise<PaginatedResult<Club>> {
    const response = await apiClient.get<unknown>('/admin/courses/clubs', filters);
    return extractPaginatedList<Club>(response.data, 'clubs', {
      page: filters.page,
      limit: filters.limit,
    });
  },

  /**
   * 골프장 검색
   */
  async searchClubs(query: string): Promise<Club[]> {
    const response = await apiClient.get<unknown>('/admin/courses/clubs/search', { q: query });
    return extractList<Club>(response.data, 'clubs');
  },

  /**
   * 회사별 골프장 목록
   */
  async getClubsByCompany(companyId: number): Promise<Club[]> {
    const response = await apiClient.get<unknown>(`/admin/courses/clubs/company/${companyId}`);
    return extractList<Club>(response.data, 'clubs');
  },

  /**
   * 골프장 상세 조회
   */
  async getClubById(id: number): Promise<Club> {
    const response = await apiClient.get<unknown>(`/admin/courses/clubs/${id}`);
    const club = extractSingle<Club>(response.data, 'club');
    if (!club) throw new Error('Club not found');
    return club;
  },

  /**
   * 골프장 생성
   */
  async createClub(data: CreateClubDto): Promise<Club> {
    const response = await apiClient.post<Club>('/admin/courses/clubs', data);
    return response.data;
  },

  /**
   * 골프장 수정
   */
  async updateClub(id: number, data: UpdateClubDto): Promise<Club> {
    const response = await apiClient.put<Club>(`/admin/courses/clubs/${id}`, data);
    return response.data;
  },

  /**
   * 골프장 삭제
   */
  async deleteClub(id: number): Promise<void> {
    await apiClient.delete(`/admin/courses/clubs/${id}`);
  },

  // ============================================
  // Course Management
  // ============================================

  /**
   * 코스 목록 조회
   */
  async getCourses(filters: CourseFilters = {}, page = 1, limit = 20): Promise<PaginatedResult<Course>> {
    const params = { page, limit, ...filters };
    const response = await apiClient.get<unknown>('/admin/courses', params);
    return extractPaginatedList<Course>(response.data, 'courses', { page, limit });
  },

  /**
   * 코스 통계
   */
  async getCourseStats(startDate?: string, endDate?: string): Promise<CourseStats> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiClient.get<CourseStats>('/admin/courses/stats/overview', params);
    return response.data;
  },

  /**
   * 골프장별 코스 목록
   */
  async getCoursesByClub(clubId: number): Promise<Course[]> {
    const response = await apiClient.get<unknown>(`/admin/courses/club/${clubId}`);
    return extractList<Course>(response.data, 'courses');
  },

  /**
   * 회사별 코스 목록
   */
  async getCoursesByCompany(companyId: number): Promise<Course[]> {
    const result = await this.getCourses({ companyId });
    return result.data;
  },

  /**
   * 코스 상세 조회
   */
  async getCourseById(id: number): Promise<Course> {
    const response = await apiClient.get<unknown>(`/admin/courses/${id}`);
    const course = extractSingle<Course>(response.data, 'course');
    if (!course) throw new Error('Course not found');
    return course;
  },

  /**
   * 코스 생성
   */
  async createCourse(data: CreateCourseDto): Promise<Course> {
    const response = await apiClient.post<unknown>('/admin/courses', data);
    const course = extractSingle<Course>(response.data, 'course');
    if (!course) throw new Error('Failed to create course');
    return course;
  },

  /**
   * 코스 수정
   */
  async updateCourse(id: number, data: UpdateCourseDto): Promise<Course> {
    const response = await apiClient.patch<unknown>(`/admin/courses/${id}`, data);
    const course = extractSingle<Course>(response.data, 'course');
    if (!course) throw new Error('Failed to update course');
    return course;
  },

  /**
   * 코스 삭제
   */
  async deleteCourse(id: number): Promise<void> {
    await apiClient.delete(`/admin/courses/${id}`);
  },

  // ============================================
  // Hole Management
  // ============================================

  /**
   * 코스의 홀 목록 조회
   */
  async getHolesByCourse(courseId: number): Promise<Hole[]> {
    const response = await apiClient.get<{ success: boolean; data: Hole[] }>(`/admin/courses/${courseId}/holes`);
    return response.data?.data || [];
  },

  /**
   * 홀 상세 조회
   */
  async getHoleById(courseId: number, holeId: number): Promise<Hole> {
    const response = await apiClient.get<{ success: boolean; data: Hole }>(`/admin/courses/${courseId}/holes/${holeId}`);
    return response.data?.data;
  },

  /**
   * 홀 생성
   */
  async createHole(courseId: number, data: CreateHoleDto): Promise<Hole> {
    const response = await apiClient.post<{ success: boolean; data: Hole }>(`/admin/courses/${courseId}/holes`, data);
    return response.data?.data;
  },

  /**
   * 홀 수정
   */
  async updateHole(courseId: number, holeId: number, data: UpdateHoleDto): Promise<Hole> {
    const response = await apiClient.patch<{ success: boolean; data: Hole }>(`/admin/courses/${courseId}/holes/${holeId}`, data);
    return response.data?.data;
  },

  /**
   * 홀 삭제
   */
  async deleteHole(courseId: number, holeId: number): Promise<void> {
    await apiClient.delete(`/admin/courses/${courseId}/holes/${holeId}`);
  },

  // ============================================
  // Company Management (Legacy support)
  // ============================================

  /**
   * 회사 목록 조회 (기존 호환)
   */
  async getCompanies(): Promise<Company[]> {
    const response = await apiClient.get<{
      companies: Company[];
      totalCount: number;
      totalPages: number;
      page: number;
    }>('/admin/courses/companies');
    return response.data?.companies || [];
  },
} as const;

// ============================================
// Legacy Exports (하위 호환)
// ============================================

export const fetchCoursesByCompany = courseApi.getCoursesByCompany.bind(courseApi);
export const fetchCourseById = courseApi.getCourseById.bind(courseApi);
export const createCourse = courseApi.createCourse.bind(courseApi);
export const updateCourse = courseApi.updateCourse.bind(courseApi);
export const deleteCourse = courseApi.deleteCourse.bind(courseApi);
