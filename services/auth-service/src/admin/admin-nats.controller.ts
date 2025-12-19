import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AdminService } from './admin.service';
import { successResponse, errorResponse, omitPassword, omitPasswordFromArray } from '../common/utils/response.util';

@Controller()
export class AdminNatsController {
  private readonly logger = new Logger(AdminNatsController.name);

  constructor(private readonly adminService: AdminService) {}

  @MessagePattern('auth.admin.list')
  async getAdminList(@Payload() data: { filters: any; token: string }) {
    try {
      const { filters } = data;
      const admins = await this.adminService.findAll(filters);
      return successResponse(omitPasswordFromArray(admins));
    } catch (error) {
      return errorResponse('FETCH_FAILED', error.message);
    }
  }

  @MessagePattern('auth.admin.getById')
  async getAdminById(@Payload() data: { adminId: string; token: string }) {
    try {
      const admin = await this.adminService.findOne(parseInt(data.adminId, 10));
      return successResponse(omitPassword(admin));
    } catch (error) {
      return errorResponse('NOT_FOUND', error.message);
    }
  }

  @MessagePattern('auth.admin.create')
  async createAdmin(@Payload() data: { adminData: any; token?: string }) {
    this.logger.log('NATS: Create admin request received');
    this.logger.debug(`NATS: Admin data: ${JSON.stringify(data.adminData)}`);
    try {
      const admin = await this.adminService.create(data.adminData);
      this.logger.log(`NATS: Admin created successfully: ${admin.email}`);
      return successResponse(omitPassword(admin));
    } catch (error) {
      this.logger.error(`NATS: Failed to create admin: ${error.message}`);
      return errorResponse('CREATE_FAILED', error.message);
    }
  }

  @MessagePattern('auth.admin.update')
  async updateAdmin(@Payload() data: { adminId: string; updateData: any; token: string }) {
    try {
      const admin = await this.adminService.update(
        parseInt(data.adminId, 10),
        data.updateData
      );
      return successResponse(omitPassword(admin));
    } catch (error) {
      return errorResponse('UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('auth.admin.delete')
  async deleteAdmin(@Payload() data: { adminId: string; token: string }) {
    try {
      const admin = await this.adminService.remove(parseInt(data.adminId, 10));
      return successResponse(omitPassword(admin));
    } catch (error) {
      return errorResponse('DELETE_FAILED', error.message);
    }
  }

  @MessagePattern('auth.admin.updateStatus')
  async updateAdminStatus(@Payload() data: { adminId: string; isActive: boolean; token: string }) {
    try {
      const admin = await this.adminService.update(
        parseInt(data.adminId, 10),
        { isActive: data.isActive }
      );
      return successResponse(omitPassword(admin));
    } catch (error) {
      return errorResponse('UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('auth.admin.updatePermissions')
  async updateAdminPermissions(
    @Payload() data: { adminId: string; permissions: string[]; token: string }
  ) {
    try {
      const admin = await this.adminService.updatePermissions(
        parseInt(data.adminId, 10),
        data.permissions
      );
      return successResponse(omitPassword(admin));
    } catch (error) {
      return errorResponse('UPDATE_FAILED', error.message);
    }
  }

  @MessagePattern('auth.admin.stats')
  async getAdminStats(@Payload() data: { dateRange?: any; token: string }) {
    try {
      const stats = await this.adminService.getStats();
      return successResponse(stats);
    } catch (error) {
      return errorResponse('FETCH_FAILED', error.message);
    }
  }

  @MessagePattern('auth.permission.list')
  async getPermissionList(@Payload() data: { token: string }) {
    try {
      const permissions = await this.adminService.getAllPermissions();
      return successResponse(permissions);
    } catch (error) {
      return errorResponse('FETCH_FAILED', error.message);
    }
  }
}