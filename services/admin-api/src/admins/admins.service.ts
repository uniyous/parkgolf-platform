import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // Admin authentication
  async adminLogin(username: string, password: string) {
    this.logger.log(`Admin login attempt: ${username}`);
    return this.natsClient.send('auth.admin.login', { username, password });
  }

  async adminRefreshToken(refreshToken: string) {
    this.logger.log('Admin token refresh');
    return this.natsClient.send('auth.admin.refresh', { refreshToken });
  }

  async getAdminProfile(token: string) {
    this.logger.log('Getting admin profile');
    return this.natsClient.send('auth.admin.profile', { token });
  }

  // Admin CRUD operations
  async getAdminList(filters: any, token: string) {
    this.logger.log('Fetching admin list');
    return this.natsClient.send('auth.admin.list', { filters, token }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getAdminById(adminId: string, token: string) {
    this.logger.log(`Fetching admin: ${adminId}`);
    return this.natsClient.send('auth.admin.getById', { adminId, token });
  }

  async createAdmin(adminData: any, token: string) {
    this.logger.log('Creating admin');
    return this.natsClient.send('auth.admin.create', { adminData, token });
  }

  async updateAdmin(adminId: string, updateData: any, token: string) {
    this.logger.log(`Updating admin: ${adminId}`);
    return this.natsClient.send('auth.admin.update', { adminId, updateData, token });
  }

  async deleteAdmin(adminId: string, token: string) {
    this.logger.log(`Deleting admin: ${adminId}`);
    return this.natsClient.send('auth.admin.delete', { adminId, token });
  }

  async updateAdminStatus(adminId: string, isActive: boolean, token: string) {
    this.logger.log(`Updating admin status: ${adminId}`);
    return this.natsClient.send('auth.admin.updateStatus', { adminId, isActive, token });
  }

  async updateAdminPermissions(adminId: string, permissionIds: number[], token: string) {
    this.logger.log(`Updating admin permissions: ${adminId}`);
    return this.natsClient.send('auth.admin.updatePermissions', { adminId, permissionIds, token });
  }

  async getAdminStats(dateRange: any, token: string) {
    this.logger.log('Fetching admin statistics');
    return this.natsClient.send('auth.admin.stats', { dateRange, token }, NATS_TIMEOUTS.ANALYTICS);
  }

  // Permission management
  async getPermissionList(token: string) {
    this.logger.log('Fetching permission list');
    return this.natsClient.send('auth.permission.list', { token });
  }
}
