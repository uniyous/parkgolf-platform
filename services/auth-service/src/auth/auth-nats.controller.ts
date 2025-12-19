import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { UpdateUserDto } from '../user/dto/update-user.dto';

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
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`NATS: User login failed for: ${loginDto.email}`, error);
      return {
        success: false,
        error: {
          code: 'AUTH_USER_LOGIN_FAILED',
          message: error.message || 'Login failed',
        },
      };
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
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`NATS: Admin login failed for: ${loginDto.email}`, error);
      return {
        success: false,
        error: {
          code: 'AUTH_ADMIN_LOGIN_FAILED',
          message: error.message || 'Admin login failed',
        },
      };
    }
  }

  /**
   * @deprecated Use auth.user.login or auth.admin.login instead
   * Legacy login - tries admin first, then user (kept for backward compatibility)
   */
  @MessagePattern('auth.login')
  async login(@Payload() loginDto: LoginDto) {
    try {
      this.logger.log(`NATS: Legacy login request for: ${loginDto.email}`);

      // Check if this is an admin by trying admin authentication first
      const admin = await this.authService.validateAdmin(loginDto.email, loginDto.password);
      if (admin) {
        const result = await this.authService.adminLogin(admin);
        this.logger.log(`NATS: Admin login successful for: ${loginDto.email}`);
        return {
          success: true,
          data: result,
        };
      }

      // If not admin, try regular user authentication
      const user = await this.authService.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const result = await this.authService.login(user);
      this.logger.log(`NATS: User login successful for: ${loginDto.email}`);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`NATS: Login failed for: ${loginDto.email}`, error);
      return {
        success: false,
        error: {
          code: 'AUTH_LOGIN_FAILED',
          message: error.message || 'Login failed',
        },
      };
    }
  }

  @MessagePattern('auth.validate')
  async validateToken(@Payload() payload: { token: string }) {
    try {
      this.logger.log('NATS: Token validation request');
      const result = await this.authService.validateToken(payload.token);
      this.logger.log('NATS: Token validation successful');
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('NATS: Token validation failed', error);
      return {
        success: false,
        error: {
          code: 'AUTH_VALIDATION_FAILED',
          message: error.message || 'Token validation failed',
        },
      };
    }
  }

  @MessagePattern('auth.refresh')
  async refreshToken(@Payload() payload: { refreshToken: string }) {
    try {
      this.logger.log('NATS: Token refresh request');
      const result = await this.authService.refreshToken(payload.refreshToken);
      this.logger.log('NATS: Token refresh successful');
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('NATS: Token refresh failed', error);
      return {
        success: false,
        error: {
          code: 'AUTH_REFRESH_FAILED',
          message: error.message || 'Token refresh failed',
        },
      };
    }
  }

  @MessagePattern('auth.getCurrentUser')
  async getCurrentUser(@Payload() payload: { token: string }) {
    try {
      this.logger.log('🎯 NATS: Get current user request received');
      this.logger.log('🎯 NATS: Token (first 20 chars):', payload.token?.substring(0, 20) + '...');
      
      // Validate the token and return user info
      const result = await this.authService.validateToken(payload.token);
      this.logger.log('🎯 NATS: validateToken result:', { 
        hasUser: !!result.user, 
        userId: result.user?.id,
        userEmail: result.user?.email 
      });
      
      return {
        success: true,
        data: result.user,
      };
    } catch (error) {
      this.logger.error('🎯 NATS: Get current user failed', error);
      return {
        success: false,
        error: {
          code: 'GET_CURRENT_USER_FAILED',
          message: error.message || 'Failed to get current user information',
        },
      };
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
      
      // Remove password before returning
      const { password, ...userProfile } = user;
      this.logger.log(`NATS: Profile retrieved successfully for user ID: ${payload.userId}`);
      
      return {
        success: true,
        data: userProfile,
      };
    } catch (error) {
      this.logger.error(`NATS: Get profile failed for user ID: ${payload.userId}`, error);
      return {
        success: false,
        error: {
          code: 'GET_PROFILE_FAILED',
          message: error.message || 'Failed to get user profile',
        },
      };
    }
  }

  @MessagePattern('users.create')
  async createUser(@Payload() payload: { data: CreateUserDto; token?: string }) {
    try {
      this.logger.log(`NATS: Create user request for: ${payload.data.email}`);
      
      // For signup, we don't require token validation
      // For admin creation, we should validate the token
      if (payload.token) {
        await this.authService.validateToken(payload.token);
      }
      
      const result = await this.userService.create(payload.data);
      this.logger.log(`NATS: User created successfully: ${payload.data.email}`);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`NATS: User creation failed for: ${payload.data.email}`, error);
      return {
        success: false,
        error: {
          code: 'USER_CREATION_FAILED',
          message: error.message || 'User creation failed',
        },
      };
    }
  }

  @MessagePattern('users.list')
  async getUserList(@Payload() payload: { page: number; limit: number; token: string }) {
    try {
      this.logger.log('NATS: Get user list request');
      
      // Validate admin token
      await this.authService.validateToken(payload.token);
      
      const result = await this.userService.findAll(payload.page, payload.limit);
      this.logger.log('NATS: User list retrieved successfully');
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('NATS: Get user list failed', error);
      return {
        success: false,
        error: {
          code: 'USER_LIST_FAILED',
          message: error.message || 'Failed to get user list',
        },
      };
    }
  }

  @MessagePattern('users.findById')
  async getUserById(@Payload() payload: { userId: string; token: string }) {
    try {
      this.logger.log(`NATS: Get user by ID request: ${payload.userId}`);
      
      // Validate admin token
      await this.authService.validateToken(payload.token);
      
      const result = await this.userService.findOne(payload.userId);
      this.logger.log(`NATS: User retrieved successfully: ${payload.userId}`);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`NATS: Get user by ID failed: ${payload.userId}`, error);
      return {
        success: false,
        error: {
          code: 'USER_FIND_FAILED',
          message: error.message || 'Failed to find user',
        },
      };
    }
  }

  @MessagePattern('users.update')
  async updateUser(@Payload() payload: { userId: string; data: UpdateUserDto; token: string }) {
    try {
      this.logger.log(`NATS: Update user request: ${payload.userId}`);
      
      // Validate admin token
      await this.authService.validateToken(payload.token);
      
      const result = await this.userService.update(payload.userId, payload.data);
      this.logger.log(`NATS: User updated successfully: ${payload.userId}`);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`NATS: Update user failed: ${payload.userId}`, error);
      return {
        success: false,
        error: {
          code: 'USER_UPDATE_FAILED',
          message: error.message || 'Failed to update user',
        },
      };
    }
  }

  @MessagePattern('users.delete')
  async deleteUser(@Payload() payload: { userId: string; token: string }) {
    try {
      this.logger.log(`NATS: Delete user request: ${payload.userId}`);
      
      // Validate admin token
      await this.authService.validateToken(payload.token);
      
      const result = await this.userService.remove(parseInt(payload.userId));
      this.logger.log(`NATS: User deleted successfully: ${payload.userId}`);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`NATS: Delete user failed: ${payload.userId}`, error);
      return {
        success: false,
        error: {
          code: 'USER_DELETE_FAILED',
          message: error.message || 'Failed to delete user',
        },
      };
    }
  }

  @MessagePattern('users.stats')
  async getUserStats(@Payload() payload: { dateRange: { startDate: string; endDate: string }; token: string }) {
    try {
      this.logger.log('NATS: Get user stats request');
      
      // Validate admin token
      await this.authService.validateToken(payload.token);
      
      // TODO: Implement user statistics
      const result = {
        totalUsers: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
        // Add more stats as needed
      };
      
      this.logger.log('NATS: User stats retrieved successfully');
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('NATS: Get user stats failed', error);
      return {
        success: false,
        error: {
          code: 'USER_STATS_FAILED',
          message: error.message || 'Failed to get user statistics',
        },
      };
    }
  }
}