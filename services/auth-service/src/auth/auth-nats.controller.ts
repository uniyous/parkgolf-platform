import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { successResponse, errorResponse } from '../common/utils/response.util';

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
  // User Authentication
  // ============================================

  @MessagePattern('auth.user.login')
  async userLogin(@Payload() loginDto: LoginDto) {
    try {
      this.logger.log(`User login request: ${loginDto.email}`);

      const user = await this.authService.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password');
      }

      const result = await this.authService.login(user);
      this.logger.log(`User login successful: ${loginDto.email}`);
      return successResponse(result);
    } catch (error) {
      this.logger.error(`User login failed: ${loginDto.email}`, error);
      return errorResponse('AUTH_USER_LOGIN_FAILED', error.message || 'Login failed');
    }
  }

  @MessagePattern('auth.user.validate')
  async validateUserToken(@Payload() payload: { token: string }) {
    try {
      this.logger.log('User token validation request');
      const decoded = await this.authService.validateToken(payload.token);

      // Ensure this is a user token
      if (decoded.user?.type === 'admin') {
        return errorResponse('INVALID_TOKEN_TYPE', 'Expected user token, got admin token');
      }

      return successResponse(decoded);
    } catch (error) {
      this.logger.error('User token validation failed', error);
      return errorResponse('AUTH_VALIDATION_FAILED', error.message || 'Token validation failed');
    }
  }

  @MessagePattern('auth.user.refresh')
  async refreshUserToken(@Payload() payload: { refreshToken: string }) {
    try {
      this.logger.log('User token refresh request');
      const result = await this.authService.refreshToken(payload.refreshToken);

      // Ensure this is a user token
      if (result.user?.type === 'admin') {
        return errorResponse('INVALID_TOKEN_TYPE', 'Expected user token, got admin token');
      }

      return successResponse(result);
    } catch (error) {
      this.logger.error('User token refresh failed', error);
      return errorResponse('AUTH_REFRESH_FAILED', error.message || 'Token refresh failed');
    }
  }

  @MessagePattern('auth.user.me')
  async getCurrentUser(@Payload() payload: { token: string }) {
    try {
      this.logger.log('Get current user request');
      const decoded = await this.authService.validateToken(payload.token);

      // Ensure this is a user token
      if (decoded.user?.type === 'admin') {
        return errorResponse('INVALID_TOKEN_TYPE', 'Expected user token, got admin token');
      }

      const userInfo = await this.authService.getCurrentUser(decoded.user);
      return successResponse(userInfo);
    } catch (error) {
      this.logger.error('Get current user failed', error);
      return errorResponse('GET_CURRENT_USER_FAILED', error.message || 'Failed to get current user');
    }
  }

  // ============================================
  // Admin Authentication
  // ============================================

  @MessagePattern('auth.admin.login')
  async adminLogin(@Payload() loginDto: LoginDto) {
    try {
      this.logger.log(`Admin login request: ${loginDto.email}`);

      const admin = await this.authService.validateAdmin(loginDto.email, loginDto.password);
      if (!admin) {
        return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password');
      }

      const result = await this.authService.adminLogin(admin);
      this.logger.log(`Admin login successful: ${loginDto.email}`);
      return successResponse(result);
    } catch (error) {
      this.logger.error(`Admin login failed: ${loginDto.email}`, error);
      return errorResponse('AUTH_ADMIN_LOGIN_FAILED', error.message || 'Admin login failed');
    }
  }

  @MessagePattern('auth.admin.validate')
  async validateAdminToken(@Payload() payload: { token: string }) {
    try {
      this.logger.log('Admin token validation request');
      const decoded = await this.authService.validateToken(payload.token);

      // Ensure this is an admin token
      if (decoded.user?.type !== 'admin') {
        return errorResponse('INVALID_TOKEN_TYPE', 'Expected admin token, got user token');
      }

      return successResponse(decoded);
    } catch (error) {
      this.logger.error('Admin token validation failed', error);
      return errorResponse('AUTH_VALIDATION_FAILED', error.message || 'Token validation failed');
    }
  }

  @MessagePattern('auth.admin.refresh')
  async refreshAdminToken(@Payload() payload: { refreshToken: string }) {
    try {
      this.logger.log('Admin token refresh request');
      const result = await this.authService.adminRefreshToken(payload.refreshToken);
      return successResponse(result);
    } catch (error) {
      this.logger.error('Admin token refresh failed', error);
      return errorResponse('AUTH_REFRESH_FAILED', error.message || 'Token refresh failed');
    }
  }

  @MessagePattern('auth.admin.me')
  async getCurrentAdmin(@Payload() payload: { token: string }) {
    try {
      this.logger.log('Get current admin request');
      const decoded = await this.authService.validateToken(payload.token);

      // Ensure this is an admin token
      if (decoded.user?.type !== 'admin') {
        return errorResponse('INVALID_TOKEN_TYPE', 'Expected admin token, got user token');
      }

      const adminInfo = await this.authService.getCurrentUser(decoded.user);
      return successResponse(adminInfo);
    } catch (error) {
      this.logger.error('Get current admin failed', error);
      return errorResponse('GET_CURRENT_ADMIN_FAILED', error.message || 'Failed to get current admin');
    }
  }
}
