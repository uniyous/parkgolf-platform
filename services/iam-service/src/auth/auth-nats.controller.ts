import { Controller, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { NatsResponse } from '../common/types/response.types';

/**
 * Authentication NATS Controller
 *
 * Handles authentication-related operations for both users and admins:
 * - Login (auth.user.login, auth.admin.login)
 * - Token validation (auth.user.validate, auth.admin.validate)
 * - Token refresh (auth.user.refresh, auth.admin.refresh)
 * - Current user info (auth.user.me, auth.admin.me)
 */
@Controller()
export class AuthNatsController {
  private readonly logger = new Logger(AuthNatsController.name);

  constructor(private readonly authService: AuthService) {}

  // ============================================
  // Health Check / Ping
  // ============================================

  @MessagePattern('iam.auth.ping')
  async ping(@Payload() payload: { ping: boolean; timestamp: string }) {
    this.logger.debug(`NATS ping received: ${payload.timestamp}`);
    return {
      pong: true,
      service: 'iam-service',
      timestamp: new Date().toISOString(),
      receivedAt: payload.timestamp,
    };
  }

  // ============================================
  // User Authentication
  // ============================================

  @MessagePattern('iam.auth.user.login')
  async userLogin(@Payload() loginDto: LoginDto) {
    this.logger.log(`User login request: ${loginDto.email}`);

    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const result = await this.authService.login(user);
    this.logger.log(`User login successful: ${loginDto.email}`);
    return NatsResponse.success(result);
  }

  @MessagePattern('iam.auth.user.validate')
  async validateUserToken(@Payload() payload: { token: string }) {
    this.logger.log('User token validation request');
    const decoded = await this.authService.validateToken(payload.token);

    // Ensure this is a user token
    if (decoded.user?.type === 'admin') {
      throw new BadRequestException('Expected user token, got admin token');
    }

    return NatsResponse.success(decoded);
  }

  @MessagePattern('iam.auth.user.refresh')
  async refreshUserToken(@Payload() payload: { refreshToken: string }) {
    this.logger.log('User token refresh request');
    const result = await this.authService.refreshToken(payload.refreshToken);

    // Ensure this is a user token
    if (result.user?.type === 'admin') {
      throw new BadRequestException('Expected user token, got admin token');
    }

    return NatsResponse.success(result);
  }

  @MessagePattern('iam.auth.user.me')
  async getCurrentUser(@Payload() payload: { token: string }) {
    this.logger.log('Get current user request');
    const decoded = await this.authService.validateToken(payload.token);

    // Ensure this is a user token
    if (decoded.user?.type === 'admin') {
      throw new BadRequestException('Expected user token, got admin token');
    }

    const userInfo = await this.authService.getCurrentUser(decoded.user);
    return NatsResponse.success(userInfo);
  }

  // ============================================
  // Admin Authentication
  // ============================================

  @MessagePattern('iam.auth.admin.login')
  async adminLogin(@Payload() loginDto: LoginDto) {
    const startTime = Date.now();
    this.logger.log(`[PERF] iam-service adminLogin START - email: ${loginDto.email}`);

    const validateStartTime = Date.now();
    const admin = await this.authService.validateAdmin(loginDto.email, loginDto.password);
    this.logger.log(`[PERF] iam-service validateAdmin: ${Date.now() - validateStartTime}ms`);

    if (!admin) {
      this.logger.log(`[PERF] iam-service adminLogin FAILED (invalid credentials) - total: ${Date.now() - startTime}ms`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const loginStartTime = Date.now();
    const result = await this.authService.adminLogin(admin);
    this.logger.log(`[PERF] iam-service adminLogin (token gen): ${Date.now() - loginStartTime}ms`);

    this.logger.log(`[PERF] iam-service adminLogin SUCCESS - total: ${Date.now() - startTime}ms`);
    return NatsResponse.success(result);
  }

  @MessagePattern('iam.auth.admin.validate')
  async validateAdminToken(@Payload() payload: { token: string }) {
    this.logger.log('Admin token validation request');
    const decoded = await this.authService.validateToken(payload.token);

    // Ensure this is an admin token
    if (decoded.user?.type !== 'admin') {
      throw new BadRequestException('Expected admin token, got user token');
    }

    return NatsResponse.success(decoded);
  }

  @MessagePattern('iam.auth.admin.refresh')
  async refreshAdminToken(@Payload() payload: { refreshToken: string }) {
    this.logger.log('Admin token refresh request');
    const result = await this.authService.adminRefreshToken(payload.refreshToken);
    return NatsResponse.success(result);
  }

  @MessagePattern('iam.auth.admin.me')
  async getCurrentAdmin(@Payload() payload: { token: string }) {
    this.logger.log('Get current admin request');
    const decoded = await this.authService.validateToken(payload.token);
    this.logger.debug(`Token decoded: ${JSON.stringify({ type: decoded.user?.type, sub: decoded.user?.sub })}`);

    // Ensure this is an admin token
    if (decoded.user?.type !== 'admin') {
      this.logger.warn(`Invalid token type: ${decoded.user?.type}`);
      throw new BadRequestException('Expected admin token, got user token');
    }

    const adminInfo = await this.authService.getCurrentUser(decoded.user);
    this.logger.debug(`Admin info retrieved: ${JSON.stringify({ id: adminInfo.id, email: adminInfo.email, roles: adminInfo.roles })}`);
    return NatsResponse.success(adminInfo);
  }
}
