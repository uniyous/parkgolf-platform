import { Controller, Post, Body, Get, Headers, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { hasAdminRole, isAdminRole } from '../common/constants';
import { AppException, Errors } from '../common/exceptions';

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
    this.logger.log(`Admin login attempt - email: ${loginRequest.email}`);

    const result = await this.authService.login(loginRequest);

    if (!hasAdminRole(result.data?.user?.roles)) {
      throw new AppException(Errors.Auth.INSUFFICIENT_PERMISSIONS);
    }

    this.logger.log(`Admin login successful - email: ${loginRequest.email}`);
    return result;
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
    this.logger.log('Admin token refresh attempt');

    const result = await this.authService.refreshToken(body.refreshToken);

    if (!hasAdminRole(result.data?.user?.roles)) {
      throw new AppException(Errors.Auth.INSUFFICIENT_PERMISSIONS);
    }

    this.logger.log('Admin token refresh successful');
    return result;
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
    this.logger.log('Admin token validation attempt');

    const result = await this.authService.validateToken(body.token);

    if (!hasAdminRole(result.data?.user?.roles)) {
      throw new AppException(Errors.Auth.INSUFFICIENT_PERMISSIONS);
    }

    this.logger.log('Admin token validation successful');
    return result;
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current admin user information' })
  @ApiResponse({ status: 200, description: 'Returns current admin user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getCurrentUser(@Headers('authorization') authorization: string) {
    const token = this.extractToken(authorization);
    this.logger.log('Getting current admin user information');

    const result = await this.authService.getCurrentUser(token);

    if (!hasAdminRole(result.data?.roles)) {
      throw new AppException(Errors.Auth.INSUFFICIENT_PERMISSIONS);
    }

    this.logger.log(`Current admin user retrieved: ${result.data.email}`);
    return result;
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Headers('authorization') authorization: string) {
    const token = this.extractToken(authorization);
    const validateResult = await this.authService.validateToken(token);
    const adminId = validateResult.data.user.sub || validateResult.data.user.id;
    return this.authService.logout(adminId);
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
    this.logger.log(`Admin signup attempt for username: ${signupRequest.username}`);

    if (!isAdminRole(signupRequest.role)) {
      throw new AppException(Errors.Admin.INVALID_ROLE);
    }

    const result = await this.authService.createAdmin({
      email: signupRequest.email,
      password: signupRequest.password,
      name: signupRequest.name,
      roleCode: signupRequest.role,
    });

    this.logger.log(`Admin signup successful for: ${signupRequest.username}`);
    return result;
  }

  private extractToken(authorization: string): string {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new AppException(Errors.Auth.MISSING_TOKEN);
    }
    return authorization.substring(7);
  }
}
