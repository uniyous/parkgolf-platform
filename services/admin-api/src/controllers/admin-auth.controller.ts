import { Controller, Post, Body, HttpStatus, HttpException, Logger, Get, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthNatsService, LoginRequest } from '../services/auth-nats.service';

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  name: string;
  role: string;
}

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
        email: { type: 'string', example: 'admin@parkgolf.com' },
        password: { type: 'string', example: 'password123' }
      },
      required: ['email', 'password']
    }
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginRequest: LoginRequest) {
    try {
      this.logger.log(`Admin login attempt for email: ${loginRequest.email}`);
      
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

      this.logger.log(`Admin login successful for: ${loginRequest.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Admin login failed for: ${loginRequest.email}`, error);
      
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
      
      // Verify admin role
      if (!this.isAdminRole(result.data.role)) {
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
      if (!this.isValidAdminRole(signupRequest.role)) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'INVALID_ROLE',
              message: 'Invalid admin role. Must be ADMIN, MODERATOR, or VIEWER',
            }
          },
          HttpStatus.BAD_REQUEST
        );
      }

      // Create user via NATS (auth-service will handle the actual creation)
      const result = await this.authService.createUser({
        username: signupRequest.username,
        email: signupRequest.email,
        password: signupRequest.password,
        name: signupRequest.name,
        role: signupRequest.role,
      }, null); // No admin token needed for signup

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

  private isAdminRole(role: string): boolean {
    const adminRoles = ['admin', 'super_admin', 'ADMIN', 'SUPER_ADMIN'];
    return adminRoles.includes(role.toLowerCase()) || adminRoles.includes(role.toUpperCase());
  }

  private isValidAdminRole(role: string): boolean {
    const validRoles = ['ADMIN', 'MODERATOR', 'VIEWER'];
    return validRoles.includes(role.toUpperCase());
  }
}