import { Controller, Post, Body, HttpStatus, HttpException, Logger, Get, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, LoginRequest } from './auth.service';
import { hasAdminRole, isAdminRole } from '../common/constants';

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  name: string;
  role: string;
}

@ApiTags('iam')
@Controller('api/admin/iam')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'admin@parkgolf.com' },
        password: { type: 'string', example: 'password123' }
      },
      required: ['email', 'password']
    }
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginRequest: LoginRequest) {
    const startTime = Date.now();
    try {
      this.logger.log(`[PERF] BFF Login START - email: ${loginRequest.email}`);

      const natsStartTime = Date.now();
      const result = await this.authService.login(loginRequest);
      const natsEndTime = Date.now();

      this.logger.log(`[PERF] BFF NATS round-trip: ${natsEndTime - natsStartTime}ms`);
      this.logger.log(`[PERF] Auth service response received`);

      if (!result.success || !result.data) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'LOGIN_FAILED',
              message: (result as any).error?.message || 'Login failed',
            }
          },
          HttpStatus.UNAUTHORIZED
        );
      }
      
      // Verify admin role (check roles array)
      if (!hasAdminRole(result.data.user.roles)) {
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

      this.logger.log(`[PERF] BFF Login SUCCESS - email: ${loginRequest.email}, total: ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      this.logger.error(`[PERF] BFF Login FAILED - email: ${loginRequest.email}, total: ${Date.now() - startTime}ms`, error);
      
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
      
      // Verify admin role (check roles array)
      if (!hasAdminRole(result.data.user.roles)) {
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
      
      // Verify admin role (check roles array)
      if (!hasAdminRole(result.data.user.roles)) {
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

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current admin user information' })
  @ApiResponse({ status: 200, description: 'Returns current admin user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getCurrentUser(@Headers('authorization') authorization: string) {
    try {
      if (!authorization || !authorization.startsWith('Bearer ')) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'MISSING_TOKEN',
              message: 'Authorization token is required',
            }
          },
          HttpStatus.UNAUTHORIZED
        );
      }

      const token = authorization.substring(7); // Remove 'Bearer ' prefix
      this.logger.log('Getting current admin user information');

      // Call auth-service /auth/me endpoint via NATS
      const result = await this.authService.getCurrentUser(token);

      // Check if result is valid
      if (!result || !result.success || !result.data) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'GET_USER_FAILED',
              message: result?.error?.message || 'Failed to get user information',
            }
          },
          HttpStatus.UNAUTHORIZED
        );
      }

      // Verify admin role (check roles array)
      if (!hasAdminRole(result.data.roles)) {
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

      this.logger.log(`Current admin user retrieved: ${result.data.email}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to get current admin user', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'GET_USER_FAILED',
            message: 'Failed to get current user information',
          }
        },
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  @Post('signup')
  @ApiOperation({ summary: 'Admin signup' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'newadmin' },
        email: { type: 'string', example: 'admin@example.com' },
        password: { type: 'string', example: 'password123' },
        name: { type: 'string', example: 'Admin User' },
        role: { type: 'string', example: 'ADMIN', enum: ['ADMIN', 'MODERATOR', 'VIEWER'] }
      },
      required: ['username', 'email', 'password', 'name', 'role']
    }
  })
  @ApiResponse({ status: 201, description: 'Signup successful' })
  @ApiResponse({ status: 400, description: 'Invalid data or user already exists' })
  async signup(@Body() signupRequest: SignupRequest) {
    try {
      this.logger.log(`Admin signup attempt for username: ${signupRequest.username}`);
      
      // Validate admin role
      if (!isAdminRole(signupRequest.role)) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'INVALID_ROLE',
              message: 'Invalid admin role. Must be one of: ADMIN, SUPPORT, MANAGER, STAFF, VIEWER',
            }
          },
          HttpStatus.BAD_REQUEST
        );
      }

      // Create admin via NATS (auth-service will save to admins table)
      const result = await this.authService.createAdmin({
        email: signupRequest.email,
        password: signupRequest.password,
        name: signupRequest.name,
        roleCode: signupRequest.role,
      });

      this.logger.log(`Admin signup successful for: ${signupRequest.username}`);
      
      return {
        success: true,
        data: {
          message: 'Admin account created successfully.',
          user: {
            id: result.data?.id,
            username: signupRequest.username,
            email: signupRequest.email,
            name: signupRequest.name,
            role: signupRequest.role,
            isActive: true,
          }
        }
      };
      
    } catch (error) {
      this.logger.error(`Admin signup failed for: ${signupRequest.username}`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Handle common signup errors
      const errorMessage = error.message || 'Signup failed';
      let statusCode = HttpStatus.BAD_REQUEST;
      let errorCode = 'SIGNUP_FAILED';
      
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        errorCode = 'USER_ALREADY_EXISTS';
        statusCode = HttpStatus.CONFLICT;
      }
      
      throw new HttpException(
        {
          success: false,
          error: {
            code: errorCode,
            message: errorMessage,
          }
        },
        statusCode
      );
    }
  }

}