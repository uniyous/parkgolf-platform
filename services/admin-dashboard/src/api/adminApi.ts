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
  // 사용자 관리 (BFF API)
  async getUsers(filters: UserFilters = {}, page = 1, limit = 20): Promise<UserListResponse> {
    try {
      const params = {
        page,
        limit,
        ...filters
      };
      const response = await apiClient.get<UserListResponse>('/admin/users', params);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  },

  async getUser(id: number): Promise<User> {
    try {
      const response = await apiClient.get<User>(`/admin/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch user ${id}:`, error);
      throw error;
    }
  },

  async createUser(data: CreateAdminDto): Promise<User> {
    try {
      const response = await apiClient.post<User>('/admin/users', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  },

  async updateUser(id: number, data: UpdateAdminDto): Promise<User> {
    try {
      const response = await apiClient.put<User>(`/admin/users/${id}`, data);
      return response.data;
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
      return response.data;
    } catch (error) {
      console.error(`Failed to update user status ${id}:`, error);
      throw error;
    }
  },

  async updateUserPermissions(id: number, permissions: string[]): Promise<User> {
    try {
      const response = await apiClient.patch<User>(`/admin/users/${id}/permissions`, { permissions });
      return response.data;
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

  // Legacy compatibility methods (mapping to user management)
  async getAdmins(): Promise<Admin[]> {
    try {
      const response = await this.getUsers({ role: 'ADMIN' });
      return response.users.map(user => ({
        ...user,
        role: (user.roles?.[0] || 'ADMIN') as any,
        isActive: user.roles?.includes('ACTIVE') || true
      })) as Admin[];
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      throw error;
    }
  },

  async getAdmin(id: number): Promise<Admin> {
    try {
      const user = await this.getUser(id);
      return {
        ...user,
        role: (user.roles?.[0] || 'ADMIN') as any,
        isActive: user.roles?.includes('ACTIVE') || true
      } as Admin;
    } catch (error) {
      console.error(`Failed to fetch admin ${id}:`, error);
      throw error;
    }
  },

  async createAdmin(data: CreateAdminDto): Promise<Admin> {
    try {
      const user = await this.createUser(data);
      return {
        ...user,
        role: data.role,
        isActive: true
      } as Admin;
    } catch (error) {
      console.error('Failed to create admin:', error);
      throw error;
    }
  },

  async updateAdmin(id: number, data: UpdateAdminDto): Promise<Admin> {
    try {
      const user = await this.updateUser(id, data);
      return {
        ...user,
        role: data.role || 'ADMIN',
        isActive: user.roles?.includes('ACTIVE') || true
      } as Admin;
    } catch (error) {
      console.error(`Failed to update admin ${id}:`, error);
      throw error;
    }
  },

  async deleteAdmin(id: number): Promise<void> {
    try {
      await this.deleteUser(id);
    } catch (error) {
      console.error(`Failed to delete admin ${id}:`, error);
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

  async updateAdminPermissions(id: number, permissions: string[]): Promise<Admin> {
    try {
      const user = await this.updateUserPermissions(id, permissions);
      return {
        ...user,
        role: (user.roles?.[0] || 'ADMIN') as any,
        isActive: user.roles?.includes('ACTIVE') || true
      } as Admin;
    } catch (error) {
      console.error(`Failed to update admin permissions ${id}:`, error);
      throw error;
    }
  },

  async toggleAdminStatus(id: number): Promise<Admin> {
    try {
      // First get current status, then toggle
      const currentUser = await this.getUser(id);
      const newStatus = currentUser.roles?.includes('ACTIVE') ? 'INACTIVE' : 'ACTIVE';
      const user = await this.updateUserStatus(id, newStatus);
      return {
        ...user,
        role: (user.roles?.[0] || 'ADMIN') as any,
        isActive: newStatus === 'ACTIVE'
      } as Admin;
    } catch (error) {
      console.error(`Failed to toggle admin status ${id}:`, error);
      throw error;
    }
  },
};