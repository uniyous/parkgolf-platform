import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

export interface UserListResponse {
  success: boolean;
  data: {
    users: any[];
    total: number;
    page: number;
    totalPages: number;
  };
}

/**
 * Users Service for Admin API
 *
 * NATS Patterns:
 * - User CRUD: users.list, users.getById, users.create, users.update, users.delete
 * - User Actions: users.updateStatus, users.updateRole, users.updatePermissions, users.resetPassword
 * - User Analytics: users.stats
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async getUserList(filters: any, adminToken: string): Promise<UserListResponse> {
    this.logger.log('Fetching user list');
    return this.natsClient.send<UserListResponse>('users.list', { filters, token: adminToken }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getUserById(userId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching user: ${userId}`);
    return this.natsClient.send('users.getById', { userId, token: adminToken });
  }

  async createUser(userData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating user');
    return this.natsClient.send('users.create', { userData, token: adminToken });
  }

  async updateUser(userId: string, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating user: ${userId}`);
    return this.natsClient.send('users.update', { userId, updateData, token: adminToken });
  }

  async deleteUser(userId: string, adminToken: string): Promise<any> {
    this.logger.log(`Deleting user: ${userId}`);
    return this.natsClient.send('users.delete', { userId, token: adminToken });
  }

  async updateUserStatus(userId: string, status: string, adminToken: string): Promise<any> {
    const isActive = status === 'ACTIVE';
    this.logger.log(`Updating user status: ${userId} -> ${status} (isActive: ${isActive})`);
    return this.natsClient.send('users.updateStatus', { userId, isActive, token: adminToken });
  }

  async updateUserRole(userId: string, role: string, adminToken: string): Promise<any> {
    this.logger.log(`Updating user role: ${userId} -> ${role}`);
    return this.natsClient.send('users.updateRole', { userId, role, token: adminToken });
  }

  async updateUserPermissions(userId: string, permissions: string[], adminToken: string): Promise<any> {
    this.logger.log(`Updating user permissions: ${userId}`);
    return this.natsClient.send('users.updatePermissions', { userId, permissions, token: adminToken });
  }

  async resetUserPassword(userId: string, password: string, adminToken: string): Promise<any> {
    this.logger.log(`Resetting user password: ${userId}`);
    return this.natsClient.send('users.resetPassword', { userId, password, token: adminToken });
  }

  async getUserStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    this.logger.log('Fetching user statistics');
    return this.natsClient.send('users.stats', { dateRange, token: adminToken }, NATS_TIMEOUTS.ANALYTICS);
  }
}
