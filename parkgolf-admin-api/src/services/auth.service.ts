import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

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
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly authServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL') || 'http://localhost:3011';
  }

  async login(loginRequest: LoginRequest): Promise<AuthResponse> {
    try {
      this.logger.log(`Authenticating user: ${loginRequest.username}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/auth/login`, loginRequest)
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Authentication failed for user: ${loginRequest.username}`, error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Token validation failed', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/auth/refresh`, { refreshToken })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Token refresh failed', error);
      throw error;
    }
  }

  async getUserList(page = 1, limit = 20, adminToken: string): Promise<UserListResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/users`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          params: { page, limit }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch user list', error);
      throw error;
    }
  }

  async getUserById(userId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/users/${userId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch user: ${userId}`, error);
      throw error;
    }
  }

  async updateUser(userId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.authServiceUrl}/users/${userId}`, updateData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update user: ${userId}`, error);
      throw error;
    }
  }

  async deleteUser(userId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.authServiceUrl}/users/${userId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to delete user: ${userId}`, error);
      throw error;
    }
  }

  async createUser(userData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/users/signup`, userData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw error;
    }
  }
}