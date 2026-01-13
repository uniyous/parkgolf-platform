import { apiClient } from './client';
import { extractList, extractSingle } from './bffParser';
import type {
  Admin,
  AdminScope,
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

  // primaryScope 추출 (역할에서 자동 추론)
  const primaryScope: AdminScope = roleCode?.includes('PLATFORM') ? 'PLATFORM' : 'COMPANY';

  // permissions 배열 변환 (객체 배열 → Permission 배열)
  const permissions = Array.isArray(apiAdmin.permissions)
    ? apiAdmin.permissions.map((p) => typeof p === 'string' ? p : p.permission) as Permission[]
    : [] as Permission[];

  return {
    id: apiAdmin.id,
    email: apiAdmin.email,
    name: apiAdmin.name,
    roleCode: roleCode as Admin['roleCode'],
    primaryScope,
    permissions,
    isActive: apiAdmin.isActive ?? true,
    lastLoginAt: apiAdmin.lastLoginAt,
    createdAt: apiAdmin.createdAt,
    updatedAt: apiAdmin.updatedAt,
    companyId: apiAdmin.companyId,
    phone: apiAdmin.phone,
    department: apiAdmin.department,
    description: apiAdmin.description,
    companies: [],
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
    const response = await apiClient.post<unknown>('/admin/admins', data);
    const adminData = extractSingle<ApiAdminResponse>(response.data, 'admin');
    if (!adminData) throw new Error('Failed to create admin');
    return transformAdminResponse(adminData);
  },

  async updateAdmin(id: number, data: UpdateAdminDto): Promise<Admin> {
    const response = await apiClient.patch<unknown>(`/admin/admins/${id}`, data);
    const adminData = extractSingle<ApiAdminResponse>(response.data, 'admin');
    if (!adminData) throw new Error('Failed to update admin');
    return transformAdminResponse(adminData);
  },

  async deleteAdmin(id: number): Promise<void> {
    await apiClient.delete(`/admin/admins/${id}`);
  },

  /**
   * 관리자 상태 변경
   */
  async updateAdminStatus(id: number, isActive: boolean): Promise<Admin> {
    const response = await apiClient.patch<unknown>(`/admin/admins/${id}/status`, { isActive });
    const adminData = extractSingle<ApiAdminResponse>(response.data);
    if (!adminData) throw new Error('Failed to update admin status');
    return transformAdminResponse(adminData);
  },

  /**
   * 관리자 권한 변경
   */
  async updateAdminPermissions(id: number, permissionIds: number[]): Promise<Admin> {
    const response = await apiClient.post<unknown>(`/admin/admins/${id}/permissions`, { permissionIds });
    const adminData = extractSingle<ApiAdminResponse>(response.data);
    if (!adminData) throw new Error('Failed to update admin permissions');
    return transformAdminResponse(adminData);
  },

  /**
   * 관리자 통계 조회
   */
  async getAdminStats(): Promise<AdminStatsResponse> {
    const response = await apiClient.get<unknown>('/admin/admins/stats');
    const stats = extractSingle<AdminStatsResponse>(response.data);
    if (!stats) throw new Error('Failed to fetch admin stats');
    return stats;
  },

  /**
   * 권한 목록 조회
   */
  async getPermissions(): Promise<PermissionInfo[]> {
    const response = await apiClient.get<unknown>('/admin/admins/permissions');
    return extractList<PermissionInfo>(response.data) || [];
  },

  // ===== 역할 관리 API =====

  /**
   * 역할 목록 조회
   */
  async getRoles(userType?: string): Promise<RoleInfo[]> {
    const params = userType ? { userType } : {};
    const response = await apiClient.get<unknown>('/admin/admins/roles', params);
    return extractList<RoleInfo>(response.data) || [];
  },

  /**
   * 권한 포함 역할 목록 조회
   */
  async getRolesWithPermissions(userType?: string): Promise<RoleWithPermissions[]> {
    const params = userType ? { userType } : {};
    const response = await apiClient.get<unknown>('/admin/admins/roles/with-permissions', params);
    const roles = extractList<RoleWithPermissions>(response.data) || [];

    return roles.map((role) => ({
      ...role,
      permissions: Array.isArray(role.permissions)
        ? role.permissions.map((p: string | PermissionDetail) =>
            typeof p === 'string' ? { code: p, name: p } : p
          )
        : [],
    }));
  },

  /**
   * 역할별 권한 조회
   */
  async getRolePermissions(roleCode: string): Promise<string[]> {
    const response = await apiClient.get<unknown>(`/admin/admins/roles/${roleCode}/permissions`);
    return extractList<string>(response.data) || [];
  },

  /**
   * 역할 권한 수정
   */
  async updateRolePermissions(roleCode: string, permissions: string[]): Promise<RoleWithPermissions> {
    const response = await apiClient.patch<unknown>(`/admin/admins/roles/${roleCode}/permissions`, { permissions });
    const role = extractSingle<RoleWithPermissions>(response.data);
    if (!role) throw new Error('Failed to update role permissions');
    return role;
  },

  // ===== 사용자 관리 (BFF API) =====

  /**
   * 사용자 목록 조회
   */
  async getUsers(filters: UserFilters = {}, page = 1, limit = 20): Promise<UserListResponse> {
    const params = { page, limit, ...filters };
    const response = await apiClient.get<BffUserListResponse>('/admin/users', params);
    const responseData = response.data;

    return {
      users: responseData?.data || [],
      total: responseData?.total || 0,
      page: responseData?.page || page,
      limit: responseData?.limit || limit,
    };
  },

  /**
   * 사용자 상세 조회
   */
  async getUser(id: number): Promise<User> {
    const response = await apiClient.get<unknown>(`/admin/users/${id}`);
    const user = extractSingle<User>(response.data);
    if (!user) throw new Error('User not found');
    return user;
  },

  /**
   * 사용자 생성
   */
  async createUser(data: CreateUserDto): Promise<User> {
    const response = await apiClient.post<unknown>('/admin/users', data);
    const user = extractSingle<User>(response.data);
    if (!user) throw new Error('Failed to create user');
    return user;
  },

  /**
   * 사용자 수정
   */
  async updateUser(id: number, data: UpdateUserDto): Promise<User> {
    const response = await apiClient.patch<unknown>(`/admin/users/${id}`, data);
    const user = extractSingle<User>(response.data);
    if (!user) throw new Error('Failed to update user');
    return user;
  },

  /**
   * 사용자 삭제
   */
  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  },

  /**
   * 사용자 상태 변경
   */
  async updateUserStatus(id: number, status: string): Promise<User> {
    const response = await apiClient.patch<unknown>(`/admin/users/${id}/status`, { status });
    const user = extractSingle<User>(response.data);
    if (!user) throw new Error('Failed to update user status');
    return user;
  },

  /**
   * 사용자 권한 변경
   */
  async updateUserPermissions(id: number, permissions: string[]): Promise<User> {
    const response = await apiClient.patch<unknown>(`/admin/users/${id}/permissions`, { permissions });
    const user = extractSingle<User>(response.data);
    if (!user) throw new Error('Failed to update user permissions');
    return user;
  },

  /**
   * 사용자 비밀번호 변경
   */
  async changeUserPassword(id: number, data: ChangePasswordDto): Promise<void> {
    await apiClient.patch(`/admin/users/${id}/password`, { password: data.newPassword });
  },

  /**
   * 관리자 비밀번호 변경 (alias)
   */
  async changePassword(id: number, data: ChangePasswordDto): Promise<void> {
    await this.changeUserPassword(id, data);
  },

  /**
   * 관리자 상태 토글
   */
  async toggleAdminStatus(id: number): Promise<Admin> {
    const currentAdmin = await this.getAdmin(id);
    return await this.updateAdminStatus(id, !currentAdmin.isActive);
  },
};