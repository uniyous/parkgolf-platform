import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

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

/**
 * Auth Service for Admin API
 *
 * NATS Patterns:
 * - Authentication: auth.admin.login, auth.admin.validate, auth.admin.refresh, auth.admin.me
 * - User CRUD: users.list, users.getById, users.create, users.update, users.delete, users.stats
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // ============================================
  // Admin Authentication
  // ============================================

  async login(loginRequest: LoginRequest): Promise<AuthResponse> {
    this.logger.log(`Admin login: ${loginRequest.email}`);
    return this.natsClient.send<AuthResponse>('auth.admin.login', loginRequest);
  }

  async validateToken(token: string): Promise<any> {
    this.logger.log('Validating admin token');
    return this.natsClient.send('auth.admin.validate', { token });
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    this.logger.log('Refreshing admin token');
    return this.natsClient.send<AuthResponse>('auth.admin.refresh', { refreshToken });
  }

  async getCurrentAdmin(token: string): Promise<any> {
    this.logger.log('Getting current admin info');
    return this.natsClient.send('auth.admin.me', { token });
  }

  async getCurrentUser(token: string): Promise<any> {
    this.logger.log('Getting current user info via admin token');
    return this.natsClient.send('auth.admin.me', { token });
  }

  async createAdmin(adminData: any): Promise<any> {
    this.logger.log(`Creating admin: ${adminData.email}`);
    return this.natsClient.send('admins.create', { adminData });
  }

  // ============================================
  // User Management (CRUD)
  // ============================================

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

  async getUserStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    this.logger.log('Fetching user statistics');
    return this.natsClient.send('users.stats', { dateRange, token: adminToken }, NATS_TIMEOUTS.ANALYTICS);
  }

  async resetUserPassword(userId: string, password: string, adminToken: string): Promise<any> {
    this.logger.log(`Resetting user password: ${userId}`);
    return this.natsClient.send('users.resetPassword', { userId, password, token: adminToken });
  }

  async updateUserRole(userId: string, role: string, adminToken: string): Promise<any> {
    this.logger.log(`Updating user role: ${userId} -> ${role}`);
    return this.natsClient.send('users.updateRole', { userId, role, token: adminToken });
  }

  async updateUserPermissions(userId: string, permissions: string[], adminToken: string): Promise<any> {
    this.logger.log(`Updating user permissions: ${userId}`);
    return this.natsClient.send('users.updatePermissions', { userId, permissions, token: adminToken });
  }
}
