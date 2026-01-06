import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService } from '../common/nats';

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

/**
 * Auth Service for Admin API
 *
 * NATS Patterns:
 * - Authentication: auth.admin.login, auth.admin.validate, auth.admin.refresh, auth.admin.me
 * - Admin Creation: admins.create
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async login(loginRequest: LoginRequest): Promise<AuthResponse> {
    const startTime = Date.now();
    this.logger.log(`[PERF] AuthService.login START - sending NATS message`);
    const result = await this.natsClient.send<AuthResponse>('auth.admin.login', loginRequest);
    this.logger.log(`[PERF] AuthService.login END - NATS response received in ${Date.now() - startTime}ms`);
    return result;
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
}
