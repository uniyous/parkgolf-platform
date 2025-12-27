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
import { AdminService } from './admins.service';

@ApiTags('admins')
@Controller('api/admin/admins')
export class AdminsController {
  private readonly logger = new Logger(AdminsController.name);

  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get admin list with filtering' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in name, username, email' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by admin role' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Admin list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAdminList(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);
      const pageNum = parseInt(page.toString(), 10) || 1;
      const limitNum = parseInt(limit.toString(), 10) || 20;
      const filters = {
        search,
        role,
        isActive: isActive === undefined ? undefined : isActive === 'true',
      };

      this.logger.log(`Fetching admin list with filters: ${JSON.stringify(filters)}, page: ${pageNum}, limit: ${limitNum}`);

      const result = await this.adminService.getAdminList(filters, pageNum, limitNum, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch admin list', error);
      throw this.handleError(error);
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get admin statistics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Admin statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAdminStats(
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);
      
      this.logger.log('Fetching admin statistics');
      
      const result = await this.adminService.getAdminStats({}, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch admin statistics', error);
      throw this.handleError(error);
    }
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Get all available permissions' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPermissions(
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);

      this.logger.log('Fetching permissions list');

      const result = await this.adminService.getPermissionList(token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch permissions', error);
      throw this.handleError(error);
    }
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all available roles' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'userType', required: false, description: 'Filter by user type (ADMIN or USER)' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRoles(
    @Query('userType') userType?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);

      this.logger.log('Fetching roles list');

      const result = await this.adminService.getRoleList(userType, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch roles', error);
      throw this.handleError(error);
    }
  }

  @Get('roles/with-permissions')
  @ApiOperation({ summary: 'Get all roles with their permissions' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'userType', required: false, description: 'Filter by user type (ADMIN or USER)' })
  @ApiResponse({ status: 200, description: 'Roles with permissions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRolesWithPermissions(
    @Query('userType') userType?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);

      this.logger.log('Fetching roles with permissions');

      const result = await this.adminService.getRolesWithPermissions(userType, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch roles with permissions', error);
      throw this.handleError(error);
    }
  }

  @Get('roles/:roleCode/permissions')
  @ApiOperation({ summary: 'Get permissions for a specific role' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Role permissions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRolePermissions(
    @Param('roleCode') roleCode: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);

      this.logger.log(`Fetching permissions for role: ${roleCode}`);

      const result = await this.adminService.getRolePermissions(roleCode, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch permissions for role: ${roleCode}`, error);
      throw this.handleError(error);
    }
  }

  @Get(':adminId')
  @ApiOperation({ summary: 'Get admin by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Admin retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAdminById(
    @Param('adminId') adminId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching admin: ${adminId}`);
      
      const result = await this.adminService.getAdminById(adminId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch admin: ${adminId}`, error);
      throw this.handleError(error);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create new admin' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid admin data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createAdmin(
    @Body() adminData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Creating admin: ${adminData.username || adminData.email}`);
      
      const result = await this.adminService.createAdmin(adminData, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to create admin', error);
      throw this.handleError(error);
    }
  }

  @Patch(':adminId')
  @ApiOperation({ summary: 'Update admin' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Admin updated successfully' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateAdmin(
    @Param('adminId') adminId: string,
    @Body() updateData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating admin: ${adminId}`);
      
      const result = await this.adminService.updateAdmin(adminId, updateData, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update admin: ${adminId}`, error);
      throw this.handleError(error);
    }
  }

  @Delete(':adminId')
  @ApiOperation({ summary: 'Delete admin' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Admin deleted successfully' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAdmin(
    @Param('adminId') adminId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Deleting admin: ${adminId}`);
      
      const result = await this.adminService.deleteAdmin(adminId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete admin: ${adminId}`, error);
      throw this.handleError(error);
    }
  }

  @Patch(':adminId/status')
  @ApiOperation({ summary: 'Update admin status' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Admin status updated successfully' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateAdminStatus(
    @Param('adminId') adminId: string,
    @Body() statusData: { isActive: boolean },
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating admin status: ${adminId} to ${statusData.isActive}`);
      
      const result = await this.adminService.updateAdminStatus(adminId, statusData.isActive, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update admin status: ${adminId}`, error);
      throw this.handleError(error);
    }
  }

  @Post(':adminId/permissions')
  @ApiOperation({ summary: 'Update admin permissions' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Admin permissions updated successfully' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateAdminPermissions(
    @Param('adminId') adminId: string,
    @Body() permissionData: { permissionIds: number[] },
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating admin permissions: ${adminId}`);
      
      const result = await this.adminService.updateAdminPermissions(
        adminId, 
        permissionData.permissionIds, 
        token
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to update admin permissions: ${adminId}`, error);
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
            message: 'Admin service temporarily unavailable',
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