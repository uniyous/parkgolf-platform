import { Injectable, Logger, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly TIMEOUT = 30000; // 30 seconds

  constructor(@Inject('NATS_CLIENT') private client: ClientProxy) {}

  // Admin authentication
  async adminLogin(username: string, password: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('auth.admin.login', { username, password })
          .pipe(timeout(this.TIMEOUT))
      );
      return result;
    } catch (error) {
      this.logger.error('Admin login failed', error);
      throw this.handleNatsError(error);
    }
  }

  async adminRefreshToken(refreshToken: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('auth.admin.refresh', { refreshToken })
          .pipe(timeout(this.TIMEOUT))
      );
      return result;
    } catch (error) {
      this.logger.error('Admin token refresh failed', error);
      throw this.handleNatsError(error);
    }
  }

  async getAdminProfile(token: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('auth.admin.profile', { token })
          .pipe(timeout(this.TIMEOUT))
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to get admin profile', error);
      throw this.handleNatsError(error);
    }
  }

  // Admin CRUD operations
  async getAdminList(filters: any, token: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('auth.admin.list', { filters, token })
          .pipe(timeout(this.TIMEOUT))
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to get admin list', error);
      throw this.handleNatsError(error);
    }
  }

  async getAdminById(adminId: string, token: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('auth.admin.getById', { adminId, token })
          .pipe(timeout(this.TIMEOUT))
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to get admin: ${adminId}`, error);
      throw this.handleNatsError(error);
    }
  }

  async createAdmin(adminData: any, token: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('auth.admin.create', { adminData, token })
          .pipe(timeout(this.TIMEOUT))
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to create admin', error);
      throw this.handleNatsError(error);
    }
  }

  async updateAdmin(adminId: string, updateData: any, token: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('auth.admin.update', { adminId, updateData, token })
          .pipe(timeout(this.TIMEOUT))
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to update admin: ${adminId}`, error);
      throw this.handleNatsError(error);
    }
  }

  async deleteAdmin(adminId: string, token: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('auth.admin.delete', { adminId, token })
          .pipe(timeout(this.TIMEOUT))
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete admin: ${adminId}`, error);
      throw this.handleNatsError(error);
    }
  }

  async updateAdminStatus(adminId: string, isActive: boolean, token: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('auth.admin.updateStatus', { adminId, isActive, token })
          .pipe(timeout(this.TIMEOUT))
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to update admin status: ${adminId}`, error);
      throw this.handleNatsError(error);
    }
  }

  async updateAdminPermissions(adminId: string, permissionIds: number[], token: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('auth.admin.updatePermissions', { adminId, permissionIds, token })
          .pipe(timeout(this.TIMEOUT))
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to update admin permissions: ${adminId}`, error);
      throw this.handleNatsError(error);
    }
  }

  async getAdminStats(dateRange: any, token: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('auth.admin.stats', { dateRange, token })
          .pipe(timeout(this.TIMEOUT))
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to get admin statistics', error);
      throw this.handleNatsError(error);
    }
  }

  // Permission management
  async getPermissionList(token: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('auth.permission.list', { token })
          .pipe(timeout(this.TIMEOUT))
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to get permission list', error);
      throw this.handleNatsError(error);
    }
  }

  private handleNatsError(error: any): HttpException {
    if (error.message?.includes('timeout')) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'SERVICE_TIMEOUT',
            message: 'Auth service request timeout',
          }
        },
        HttpStatus.REQUEST_TIMEOUT
      );
    }

    if (error.status) {
      throw new HttpException(error.response || error.message, error.status);
    }

    throw new HttpException(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        }
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}