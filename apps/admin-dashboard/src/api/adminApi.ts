import { apiClient } from './client';
import type { 
  Admin, 
  CreateAdminDto, 
  UpdateAdminDto, 
  ChangePasswordDto,
  User 
} from '../types';

// BFF API를 통한 사용자 관리
export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export interface UserFilters {
  role?: string;
  status?: string;
  search?: string;
}

export const adminApi = {
  // 관리자 관리 (Admin Service)
  async getAdmins(_filters: any = {}): Promise<Admin[]> {
    try {
      console.log('🔍 Fetching admins via BFF API...');
      // BFF API를 통한 관리자 목록 조회
      const response = await apiClient.get('/admin/admins');
      console.log('✅ Admin API response:', response);
      console.log('✅ Response data type:', typeof response.data);
      console.log('✅ Response data:', response.data);
      
      // BFF API 응답 구조: {success: true, data: [...]}
      const adminList = (response.data as any)?.data || response.data;
      console.log('✅ Final admin list:', adminList);
      return Array.isArray(adminList) ? adminList : [];
    } catch (error) {
      console.error('❌ Failed to fetch admins:', error);
      throw error;
    }
  },

  async getAdmin(id: number): Promise<Admin> {
    try {
      const response = await apiClient.get(`/admin/admins/${id}`);
      return (response.data as any)?.data || response.data;
    } catch (error) {
      console.error(`Failed to fetch admin ${id}:`, error);
      throw error;
    }
  },

  async createAdmin(data: CreateAdminDto): Promise<Admin> {
    try {
      const response = await apiClient.post('/admin/admins', data);
      return (response.data as any)?.data || response.data;
    } catch (error) {
      console.error('Failed to create admin:', error);
      throw error;
    }
  },

  async updateAdmin(id: number, data: UpdateAdminDto): Promise<Admin> {
    try {
      const response = await apiClient.patch(`/admin/admins/${id}`, data);
      return (response.data as any)?.data || response.data;
    } catch (error) {
      console.error(`Failed to update admin ${id}:`, error);
      throw error;
    }
  },

  async deleteAdmin(id: number): Promise<void> {
    try {
      await apiClient.delete(`/admin/admins/${id}`);
    } catch (error) {
      console.error(`Failed to delete admin ${id}:`, error);
      throw error;
    }
  },

  async updateAdminStatus(id: number, isActive: boolean): Promise<Admin> {
    try {
      const response = await apiClient.patch(`/admin/admins/${id}/status`, { isActive });
      return (response.data as any)?.data || response.data;
    } catch (error) {
      console.error(`Failed to update admin status ${id}:`, error);
      throw error;
    }
  },

  async updateAdminPermissions(id: number, permissionIds: number[]): Promise<Admin> {
    try {
      const response = await apiClient.post(`/admin/admins/${id}/permissions`, { permissionIds });
      return (response.data as any)?.data || response.data;
    } catch (error) {
      console.error(`Failed to update admin permissions ${id}:`, error);
      throw error;
    }
  },

  async getAdminStats(): Promise<any> {
    try {
      const response = await apiClient.get('/admin/admins/stats');
      return (response.data as any)?.data || response.data;
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      throw error;
    }
  },

  async getPermissions(): Promise<any[]> {
    try {
      const response = await apiClient.get('/admin/admins/permissions');
      return (response.data as any)?.data || [];
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      throw error;
    }
  },

  // 사용자 관리 (BFF API)
  async getUsers(filters: UserFilters = {}, page = 1, limit = 20): Promise<UserListResponse> {
    try {
      const params = {
        page,
        limit,
        ...filters
      };
      const response = await apiClient.get<UserListResponse>('/admin/users', params);
      return (response.data as any)?.data || response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  },

  async getUser(id: number): Promise<User> {
    try {
      const response = await apiClient.get<User>(`/admin/users/${id}`);
      return (response.data as any)?.data || response.data;
    } catch (error) {
      console.error(`Failed to fetch user ${id}:`, error);
      throw error;
    }
  },

  async createUser(data: CreateAdminDto): Promise<User> {
    try {
      const response = await apiClient.post<User>('/admin/users', data);
      return (response.data as any)?.data || response.data;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  },

  async updateUser(id: number, data: UpdateAdminDto): Promise<User> {
    try {
      const response = await apiClient.put<User>(`/admin/users/${id}`, data);
      return (response.data as any)?.data || response.data;
    } catch (error) {
      console.error(`Failed to update user ${id}:`, error);
      throw error;
    }
  },

  async deleteUser(id: number): Promise<void> {
    try {
      await apiClient.delete(`/admin/users/${id}`);
    } catch (error) {
      console.error(`Failed to delete user ${id}:`, error);
      throw error;
    }
  },

  async updateUserStatus(id: number, status: string): Promise<User> {
    try {
      const response = await apiClient.patch<User>(`/admin/users/${id}/status`, { status });
      return (response.data as any)?.data || response.data;
    } catch (error) {
      console.error(`Failed to update user status ${id}:`, error);
      throw error;
    }
  },

  async updateUserPermissions(id: number, permissions: string[]): Promise<User> {
    try {
      const response = await apiClient.patch<User>(`/admin/users/${id}/permissions`, { permissions });
      return (response.data as any)?.data || response.data;
    } catch (error) {
      console.error(`Failed to update user permissions ${id}:`, error);
      throw error;
    }
  },

  async changeUserPassword(id: number, data: ChangePasswordDto): Promise<void> {
    try {
      await apiClient.patch(`/admin/users/${id}/password`, data);
    } catch (error) {
      console.error(`Failed to change password for user ${id}:`, error);
      throw error;
    }
  },


  async changePassword(id: number, data: ChangePasswordDto): Promise<void> {
    try {
      await this.changeUserPassword(id, data);
    } catch (error) {
      console.error(`Failed to change password for admin ${id}:`, error);
      throw error;
    }
  },

  async toggleAdminStatus(id: number): Promise<Admin> {
    try {
      // First get current status, then toggle
      const currentAdmin = await this.getAdmin(id);
      const newStatus = !currentAdmin.isActive;
      return await this.updateAdminStatus(id, newStatus);
    } catch (error) {
      console.error(`Failed to toggle admin status ${id}:`, error);
      throw error;
    }
  },
};