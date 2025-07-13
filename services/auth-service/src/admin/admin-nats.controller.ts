import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
export class AdminNatsController {
  constructor(private readonly adminService: AdminService) {}

  @MessagePattern('auth.admin.list')
  async getAdminList(@Payload() data: { filters: any; token: string }) {
    try {
      const { filters } = data;
      const admins = await this.adminService.findAll(filters);
      
      return {
        success: true,
        data: admins.map(({ password, ...admin }) => admin),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.admin.getById')
  async getAdminById(@Payload() data: { adminId: string; token: string }) {
    try {
      const admin = await this.adminService.findOne(parseInt(data.adminId, 10));
      const { password, ...result } = admin;
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.admin.create')
  async createAdmin(@Payload() data: { adminData: any; token: string }) {
    try {
      const admin = await this.adminService.create(data.adminData);
      const { password, ...result } = admin;
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.admin.update')
  async updateAdmin(@Payload() data: { adminId: string; updateData: any; token: string }) {
    try {
      const admin = await this.adminService.update(
        parseInt(data.adminId, 10),
        data.updateData
      );
      const { password, ...result } = admin;
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.admin.delete')
  async deleteAdmin(@Payload() data: { adminId: string; token: string }) {
    try {
      const admin = await this.adminService.remove(parseInt(data.adminId, 10));
      const { password, ...result } = admin;
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.admin.updateStatus')
  async updateAdminStatus(@Payload() data: { adminId: string; isActive: boolean; token: string }) {
    try {
      const admin = await this.adminService.update(
        parseInt(data.adminId, 10),
        { isActive: data.isActive }
      );
      const { password, ...result } = admin;
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.admin.updatePermissions')
  async updateAdminPermissions(
    @Payload() data: { adminId: string; permissionIds: number[]; token: string }
  ) {
    try {
      const admin = await this.adminService.updatePermissions(
        parseInt(data.adminId, 10),
        data.permissionIds
      );
      const { password, ...result } = admin;
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.admin.stats')
  async getAdminStats(@Payload() data: { dateRange?: any; token: string }) {
    try {
      const stats = await this.adminService.getStats();
      
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error.message,
        },
      };
    }
  }

  @MessagePattern('auth.permission.list')
  async getPermissionList(@Payload() data: { token: string }) {
    try {
      const permissions = await this.adminService.getAllPermissions();
      
      return {
        success: true,
        data: permissions,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error.message,
        },
      };
    }
  }
}