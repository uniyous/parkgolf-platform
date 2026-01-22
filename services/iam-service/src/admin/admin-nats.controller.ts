import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AdminService } from './admin.service';
import { AdminResponseDto } from './dto/create-admin.dto';
import { NatsResponse } from '../common/types/response.types';

/**
 * Admin Management NATS Controller
 *
 * Handles admin CRUD operations:
 * - admins.list, admins.getById, admins.create, admins.update, admins.delete
 * - admins.updateStatus, admins.updatePermissions, admins.stats
 * - permissions.list
 */
@Controller()
export class AdminNatsController {
  private readonly logger = new Logger(AdminNatsController.name);

  constructor(private readonly adminService: AdminService) {}

  @MessagePattern('iam.admins.list')
  async getAdminList(@Payload() data: { filters?: any; page?: number; limit?: number; token?: string }) {
    this.logger.log('Get admin list request');
    const { filters, page = 1, limit = 20 } = data;
    const result = await this.adminService.findAll({ ...filters, page, limit });
    return NatsResponse.paginated(AdminResponseDto.fromEntities(result.admins), result.total, result.page, result.limit);
  }

  @MessagePattern('iam.admins.getById')
  async getAdminById(@Payload() data: { adminId: string; token?: string }) {
    this.logger.log(`Get admin by ID: ${data.adminId}`);
    const admin = await this.adminService.findOne(parseInt(data.adminId, 10));
    return NatsResponse.success(AdminResponseDto.fromEntity(admin));
  }

  @MessagePattern('iam.admins.create')
  async createAdmin(@Payload() data: { adminData: any; token?: string }) {
    this.logger.log(`Create admin: ${data.adminData?.email}`);
    const admin = await this.adminService.create(data.adminData);
    this.logger.log(`Admin created: ${admin.email}`);
    return NatsResponse.success(AdminResponseDto.fromEntity(admin));
  }

  @MessagePattern('iam.admins.update')
  async updateAdmin(@Payload() data: { adminId: string; updateData: any; token?: string }) {
    this.logger.log(`Update admin: ${data.adminId}`);
    const admin = await this.adminService.update(
      parseInt(data.adminId, 10),
      data.updateData
    );
    return NatsResponse.success(AdminResponseDto.fromEntity(admin));
  }

  @MessagePattern('iam.admins.delete')
  async deleteAdmin(@Payload() data: { adminId: string; token?: string }) {
    this.logger.log(`Delete admin: ${data.adminId}`);
    await this.adminService.remove(parseInt(data.adminId, 10));
    return NatsResponse.deleted();
  }

  @MessagePattern('iam.admins.updateStatus')
  async updateAdminStatus(@Payload() data: { adminId: string; isActive: boolean; token?: string }) {
    this.logger.log(`Update admin status: ${data.adminId} -> ${data.isActive}`);
    const admin = await this.adminService.update(
      parseInt(data.adminId, 10),
      { isActive: data.isActive }
    );
    return NatsResponse.success(AdminResponseDto.fromEntity(admin));
  }

  @MessagePattern('iam.admins.updatePermissions')
  async updateAdminPermissions(@Payload() data: { adminId: string; permissions: string[]; token?: string }) {
    this.logger.log(`Update admin permissions: ${data.adminId}`);
    const admin = await this.adminService.updatePermissions(
      parseInt(data.adminId, 10),
      data.permissions
    );
    return NatsResponse.success(AdminResponseDto.fromEntity(admin));
  }

  @MessagePattern('iam.admins.stats')
  async getAdminStats(@Payload() data: { dateRange?: any; token?: string }) {
    this.logger.log('Get admin stats request');
    const stats = await this.adminService.getStats();
    return NatsResponse.success(stats);
  }

  @MessagePattern('iam.permissions.list')
  async getPermissionList(@Payload() data: { token?: string }) {
    this.logger.log('Get permission list request');
    const permissions = await this.adminService.getAllPermissions();
    return NatsResponse.success(permissions);
  }

  // ============================================
  // Role Management
  // ============================================

  @MessagePattern('iam.roles.list')
  async getRoleList(@Payload() data: { userType?: string; token?: string }) {
    this.logger.log('Get role list request');
    const roles = data.userType === 'ADMIN'
      ? await this.adminService.getAdminRoles()
      : await this.adminService.getAllRoles();
    return NatsResponse.success(roles);
  }

  @MessagePattern('iam.roles.permissions')
  async getRolePermissions(@Payload() data: { roleCode: string; token?: string }) {
    this.logger.log(`Get permissions for role: ${data.roleCode}`);
    const permissions = await this.adminService.getRolePermissions(data.roleCode);
    return NatsResponse.success(permissions);
  }

  @MessagePattern('iam.roles.withPermissions')
  async getRolesWithPermissions(@Payload() data: { userType?: string; token?: string }) {
    this.logger.log('Get roles with permissions request');
    // 단일 쿼리로 역할과 권한을 함께 조회 (N+1 제거)
    const rolesWithPermissions = await this.adminService.getRolesWithPermissions(data.userType);
    return NatsResponse.success(rolesWithPermissions);
  }
}
