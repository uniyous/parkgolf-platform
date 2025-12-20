import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../shared/nats';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      name?: string;
      roles: string[];
      type: string;
      permissions?: string[];
    };
  };
}

export interface UserListResponse {
  success: boolean;
  data: {
    users: any[];
    total: number;
    page: number;
    totalPages: number;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async login(loginRequest: LoginRequest): Promise<AuthResponse> {
    this.logger.log(`Authenticating admin via NATS: ${loginRequest.email}`);
    return this.natsClient.send<AuthResponse>('auth.admin.login', loginRequest);
  }

  async validateToken(token: string): Promise<any> {
    this.logger.log('Validating token via NATS');
    return this.natsClient.send('auth.validate', { token });
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    this.logger.log('Refreshing token via NATS');
    return this.natsClient.send<AuthResponse>('auth.refresh', { refreshToken });
  }

  async getUserList(filters: any, adminToken: string): Promise<UserListResponse> {
    this.logger.log('Fetching user list via NATS');
    return this.natsClient.send<UserListResponse>('users.list', { ...filters, token: adminToken }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getUserById(userId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching user via NATS: ${userId}`);
    return this.natsClient.send('users.findById', { userId, token: adminToken });
  }

  async updateUser(userId: string, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating user via NATS: ${userId}`);
    return this.natsClient.send('users.update', { userId, data: updateData, token: adminToken });
  }

  async deleteUser(userId: string, adminToken: string): Promise<any> {
    this.logger.log(`Deleting user via NATS: ${userId}`);
    return this.natsClient.send('users.delete', { userId, token: adminToken });
  }

  async updateUserStatus(userId: string, status: string, adminToken: string): Promise<any> {
    this.logger.log(`Updating user ${userId} status to ${status} via NATS`);
    return this.natsClient.send('users.updateStatus', { userId, status, token: adminToken });
  }

  async updateUserRole(userId: string, role: string, adminToken: string): Promise<any> {
    this.logger.log(`Updating user ${userId} role to ${role} via NATS`);
    return this.natsClient.send('users.updateRole', { userId, role, token: adminToken });
  }

  async updateUserPermissions(userId: string, permissions: string[], adminToken: string): Promise<any> {
    this.logger.log(`Updating user ${userId} permissions via NATS`);
    return this.natsClient.send('users.updatePermissions', { userId, permissions, token: adminToken });
  }

  async resetUserPassword(userId: string, newPassword: string, adminToken: string): Promise<any> {
    this.logger.log(`Resetting password for user ${userId} via NATS`);
    return this.natsClient.send('users.resetPassword', { userId, newPassword, token: adminToken });
  }

  async createUser(userData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating user via NATS');
    return this.natsClient.send('users.create', { data: userData, token: adminToken });
  }

  async createAdmin(adminData: any): Promise<any> {
    this.logger.log('Creating admin via NATS');
    return this.natsClient.send('auth.admin.create', { adminData });
  }

  async getUserStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    this.logger.log('Fetching user statistics via NATS');
    return this.natsClient.send('users.stats', { dateRange, token: adminToken }, NATS_TIMEOUTS.ANALYTICS);
  }

  async getCurrentUser(token: string): Promise<any> {
    this.logger.log('Getting current user/admin information via NATS');
    return this.natsClient.send('auth.getCurrentUser', { token });
  }
}