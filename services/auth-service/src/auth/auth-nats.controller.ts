import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { successResponse, errorResponse, omitPassword } from '../common/utils/response.util';

@Controller()
export class AuthNatsController {
  private readonly logger = new Logger(AuthNatsController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  /**
   * User login - Only authenticates against users table
   */
  @MessagePattern('auth.user.login')
  async userLogin(@Payload() loginDto: LoginDto) {
    try {
      this.logger.log(`NATS: User login request for: ${loginDto.email}`);

      const user = await this.authService.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const result = await this.authService.login(user);
      this.logger.log(`NATS: User login successful for: ${loginDto.email}`);
      return successResponse(result);
    } catch (error) {
      this.logger.error(`NATS: User login failed for: ${loginDto.email}`, error);
      return errorResponse('AUTH_USER_LOGIN_FAILED', error.message || 'Login failed');
    }
  }

  /**
   * Admin login - Only authenticates against admins table
   */
  @MessagePattern('auth.admin.login')
  async adminLogin(@Payload() loginDto: LoginDto) {
    try {
      this.logger.log(`NATS: Admin login request for: ${loginDto.email}`);

      const admin = await this.authService.validateAdmin(loginDto.email, loginDto.password);
      if (!admin) {
        throw new Error('Invalid admin credentials');
      }

      const result = await this.authService.adminLogin(admin);
      this.logger.log(`NATS: Admin login successful for: ${loginDto.email}`);
      return successResponse(result);
    } catch (error) {
      this.logger.error(`NATS: Admin login failed for: ${loginDto.email}`, error);
      return errorResponse('AUTH_ADMIN_LOGIN_FAILED', error.message || 'Admin login failed');
    }
  }

  @MessagePattern('auth.validate')
  async validateToken(@Payload() payload: { token: string }) {
    try {
      this.logger.log('NATS: Token validation request');
      const result = await this.authService.validateToken(payload.token);
      this.logger.log('NATS: Token validation successful');
      return successResponse(result);
    } catch (error) {
      this.logger.error('NATS: Token validation failed', error);
      return errorResponse('AUTH_VALIDATION_FAILED', error.message || 'Token validation failed');
    }
  }

  @MessagePattern('auth.refresh')
  async refreshToken(@Payload() payload: { refreshToken: string }) {
    try {
      this.logger.log('NATS: Token refresh request');
      const result = await this.authService.refreshToken(payload.refreshToken);
      this.logger.log('NATS: Token refresh successful');
      return successResponse(result);
    } catch (error) {
      this.logger.error('NATS: Token refresh failed', error);
      return errorResponse('AUTH_REFRESH_FAILED', error.message || 'Token refresh failed');
    }
  }

  @MessagePattern('auth.getCurrentUser')
  async getCurrentUser(@Payload() payload: { token: string }) {
    try {
      this.logger.log('NATS: Get current user request received');
      this.logger.debug(`NATS: Token (first 20 chars): ${payload.token?.substring(0, 20)}...`);

      // Validate the token and return user info
      const result = await this.authService.validateToken(payload.token);
      this.logger.debug(`NATS: validateToken result: userId=${result.user?.id}, email=${result.user?.email}`);

      return successResponse(result.user);
    } catch (error) {
      this.logger.error('NATS: Get current user failed', error);
      return errorResponse('GET_CURRENT_USER_FAILED', error.message || 'Failed to get current user information');
    }
  }

  @MessagePattern('auth.getProfile')
  async getProfile(@Payload() payload: { userId: number }) {
    try {
      this.logger.log(`NATS: Get profile request for user ID: ${payload.userId}`);

      const user = await this.userService.findOneById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      this.logger.log(`NATS: Profile retrieved successfully for user ID: ${payload.userId}`);
      return successResponse(omitPassword(user));
    } catch (error) {
      this.logger.error(`NATS: Get profile failed for user ID: ${payload.userId}`, error);
      return errorResponse('GET_PROFILE_FAILED', error.message || 'Failed to get user profile');
    }
  }
}