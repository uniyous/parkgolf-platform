import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { NatsSuccessResponse } from '../common/types';
import { AdminResponseDto, CreateAdminDto, UpdateAdminDto } from './dto/admin.dto';
import { AdminFilterDto } from './dto/admin-filter.dto';

/** Admin 목록 응답 타입 */
export interface AdminListResponse {
  admins: AdminResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Admin 통계 응답 타입 */
export interface AdminStatsResponse {
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  adminsByRole: Record<string, number>;
}

/**
 * Admin Management Service
 *
 * NATS Patterns:
 * - Admin CRUD: admins.list, admins.getById, admins.create, admins.update, admins.delete
 * - Admin Actions: admins.updateStatus, admins.updatePermissions, admins.stats
 * - Permissions: permissions.list
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // ============================================
  // Admin CRUD Operations
  // ============================================

  async getAdminList(
    filters: AdminFilterDto,
    page: number = 1,
    limit: number = 20,
    token: string,
  ): Promise<NatsSuccessResponse<AdminListResponse>> {
    this.logger.log('Fetching admin list');
    return this.natsClient.send('admins.list', { filters, page, limit, token }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getAdminById(adminId: string, token: string): Promise<NatsSuccessResponse<AdminResponseDto>> {
    this.logger.log(`Fetching admin: ${adminId}`);
    return this.natsClient.send('admins.getById', { adminId, token });
  }

  async createAdmin(adminData: CreateAdminDto, token: string): Promise<NatsSuccessResponse<AdminResponseDto>> {
    this.logger.log('Creating admin');
    return this.natsClient.send('admins.create', { adminData, token });
  }

  async updateAdmin(
    adminId: string,
    updateData: UpdateAdminDto,
    token: string,
  ): Promise<NatsSuccessResponse<AdminResponseDto>> {
    this.logger.log(`Updating admin: ${adminId}`);
    return this.natsClient.send('admins.update', { adminId, updateData, token });
  }

  async deleteAdmin(adminId: string, token: string): Promise<NatsSuccessResponse<AdminResponseDto>> {
    this.logger.log(`Deleting admin: ${adminId}`);
    return this.natsClient.send('admins.delete', { adminId, token });
  }

  // ============================================
  // Admin Actions
  // ============================================

  async updateAdminStatus(
    adminId: string,
    isActive: boolean,
    token: string,
  ): Promise<NatsSuccessResponse<AdminResponseDto>> {
    this.logger.log(`Updating admin status: ${adminId} -> ${isActive}`);
    return this.natsClient.send('admins.updateStatus', { adminId, isActive, token });
  }

  async updateAdminPermissions(
    adminId: string,
    permissionIds: number[],
    token: string,
  ): Promise<NatsSuccessResponse<AdminResponseDto>> {
    this.logger.log(`Updating admin permissions: ${adminId}`);
    // Convert permission IDs to string codes for auth-service compatibility
    const permissions = permissionIds.map(id => String(id));
    return this.natsClient.send('admins.updatePermissions', { adminId, permissions, token });
  }

  async getAdminStats(dateRange: { startDate?: string; endDate?: string }, token: string): Promise<NatsSuccessResponse<AdminStatsResponse>> {
    this.logger.log('Fetching admin statistics');
    return this.natsClient.send('admins.stats', { dateRange, token }, NATS_TIMEOUTS.ANALYTICS);
  }

  // ============================================
  // Permission Management
  // ============================================

  async getPermissionList(token: string): Promise<NatsSuccessResponse<string[]>> {
    this.logger.log('Fetching permission list');
    return this.natsClient.send('permissions.list', { token });
  }

  // ============================================
  // Role Management
  // ============================================

  async getRoleList(userType: string | undefined, token: string): Promise<NatsSuccessResponse<unknown[]>> {
    this.logger.log('Fetching role list');
    return this.natsClient.send('roles.list', { userType, token });
  }

  async getRolePermissions(roleCode: string, token: string): Promise<NatsSuccessResponse<string[]>> {
    this.logger.log(`Fetching permissions for role: ${roleCode}`);
    return this.natsClient.send('roles.permissions', { roleCode, token });
  }

  async getRolesWithPermissions(userType: string | undefined, token: string): Promise<NatsSuccessResponse<unknown[]>> {
    this.logger.log('Fetching roles with permissions');
    return this.natsClient.send('roles.withPermissions', { userType, token }, NATS_TIMEOUTS.LIST_QUERY);
  }
}
