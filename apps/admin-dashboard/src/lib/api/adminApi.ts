import { apiClient } from './client';
import { extractList, extractSingle } from './bffParser';
import type {
  Admin,
  CreateAdminDto,
  UpdateAdminDto,
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  User,
  Permission
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

/** API 응답 타입 (백엔드 AdminResponseDto) */
interface ApiAdminResponse {
  id: number;
  email: string;
  name: string;
  roleCode: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  phone?: string | null;
  department?: string | null;
  description?: string | null;
  permissions?: Array<string | { permission: string }>;
  companyId?: number;
}

/** API 응답을 프론트엔드 Admin 타입으로 변환 */
const transformAdminResponse = (apiAdmin: ApiAdminResponse): Admin => {
  const roleCode = apiAdmin.roleCode;

  // scope 추출 (역할에서 자동 추론)
  let scope: 'SYSTEM' | 'OPERATION' | 'VIEW' = 'OPERATION';
  if (roleCode === 'ADMIN' || roleCode === 'SUPPORT') {
    scope = 'SYSTEM';
  } else if (roleCode === 'VIEWER') {
    scope = 'VIEW';
  }

  // permissions 배열 변환 (객체 배열 → Permission 배열)
  const permissions = Array.isArray(apiAdmin.permissions)
    ? apiAdmin.permissions.map((p) => typeof p === 'string' ? p : p.permission) as Permission[]
    : [] as Permission[];

  return {
    id: apiAdmin.id,
    email: apiAdmin.email,
    name: apiAdmin.name,
    roleCode: roleCode as Admin['roleCode'],
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
    // Legacy fields for backward compatibility
    role: roleCode as Admin['roleCode'],
    username: apiAdmin.email?.split('@')[0] || apiAdmin.name,
  };
};

/** BFF API 응답 구조 */
interface BffAdminListResponse {
  data?: {
    admins?: ApiAdminResponse[];
  } | ApiAdminResponse[];
  total?: number;
  page?: number;
  limit?: number;
}

interface BffAdminResponse {
  data?: ApiAdminResponse;
}

/** Admin 통계 응답 */
export interface AdminStatsResponse {
  total: number;                 // 전체 관리자 수
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  byRole: Record<string, number>;
}

/** 권한 정보 */
export interface PermissionInfo {
  id: number;
  code: string;
  name: string;
  description?: string;
}

/** 역할 정보 */
export interface RoleInfo {
  code: string;
  name: string;
  description?: string;
  userType: string;
}

/** 권한 상세 정보 */
export interface PermissionDetail {
  code: string;
  name: string;
  description?: string;
}

/** 권한이 포함된 역할 정보 */
export interface RoleWithPermissions extends RoleInfo {
  permissions: PermissionDetail[];
  level?: number;              // 역할 레벨 (정렬/우선순위용)
}

/** BFF User API 응답 구조 */
interface BffUserListResponse {
  data?: User[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface BffUserResponse {
  data?: User;
}

export const adminApi = {
  // 관리자 관리 (Admin Service)
  async getAdmins(_filters: UserFilters = {}): Promise<Admin[]> {
    const response = await apiClient.get<unknown>('/admin/admins');
    const adminList = extractList<ApiAdminResponse>(response.data, 'admins');
    return adminList.map(transformAdminResponse);
  },

  async getAdmin(id: number): Promise<Admin> {
    const response = await apiClient.get<unknown>(`/admin/admins/${id}`);
    const adminData = extractSingle<ApiAdminResponse>(response.data, 'admin');
    if (!adminData) throw new Error('Admin not found');
    return transformAdminResponse(adminData);
  },

  async createAdmin(data: CreateAdminDto): Promise<Admin> {
    // 프론트엔드 형식을 API 형식으로 변환
    const apiData = {
      ...data,
      roleCode: data.roleCode || data.role, // 하위 호환성
    };
    delete (apiData as Record<string, unknown>).role; // legacy field 제거

    const response = await apiClient.post<unknown>('/admin/admins', apiData);
    const adminData = extractSingle<ApiAdminResponse>(response.data, 'admin');
    if (!adminData) throw new Error('Failed to create admin');
    return transformAdminResponse(adminData);
  },

  async updateAdmin(id: number, data: UpdateAdminDto): Promise<Admin> {
    // 프론트엔드 형식을 API 형식으로 변환
    const apiData = {
      ...data,
      roleCode: data.roleCode || data.role, // 하위 호환성
    };
    delete (apiData as Record<string, unknown>).role; // legacy field 제거

    const response = await apiClient.patch<unknown>(`/admin/admins/${id}`, apiData);
    const adminData = extractSingle<ApiAdminResponse>(response.data, 'admin');
    if (!adminData) throw new Error('Failed to update admin');
    return transformAdminResponse(adminData);
  },

  async deleteAdmin(id: number): Promise<void> {
    await apiClient.delete(`/admin/admins/${id}`);
  },

  async updateAdminStatus(id: number, isActive: boolean): Promise<Admin> {
    try {
      const response = await apiClient.patch<BffAdminResponse>(`/admin/admins/${id}/status`, { isActive });
      const adminData = response.data?.data || response.data as unknown as ApiAdminResponse;
      return transformAdminResponse(adminData);
    } catch (error) {
      console.error(`Failed to update admin status ${id}:`, error);
      throw error;
    }
  },

  async updateAdminPermissions(id: number, permissionIds: number[]): Promise<Admin> {
    try {
      const response = await apiClient.post<BffAdminResponse>(`/admin/admins/${id}/permissions`, { permissionIds });
      const adminData = response.data?.data || response.data as unknown as ApiAdminResponse;
      return transformAdminResponse(adminData);
    } catch (error) {
      console.error(`Failed to update admin permissions ${id}:`, error);
      throw error;
    }
  },

  async getAdminStats(): Promise<AdminStatsResponse> {
    try {
      const response = await apiClient.get<{ data?: AdminStatsResponse }>('/admin/admins/stats');
      return response.data?.data || response.data as unknown as AdminStatsResponse;
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      throw error;
    }
  },

  async getPermissions(): Promise<PermissionInfo[]> {
    try {
      const response = await apiClient.get<{ data?: PermissionInfo[] }>('/admin/admins/permissions');
      return response.data?.data || [];
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      throw error;
    }
  },

  // 역할 관리 API
  async getRoles(userType?: string): Promise<RoleInfo[]> {
    try {
      const params = userType ? { userType } : {};
      const response = await apiClient.get<{ data?: RoleInfo[] }>('/admin/admins/roles', params);
      return response.data?.data || [];
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      throw error;
    }
  },

  async getRolesWithPermissions(userType?: string): Promise<RoleWithPermissions[]> {
    try {
      const params = userType ? { userType } : {};
      const response = await apiClient.get<{ data?: any[] }>('/admin/admins/roles/with-permissions', params);
      const roles = response.data?.data || [];

      // API 응답을 RoleWithPermissions 형식으로 변환
      return roles.map((role: any) => ({
        ...role,
        permissions: Array.isArray(role.permissions)
          ? role.permissions.map((p: string | PermissionDetail) =>
              typeof p === 'string' ? { code: p, name: p } : p
            )
          : [],
      }));
    } catch (error) {
      console.error('Failed to fetch roles with permissions:', error);
      throw error;
    }
  },

  async getRolePermissions(roleCode: string): Promise<string[]> {
    try {
      const response = await apiClient.get<{ data?: string[] }>(`/admin/admins/roles/${roleCode}/permissions`);
      return response.data?.data || [];
    } catch (error) {
      console.error(`Failed to fetch permissions for role ${roleCode}:`, error);
      throw error;
    }
  },

  async updateRolePermissions(roleCode: string, permissions: string[]): Promise<RoleWithPermissions> {
    try {
      const response = await apiClient.patch<{ data?: RoleWithPermissions }>(`/admin/admins/roles/${roleCode}/permissions`, { permissions });
      return response.data?.data || response.data as unknown as RoleWithPermissions;
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
      const response = await apiClient.get<BffUserListResponse>('/admin/users', params);
      const responseData = response.data;

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
      const response = await apiClient.get<BffUserResponse>(`/admin/users/${id}`);
      return response.data?.data || response.data as unknown as User;
    } catch (error) {
      console.error(`Failed to fetch user ${id}:`, error);
      throw error;
    }
  },

  async createUser(data: CreateUserDto): Promise<User> {
    try {
      const response = await apiClient.post<BffUserResponse>('/admin/users', data);
      return response.data?.data || response.data as unknown as User;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  },

  async updateUser(id: number, data: UpdateUserDto): Promise<User> {
    try {
      // BFF API는 PATCH 메서드 사용
      const response = await apiClient.patch<BffUserResponse>(`/admin/users/${id}`, data);
      return response.data?.data || response.data as unknown as User;
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
      const response = await apiClient.patch<BffUserResponse>(`/admin/users/${id}/status`, { status });
      return response.data?.data || response.data as unknown as User;
    } catch (error) {
      console.error(`Failed to update user status ${id}:`, error);
      throw error;
    }
  },

  async updateUserPermissions(id: number, permissions: string[]): Promise<User> {
    try {
      const response = await apiClient.patch<BffUserResponse>(`/admin/users/${id}/permissions`, { permissions });
      return response.data?.data || response.data as unknown as User;
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