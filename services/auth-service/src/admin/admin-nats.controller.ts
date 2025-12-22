import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AdminService } from './admin.service';
import { successResponse, errorResponse, omitPassword, omitPasswordFromArray } from '../common/utils/response.util';

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

  @MessagePattern('admins.list')
  async getAdminList(@Payload() data: { filters?: any; token?: string }) {
    try {
      this.logger.log('Get admin list request');
      const { filters } = data;
      const admins = await this.adminService.findAll(filters);
      return successResponse(omitPasswordFromArray(admins));
    } catch (error) {
      this.logger.error('Get admin list failed', error);
      return errorResponse('FETCH_FAILED', error.message);
    }
  }

  @MessagePattern('admins.getById')
  async getAdminById(@Payload() data: { adminId: string; token?: string }) {
    try {
      this.logger.log(`Get admin by ID: ${data.adminId}`);
      const admin = await this.adminService.findOne(parseInt(data.adminId, 10));
      return successResponse(omitPassword(admin));
    } catch (error) {
      this.logger.error(`Get admin failed: ${data.adminId}`, error);
      return errorResponse('NOT_FOUND', error.message);
    }
  }

  @MessagePattern('admins.create')
  async createAdmin(@Payload() data: { adminData: any; token?: string }) {
    try {
      this.logger.log(`Create admin: ${data.adminData?.email}`);
      const admin = await this.adminService.create(data.adminData);
      this.logger.log(`Admin created: ${admin.email}`);
      return successResponse(omitPassword(admin));
    } catch (error) {
      this.logger.error('Create admin failed', error);
      return errorResponse('CREATE_FAILED', error.message);
    }
  }

  @MessagePattern('admins.update')
  async updateAdmin(@Payload() data: { adminId: string; updateData: any; token?: string }) {
    try {
      this.logger.log(`Update admin: ${data.adminId}`);
      const admin = await this.adminService.update(
        parseInt(data.adminId, 10),
        data.updateData
      );
      return successResponse(omitPassword(admin));
    } catch (error) {
      this.logger.error(`Update admin failed: ${data.adminId}`, error);
      return errorResponse('UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('admins.delete')
  async deleteAdmin(@Payload() data: { adminId: string; token?: string }) {
    try {
      this.logger.log(`Delete admin: ${data.adminId}`);
      const admin = await this.adminService.remove(parseInt(data.adminId, 10));
      return successResponse(omitPassword(admin));
    } catch (error) {
      this.logger.error(`Delete admin failed: ${data.adminId}`, error);
      return errorResponse('DELETE_FAILED', error.message);
    }
  }

  @MessagePattern('admins.updateStatus')
  async updateAdminStatus(@Payload() data: { adminId: string; isActive: boolean; token?: string }) {
    try {
      this.logger.log(`Update admin status: ${data.adminId} -> ${data.isActive}`);
      const admin = await this.adminService.update(
        parseInt(data.adminId, 10),
        { isActive: data.isActive }
      );
      return successResponse(omitPassword(admin));
    } catch (error) {
      this.logger.error(`Update admin status failed: ${data.adminId}`, error);
      return errorResponse('UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('admins.updatePermissions')
  async updateAdminPermissions(@Payload() data: { adminId: string; permissions: string[]; token?: string }) {
    try {
      this.logger.log(`Update admin permissions: ${data.adminId}`);
      const admin = await this.adminService.updatePermissions(
        parseInt(data.adminId, 10),
        data.permissions
      );
      return successResponse(omitPassword(admin));
    } catch (error) {
      this.logger.error(`Update admin permissions failed: ${data.adminId}`, error);
      return errorResponse('UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('admins.stats')
  async getAdminStats(@Payload() data: { dateRange?: any; token?: string }) {
    try {
      this.logger.log('Get admin stats request');
      const stats = await this.adminService.getStats();
      return successResponse(stats);
    } catch (error) {
      this.logger.error('Get admin stats failed', error);
      return errorResponse('FETCH_FAILED', error.message);
    }
  }

  @MessagePattern('permissions.list')
  async getPermissionList(@Payload() data: { token?: string }) {
    try {
      this.logger.log('Get permission list request');
      const permissions = await this.adminService.getAllPermissions();
      return successResponse(permissions);
    } catch (error) {
      this.logger.error('Get permission list failed', error);
      return errorResponse('FETCH_FAILED', error.message);
    }
  }
}
