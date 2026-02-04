import { Controller, Post, Body, HttpStatus, HttpException, Logger, Get, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { hasAdminRole, isAdminRole } from '../common/constants';

@ApiTags('iam')
@Controller('api/admin/iam')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
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
  async login(@Body() loginRequest: LoginDto) {
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

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Headers('authorization') authorization: string) {
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

      const token = authorization.substring(7);
      const validateResult = await this.authService.validateToken(token);

      if (!validateResult?.success || !validateResult?.data?.user) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Invalid token',
            }
          },
          HttpStatus.UNAUTHORIZED
        );
      }

      const adminId = validateResult.data.user.sub || validateResult.data.user.id;
      return this.authService.logout(adminId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'LOGOUT_FAILED',
            message: 'Logout failed',
          }
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('signup')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
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
  async signup(@Body() signupRequest: SignupDto) {
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
      return result;
      
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