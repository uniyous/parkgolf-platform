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
import { AdminService } from './admins.service';
import { BearerToken } from '../common';
import { CreateAdminDto, UpdateAdminDto } from './dto/admin.dto';

@ApiTags('admins')
@ApiBearerAuth()
@Controller('api/admin/admins')
export class AdminsController {
  private readonly logger = new Logger(AdminsController.name);

  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get admin list with filtering' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in name, username, email' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by admin role' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Admin list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAdminList(
    @BearerToken() token: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const pageNum = parseInt(page.toString(), 10) || 1;
    const limitNum = parseInt(limit.toString(), 10) || 20;
    const filters = {
      search,
      role,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    };

    this.logger.log(`Fetching admin list with filters: ${JSON.stringify(filters)}, page: ${pageNum}, limit: ${limitNum}`);

    return this.adminService.getAdminList(filters, pageNum, limitNum, token);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get admin statistics' })
  @ApiResponse({ status: 200, description: 'Admin statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAdminStats(@BearerToken() token: string) {
    this.logger.log('Fetching admin statistics');
    return this.adminService.getAdminStats({}, token);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Get all available permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPermissions(@BearerToken() token: string) {
    this.logger.log('Fetching permissions list');
    return this.adminService.getPermissionList(token);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all available roles' })
  @ApiQuery({ name: 'userType', required: false, description: 'Filter by user type (ADMIN or USER)' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRoles(
    @BearerToken() token: string,
    @Query('userType') userType?: string,
  ) {
    this.logger.log('Fetching roles list');
    return this.adminService.getRoleList(userType, token);
  }

  @Get('roles/with-permissions')
  @ApiOperation({ summary: 'Get all roles with their permissions' })
  @ApiQuery({ name: 'userType', required: false, description: 'Filter by user type (ADMIN or USER)' })
  @ApiResponse({ status: 200, description: 'Roles with permissions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRolesWithPermissions(
    @BearerToken() token: string,
    @Query('userType') userType?: string,
  ) {
    this.logger.log('Fetching roles with permissions');
    return this.adminService.getRolesWithPermissions(userType, token);
  }

  @Get('roles/:roleCode/permissions')
  @ApiOperation({ summary: 'Get permissions for a specific role' })
  @ApiResponse({ status: 200, description: 'Role permissions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRolePermissions(
    @BearerToken() token: string,
    @Param('roleCode') roleCode: string,
  ) {
    this.logger.log(`Fetching permissions for role: ${roleCode}`);
    return this.adminService.getRolePermissions(roleCode, token);
  }

  @Get(':adminId')
  @ApiOperation({ summary: 'Get admin by ID' })
  @ApiResponse({ status: 200, description: 'Admin retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAdminById(
    @BearerToken() token: string,
    @Param('adminId') adminId: string,
  ) {
    this.logger.log(`Fetching admin: ${adminId}`);
    return this.adminService.getAdminById(adminId, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new admin' })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid admin data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createAdmin(
    @BearerToken() token: string,
    @Body() adminData: CreateAdminDto,
  ) {
    this.logger.log(`Creating admin: ${adminData.name || adminData.email}`);
    return this.adminService.createAdmin(adminData, token);
  }

  @Patch(':adminId')
  @ApiOperation({ summary: 'Update admin' })
  @ApiResponse({ status: 200, description: 'Admin updated successfully' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateAdmin(
    @BearerToken() token: string,
    @Param('adminId') adminId: string,
    @Body() updateData: UpdateAdminDto,
  ) {
    this.logger.log(`Updating admin: ${adminId}`);
    return this.adminService.updateAdmin(adminId, updateData, token);
  }

  @Delete(':adminId')
  @ApiOperation({ summary: 'Delete admin' })
  @ApiResponse({ status: 200, description: 'Admin deleted successfully' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAdmin(
    @BearerToken() token: string,
    @Param('adminId') adminId: string,
  ) {
    this.logger.log(`Deleting admin: ${adminId}`);
    return this.adminService.deleteAdmin(adminId, token);
  }

  @Patch(':adminId/status')
  @ApiOperation({ summary: 'Update admin status' })
  @ApiResponse({ status: 200, description: 'Admin status updated successfully' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateAdminStatus(
    @BearerToken() token: string,
    @Param('adminId') adminId: string,
    @Body() statusData: { isActive: boolean },
  ) {
    this.logger.log(`Updating admin status: ${adminId} to ${statusData.isActive}`);
    return this.adminService.updateAdminStatus(adminId, statusData.isActive, token);
  }

  @Post(':adminId/permissions')
  @ApiOperation({ summary: 'Update admin permissions' })
  @ApiResponse({ status: 200, description: 'Admin permissions updated successfully' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateAdminPermissions(
    @BearerToken() token: string,
    @Param('adminId') adminId: string,
    @Body() permissionData: { permissionIds: number[] },
  ) {
    this.logger.log(`Updating admin permissions: ${adminId}`);
    return this.adminService.updateAdminPermissions(adminId, permissionData.permissionIds, token);
  }
}
