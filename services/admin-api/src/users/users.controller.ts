import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { BearerToken } from '../common';

@ApiTags('users')
@ApiBearerAuth()
@Controller('api/admin/users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get user list with filtering' })
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
    @BearerToken() token: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('sortBy') sortBy = 'name',
    @Query('sortOrder') sortOrder = 'asc',
  ) {
    const filters = {
      search,
      role,
      status,
      page: parseInt(page.toString(), 10),
      limit: parseInt(limit.toString(), 10),
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    this.logger.log(`Fetching user list with filters: ${JSON.stringify(filters)}`);
    return this.usersService.getUserList(filters, token);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserStats(
    @BearerToken() token: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dateRange = {
      startDate: startDate || defaultStartDate,
      endDate: endDate || defaultEndDate,
    };

    this.logger.log(`Fetching user statistics for range: ${dateRange.startDate} to ${dateRange.endDate}`);
    return this.usersService.getUserStats(dateRange, token);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserById(
    @BearerToken() token: string,
    @Param('userId') userId: string,
  ) {
    this.logger.log(`Fetching user: ${userId}`);
    return this.usersService.getUserById(userId, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createUser(
    @BearerToken() token: string,
    @Body() userData: Record<string, unknown>,
  ) {
    this.logger.log(`Creating user: ${userData.username || userData.email}`);
    return this.usersService.createUser(userData, token);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUser(
    @BearerToken() token: string,
    @Param('userId') userId: string,
    @Body() updateData: Record<string, unknown>,
  ) {
    this.logger.log(`Updating user: ${userId}`);
    return this.usersService.updateUser(userId, updateData, token);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteUser(
    @BearerToken() token: string,
    @Param('userId') userId: string,
  ) {
    this.logger.log(`Deleting user: ${userId}`);
    return this.usersService.deleteUser(userId, token);
  }

  @Patch(':userId/status')
  @ApiOperation({ summary: 'Update user status' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUserStatus(
    @BearerToken() token: string,
    @Param('userId') userId: string,
    @Body() statusData: { status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' },
  ) {
    this.logger.log(`Updating user status: ${userId} to ${statusData.status}`);
    return this.usersService.updateUserStatus(userId, statusData.status, token);
  }

  @Patch(':userId/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUserRole(
    @BearerToken() token: string,
    @Param('userId') userId: string,
    @Body() roleData: { role: 'ADMIN' | 'MANAGER' | 'USER' },
  ) {
    this.logger.log(`Updating user role: ${userId} to ${roleData.role}`);
    return this.usersService.updateUserRole(userId, roleData.role, token);
  }

  @Patch(':userId/permissions')
  @ApiOperation({ summary: 'Update user permissions' })
  @ApiResponse({ status: 200, description: 'User permissions updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUserPermissions(
    @BearerToken() token: string,
    @Param('userId') userId: string,
    @Body() permissionData: { permissions: string[] },
  ) {
    this.logger.log(`Updating user permissions: ${userId}`);
    return this.usersService.updateUserPermissions(userId, permissionData.permissions, token);
  }

  @Patch(':userId/password')
  @ApiOperation({ summary: 'Reset user password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async resetUserPassword(
    @BearerToken() token: string,
    @Param('userId') userId: string,
    @Body() passwordData: { password: string },
  ) {
    this.logger.log(`Resetting password for user: ${userId}`);
    return this.usersService.resetUserPassword(userId, passwordData.password, token);
  }
}
