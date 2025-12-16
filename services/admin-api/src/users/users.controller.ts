import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query, 
  Headers,
  HttpStatus, 
  HttpException, 
  Logger 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';

@ApiTags('users')
@Controller('api/admin/users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'Get user list with filtering' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in name, username, email' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by user role' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by user status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field', example: 'name' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc/desc)', example: 'asc' })
  @ApiResponse({ status: 200, description: 'User list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserList(
    @Headers('authorization') authorization: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('sortBy') sortBy = 'name',
    @Query('sortOrder') sortOrder = 'asc'
  ) {
    try {
      const token = this.extractToken(authorization);
      const filters = {
        search,
        role,
        status,
        page: parseInt(page.toString(), 10),
        limit: parseInt(limit.toString(), 10),
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc'
      };
      
      this.logger.log(`Fetching user list with filters: ${JSON.stringify(filters)}`);
      
      const result = await this.authService.getUserList(filters, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch user list', error);
      throw this.handleError(error);
    }
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserById(
    @Param('userId') userId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching user: ${userId}`);
      
      const result = await this.authService.getUserById(userId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch user: ${userId}`, error);
      throw this.handleError(error);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create new user' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createUser(
    @Body() userData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Creating user: ${userData.username || userData.email}`);
      
      const result = await this.authService.createUser(userData, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw this.handleError(error);
    }
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update user' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating user: ${userId}`);
      
      const result = await this.authService.updateUser(userId, updateData, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update user: ${userId}`, error);
      throw this.handleError(error);
    }
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Delete user' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteUser(
    @Param('userId') userId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Deleting user: ${userId}`);
      
      const result = await this.authService.deleteUser(userId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete user: ${userId}`, error);
      throw this.handleError(error);
    }
  }

  @Patch(':userId/status')
  @ApiOperation({ summary: 'Update user status' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUserStatus(
    @Param('userId') userId: string,
    @Body() statusData: { status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' },
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating user status: ${userId} to ${statusData.status}`);
      
      const result = await this.authService.updateUserStatus(userId, statusData.status, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update user status: ${userId}`, error);
      throw this.handleError(error);
    }
  }

  @Patch(':userId/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUserRole(
    @Param('userId') userId: string,
    @Body() roleData: { role: 'ADMIN' | 'MANAGER' | 'USER' },
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating user role: ${userId} to ${roleData.role}`);
      
      const result = await this.authService.updateUserRole(userId, roleData.role, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update user role: ${userId}`, error);
      throw this.handleError(error);
    }
  }

  @Patch(':userId/permissions')
  @ApiOperation({ summary: 'Update user permissions' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'User permissions updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUserPermissions(
    @Param('userId') userId: string,
    @Body() permissionData: { permissions: string[] },
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating user permissions: ${userId}`);
      
      const result = await this.authService.updateUserPermissions(userId, permissionData.permissions, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update user permissions: ${userId}`, error);
      throw this.handleError(error);
    }
  }

  @Patch(':userId/password')
  @ApiOperation({ summary: 'Reset user password' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async resetUserPassword(
    @Param('userId') userId: string,
    @Body() passwordData: { password: string },
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Resetting password for user: ${userId}`);
      
      const result = await this.authService.resetUserPassword(userId, passwordData.password, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to reset password for user: ${userId}`, error);
      throw this.handleError(error);
    }
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);
      
      // Default to last 30 days if no date range provided
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const dateRange = {
        startDate: startDate || defaultStartDate,
        endDate: endDate || defaultEndDate
      };
      
      this.logger.log(`Fetching user statistics for range: ${dateRange.startDate} to ${dateRange.endDate}`);
      
      const result = await this.authService.getUserStats(dateRange, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch user statistics', error);
      throw this.handleError(error);
    }
  }

  private extractToken(authorization: string): string {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization token required',
          }
        },
        HttpStatus.UNAUTHORIZED
      );
    }
    return authorization.substring(7); // Remove 'Bearer ' prefix
  }

  private handleError(error: any): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    // Handle NATS timeout or connection errors
    if (error.message?.includes('timeout') || error.code === 'ECONNREFUSED') {
      return new HttpException(
        {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'User service temporarily unavailable',
          }
        },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    // Default error
    return new HttpException(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        }
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}