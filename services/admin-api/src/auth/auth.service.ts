import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

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
      username: string;
      email: string;
      role: string;
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

  constructor(
    @Optional() @Inject('NATS_CLIENT') private readonly natsClient?: ClientProxy,
  ) {}

  async login(loginRequest: LoginRequest): Promise<AuthResponse> {
    try {
      this.logger.log(`Authenticating user via NATS: ${loginRequest.email}`);
      
      const result = await firstValueFrom(
        this.natsClient.send('auth.login', loginRequest).pipe(timeout(5000))
      );
      
      this.logger.log(`Authentication successful for: ${loginRequest.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Authentication failed for user: ${loginRequest.email}`, error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<any> {
    try {
      this.logger.log('Validating token via NATS');
      
      const result = await firstValueFrom(
        this.natsClient.send('auth.validate', { token }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Token validation failed', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      this.logger.log('Refreshing token via NATS');
      
      const result = await firstValueFrom(
        this.natsClient.send('auth.refresh', { refreshToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Token refresh failed', error);
      throw error;
    }
  }

  async getUserList(filters: any, adminToken: string): Promise<UserListResponse> {
    try {
      this.logger.log('Fetching user list via NATS');
      
      const result = await firstValueFrom(
        this.natsClient.send('users.list', { ...filters, token: adminToken }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch user list', error);
      throw error;
    }
  }

  async getUserById(userId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching user via NATS: ${userId}`);
      
      const result = await firstValueFrom(
        this.natsClient.send('users.findById', { userId, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch user: ${userId}`, error);
      throw error;
    }
  }

  async updateUser(userId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Updating user via NATS: ${userId}`);
      
      const result = await firstValueFrom(
        this.natsClient.send('users.update', { userId, data: updateData, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update user: ${userId}`, error);
      throw error;
    }
  }

  async deleteUser(userId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Deleting user via NATS: ${userId}`);
      
      const result = await firstValueFrom(
        this.natsClient.send('users.delete', { userId, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete user: ${userId}`, error);
      throw error;
    }
  }

  async updateUserStatus(userId: string, status: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Updating user ${userId} status to ${status} via NATS`);
      
      const result = await firstValueFrom(
        this.natsClient.send('users.updateStatus', { userId, status, token: adminToken }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update user ${userId} status`, error);
      throw error;
    }
  }

  async updateUserRole(userId: string, role: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Updating user ${userId} role to ${role} via NATS`);
      
      const result = await firstValueFrom(
        this.natsClient.send('users.updateRole', { userId, role, token: adminToken }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update user ${userId} role`, error);
      throw error;
    }
  }

  async updateUserPermissions(userId: string, permissions: string[], adminToken: string): Promise<any> {
    try {
      this.logger.log(`Updating user ${userId} permissions via NATS`);
      
      const result = await firstValueFrom(
        this.natsClient.send('users.updatePermissions', { userId, permissions, token: adminToken }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update user ${userId} permissions`, error);
      throw error;
    }
  }

  async resetUserPassword(userId: string, newPassword: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Resetting password for user ${userId} via NATS`);
      
      const result = await firstValueFrom(
        this.natsClient.send('users.resetPassword', { userId, newPassword, token: adminToken }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to reset password for user ${userId}`, error);
      throw error;
    }
  }

  async createUser(userData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log('Creating user via NATS');
      
      const result = await firstValueFrom(
        this.natsClient.send('users.create', { data: userData, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw error;
    }
  }

  async getUserStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    try {
      this.logger.log('Fetching user statistics via NATS');
      
      const result = await firstValueFrom(
        this.natsClient.send('users.stats', { dateRange, token: adminToken }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch user statistics', error);
      throw error;
    }
  }

  async getCurrentUser(token: string): Promise<any> {
    try {
      this.logger.log('Getting current user/admin information via NATS');
      this.logger.log('Token (first 20 chars):', token.substring(0, 20) + '...');
      
      const result = await firstValueFrom(
        this.natsClient.send('auth.getCurrentUser', { token }).pipe(timeout(5000))
      );
      
      this.logger.log('NATS response received:', JSON.stringify(result));
      this.logger.log('Current user information retrieved successfully');
      return result;
    } catch (error) {
      this.logger.error('Failed to get current user information', error);
      throw error;
    }
  }

  onModuleInit() {
    this.natsClient.connect();
  }

  onModuleDestroy() {
    this.natsClient.close();
  }
}