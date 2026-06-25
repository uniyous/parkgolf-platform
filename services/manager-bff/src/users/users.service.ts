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
 * - User CRUD: iam.users.list, iam.users.getById, iam.users.create, iam.users.update, iam.users.delete
 * - User Actions: iam.users.updateStatus, iam.users.updateRole, iam.users.updatePermissions, iam.users.resetPassword
 * - User Analytics: iam.users.stats
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async getUserList(filters: any, adminToken: string): Promise<UserListResponse> {
    this.logger.log('Fetching user list');
    return this.natsClient.send<UserListResponse>('iam.users.list', { filters, token: adminToken }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getUserById(userId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching user: ${userId}`);
    return this.natsClient.send('iam.users.getById', { userId, token: adminToken });
  }

  async createUser(userData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating user');
    return this.natsClient.send('iam.users.create', { userData, token: adminToken });
  }

  async updateUser(userId: string, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating user: ${userId}`);
    return this.natsClient.send('iam.users.update', { userId, updateData, token: adminToken });
  }

  async deleteUser(userId: string, adminToken: string): Promise<any> {
    this.logger.log(`Deleting user: ${userId}`);
    return this.natsClient.send('iam.users.delete', { userId, token: adminToken });
  }

  async updateUserStatus(userId: string, status: string, adminToken: string): Promise<any> {
    const isActive = status === 'ACTIVE';
    this.logger.log(`Updating user status: ${userId} -> ${status} (isActive: ${isActive})`);
    return this.natsClient.send('iam.users.updateStatus', { userId, isActive, token: adminToken });
  }

  async updateUserRole(userId: string, role: string, adminToken: string): Promise<any> {
    this.logger.log(`Updating user role: ${userId} -> ${role}`);
    return this.natsClient.send('iam.users.updateRole', { userId, role, token: adminToken });
  }

  async updateUserPermissions(userId: string, permissions: string[], adminToken: string): Promise<any> {
    this.logger.log(`Updating user permissions: ${userId}`);
    return this.natsClient.send('iam.users.updatePermissions', { userId, permissions, token: adminToken });
  }

  async resetUserPassword(userId: string, password: string, adminToken: string): Promise<any> {
    this.logger.log(`Resetting user password: ${userId}`);
    return this.natsClient.send('iam.users.resetPassword', { userId, password, token: adminToken });
  }

  async getUserStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    this.logger.log('Fetching user statistics');
    return this.natsClient.send('iam.users.stats', { dateRange, token: adminToken }, NATS_TIMEOUTS.ANALYTICS);
  }
}
