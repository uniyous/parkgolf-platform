import { apiClient } from './client';
import type { 
  Admin, 
  CreateAdminDto, 
  UpdateAdminDto, 
  ChangePasswordDto,
  User 
} from '@/types';

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

// API 응답을 프론트엔드 Admin 타입으로 변환
const transformAdminResponse = (apiAdmin: any): Admin => {
  const roleCode = apiAdmin.roleCode || apiAdmin.role;

  // scope 추출 (새 구조에 맞게)
  let scope: 'SYSTEM' | 'OPERATION' | 'VIEW' = 'OPERATION';
  if (roleCode === 'ADMIN' || roleCode === 'SUPPORT') {
    scope = 'SYSTEM';
  } else if (roleCode === 'VIEWER') {
    scope = 'VIEW';
  }

  // permissions 배열 변환 (객체 배열 → 문자열 배열)
  const permissions = Array.isArray(apiAdmin.permissions)
    ? apiAdmin.permissions.map((p: any) => typeof p === 'string' ? p : p.permission)
    : [];

  return {
    id: apiAdmin.id,
    username: apiAdmin.email?.split('@')[0] || apiAdmin.name,
    email: apiAdmin.email,
    name: apiAdmin.name,
    role: roleCode as Admin['role'],
    scope,
    permissions,
    isActive: apiAdmin.isActive ?? true,
    lastLoginAt: apiAdmin.lastLoginAt,
    createdAt: apiAdmin.createdAt,
    updatedAt: apiAdmin.updatedAt,
    companyId: apiAdmin.companyId,
    phone: apiAdmin.phone,
    department: apiAdmin.department,
    description: apiAdmin.description,
  };
};

export const adminApi = {
  // 관리자 관리 (Admin Service)
  async getAdmins(_filters: any = {}): Promise<Admin[]> {
    try {
      console.log('🔍 Fetching admins via BFF API...');
      // BFF API를 통한 관리자 목록 조회
      const response = await apiClient.get('/admin/admins');
      console.log('✅ Admin API response:', response);

      // BFF API 응답 구조: {success: true, data: { admins: [...], total, page, ... }}
      const responseData = (response.data as any)?.data;
      const adminList = responseData?.admins || (Array.isArray(responseData) ? responseData : []);
      console.log('✅ Raw admin list:', adminList);

      // 데이터 변환 적용
      const transformedAdmins = Array.isArray(adminList)
        ? adminList.map(transformAdminResponse)
        : [];
      console.log('✅ Transformed admin list:', transformedAdmins);
      return transformedAdmins;
    } catch (error) {
      console.error('❌ Failed to fetch admins:', error);
      throw error;
    }
  },

  async getAdmin(id: number): Promise<Admin> {
    try {
      const response = await apiClient.get(`/admin/admins/${id}`);
      const adminData = (response.data as any)?.data || response.data;
      return transformAdminResponse(adminData);
    } catch (error) {
      console.error(`Failed to fetch admin ${id}:`, error);
      throw error;
    }
  },

  async createAdmin(data: CreateAdminDto): Promise<Admin> {
    try {
      // 프론트엔드 형식을 API 형식으로 변환
      const apiData = {
        ...data,
        roleCode: data.role,
      };
      const response = await apiClient.post('/admin/admins', apiData);
      const adminData = (response.data as any)?.data || response.data;
      return transformAdminResponse(adminData);
    } catch (error) {
      console.error('Failed to create admin:', error);
      throw error;
    }
  },

  async updateAdmin(id: number, data: UpdateAdminDto): Promise<Admin> {
    try {
      // 프론트엔드 형식을 API 형식으로 변환
      const apiData = {
        ...data,
        roleCode: data.role,
      };
      const response = await apiClient.patch(`/admin/admins/${id}`, apiData);
      const adminData = (response.data as any)?.data || response.data;
      return transformAdminResponse(adminData);
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
      const adminData = (response.data as any)?.data || response.data;
      return transformAdminResponse(adminData);
    } catch (error) {
      console.error(`Failed to update admin status ${id}:`, error);
      throw error;
    }
  },

  async updateAdminPermissions(id: number, permissionIds: number[]): Promise<Admin> {
    try {
      const response = await apiClient.post(`/admin/admins/${id}/permissions`, { permissionIds });
      const adminData = (response.data as any)?.data || response.data;
      return transformAdminResponse(adminData);
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

  // 역할 관리 API
  async getRoles(userType?: string): Promise<any[]> {
    try {
      const params = userType ? { userType } : {};
      const response = await apiClient.get('/admin/admins/roles', params);
      return (response.data as any)?.data || [];
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      throw error;
    }
  },

  async getRolesWithPermissions(userType?: string): Promise<any[]> {
    try {
      const params = userType ? { userType } : {};
      const response = await apiClient.get('/admin/admins/roles/with-permissions', params);
      return (response.data as any)?.data || [];
    } catch (error) {
      console.error('Failed to fetch roles with permissions:', error);
      throw error;
    }
  },

  async getRolePermissions(roleCode: string): Promise<string[]> {
    try {
      const response = await apiClient.get(`/admin/admins/roles/${roleCode}/permissions`);
      return (response.data as any)?.data || [];
    } catch (error) {
      console.error(`Failed to fetch permissions for role ${roleCode}:`, error);
      throw error;
    }
  },

  async updateRolePermissions(roleCode: string, permissions: string[]): Promise<any> {
    try {
      const response = await apiClient.patch(`/admin/admins/roles/${roleCode}/permissions`, { permissions });
      return (response.data as any)?.data || response.data;
    } catch (error) {
      console.error(`Failed to update permissions for role ${roleCode}:`, error);
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
      const responseData = response.data as any;

      // API 응답: { success: true, data: [...users], total, page, totalPages, limit }
      // 프론트엔드 형식: { users: [...], total, page, limit }
      return {
        users: responseData?.data || [],
        total: responseData?.total || 0,
        page: responseData?.page || page,
        limit: responseData?.limit || limit,
      };
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
      // BFF API는 PATCH 메서드 사용
      const response = await apiClient.patch<User>(`/admin/users/${id}`, data);
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
      // BFF API는 { password: string } 형식을 기대
      await apiClient.patch(`/admin/users/${id}/password`, {
        password: data.newPassword
      });
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