import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

export interface LoginRequest {
  username: string;
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
export class AuthNatsService {
  private readonly logger = new Logger(AuthNatsService.name);

  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  async login(loginRequest: LoginRequest): Promise<AuthResponse> {
    try {
      this.logger.log(`Authenticating user via NATS: ${loginRequest.username}`);
      
      const result = await firstValueFrom(
        this.authClient.send('auth.login', loginRequest).pipe(timeout(5000))
      );
      
      this.logger.log(`Authentication successful for: ${loginRequest.username}`);
      return result;
    } catch (error) {
      this.logger.error(`Authentication failed for user: ${loginRequest.username}`, error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<any> {
    try {
      this.logger.log('Validating token via NATS');
      
      const result = await firstValueFrom(
        this.authClient.send('auth.validate', { token }).pipe(timeout(5000))
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
        this.authClient.send('auth.refresh', { refreshToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Token refresh failed', error);
      throw error;
    }
  }

  async getUserList(page = 1, limit = 20, adminToken: string): Promise<UserListResponse> {
    try {
      this.logger.log('Fetching user list via NATS');
      
      const result = await firstValueFrom(
        this.authClient.send('users.list', { page, limit, token: adminToken }).pipe(timeout(10000))
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
        this.authClient.send('users.findById', { userId, token: adminToken }).pipe(timeout(5000))
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
        this.authClient.send('users.update', { userId, data: updateData, token: adminToken }).pipe(timeout(5000))
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
        this.authClient.send('users.delete', { userId, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete user: ${userId}`, error);
      throw error;
    }
  }

  async createUser(userData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log('Creating user via NATS');
      
      const result = await firstValueFrom(
        this.authClient.send('users.create', { data: userData, token: adminToken }).pipe(timeout(5000))
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
        this.authClient.send('users.stats', { dateRange, token: adminToken }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch user statistics', error);
      throw error;
    }
  }

  onModuleInit() {
    this.authClient.connect();
  }

  onModuleDestroy() {
    this.authClient.close();
  }
}