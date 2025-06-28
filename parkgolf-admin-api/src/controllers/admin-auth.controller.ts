import { Controller, Post, Body, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthNatsService, LoginRequest } from '../services/auth-nats.service';

@ApiTags('auth')
@Controller('api/admin/auth')
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);

  constructor(private readonly authService: AuthNatsService) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'admin' },
        password: { type: 'string', example: 'password123' }
      },
      required: ['username', 'password']
    }
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginRequest: LoginRequest) {
    try {
      this.logger.log(`Admin login attempt for username: ${loginRequest.username}`);
      
      const result = await this.authService.login(loginRequest);
      
      // Verify admin role
      if (!this.isAdminRole(result.data.user.role)) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PRIVILEGES',
              message: 'Admin privileges required',
            }
          },
          HttpStatus.FORBIDDEN
        );
      }

      this.logger.log(`Admin login successful for: ${loginRequest.username}`);
      return result;
    } catch (error) {
      this.logger.error(`Admin login failed for: ${loginRequest.username}`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'LOGIN_FAILED',
            message: 'Invalid credentials',
          }
        },
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh admin token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string' }
      },
      required: ['refreshToken']
    }
  })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() body: { refreshToken: string }) {
    try {
      this.logger.log('Admin token refresh attempt');
      
      const result = await this.authService.refreshToken(body.refreshToken);
      
      // Verify admin role
      if (!this.isAdminRole(result.data.user.role)) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PRIVILEGES',
              message: 'Admin privileges required',
            }
          },
          HttpStatus.FORBIDDEN
        );
      }

      this.logger.log('Admin token refresh successful');
      return result;
    } catch (error) {
      this.logger.error('Admin token refresh failed', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'REFRESH_FAILED',
            message: 'Invalid refresh token',
          }
        },
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate admin token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' }
      },
      required: ['token']
    }
  })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async validate(@Body() body: { token: string }) {
    try {
      this.logger.log('Admin token validation attempt');
      
      const result = await this.authService.validateToken(body.token);
      
      // Verify admin role
      if (!this.isAdminRole(result.data.user.role)) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PRIVILEGES',
              message: 'Admin privileges required',
            }
          },
          HttpStatus.FORBIDDEN
        );
      }

      this.logger.log('Admin token validation successful');
      return result;
    } catch (error) {
      this.logger.error('Admin token validation failed', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid token',
          }
        },
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  private isAdminRole(role: string): boolean {
    const adminRoles = ['admin', 'super_admin', 'ADMIN', 'SUPER_ADMIN'];
    return adminRoles.includes(role.toLowerCase()) || adminRoles.includes(role.toUpperCase());
  }
}