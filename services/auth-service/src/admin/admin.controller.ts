import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  async create(@Body() createAdminDto: CreateAdminDto, @Req() req: Request) {
    const admin = await this.adminService.create(createAdminDto);
    
    // Log activity
    const currentAdminId = (req.user as any)?.adminId;
    if (currentAdminId) {
      await this.adminService.logActivity(
        currentAdminId,
        'CREATE_ADMIN',
        'admin',
        { createdAdminId: admin.id, email: admin.email },
        req.ip,
        req.get('user-agent'),
      );
    }
    
    const { password, ...result } = admin;
    return result;
  }

  @Get()
  async findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const where: any = {};
    
    if (role) {
      where.roleCode = role;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const admins = await this.adminService.findAll({
      skip,
      take,
      where,
      orderBy: { createdAt: 'desc' },
    });
    
    // Remove passwords from response
    return admins.map(({ password, ...admin }) => admin);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const admin = await this.adminService.findOne(id);
    const { password, ...result } = admin;
    return result;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAdminDto: UpdateAdminDto,
    @Req() req: Request,
  ) {
    const admin = await this.adminService.update(id, updateAdminDto);
    
    // Log activity
    const currentAdminId = (req.user as any)?.adminId;
    if (currentAdminId) {
      await this.adminService.logActivity(
        currentAdminId,
        'UPDATE_ADMIN',
        'admin',
        { updatedAdminId: id, changes: updateAdminDto },
        req.ip,
        req.get('user-agent'),
      );
    }
    
    const { password, ...result } = admin;
    return result;
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const admin = await this.adminService.remove(id);
    
    // Log activity
    const currentAdminId = (req.user as any)?.adminId;
    if (currentAdminId) {
      await this.adminService.logActivity(
        currentAdminId,
        'DELETE_ADMIN',
        'admin',
        { deletedAdminId: id, email: admin.email },
        req.ip,
        req.get('user-agent'),
      );
    }
    
    const { password, ...result } = admin;
    return result;
  }

  @Post(':id/permissions')
  async updatePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body('permissions') permissions: string[],
    @Req() req: Request,
  ) {
    const admin = await this.adminService.updatePermissions(id, permissions);
    
    // Log activity
    const currentAdminId = (req.user as any)?.adminId;
    if (currentAdminId) {
      await this.adminService.logActivity(
        currentAdminId,
        'UPDATE_ADMIN_PERMISSIONS',
        'admin',
        { adminId: id, permissions },
        req.ip,
        req.get('user-agent'),
      );
    }
    
    const { password, ...result } = admin;
    return result;
  }

  @Get('count/stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('permissions')
  async getAllPermissions() {
    return this.adminService.getAllPermissions();
  }

  @Get('permissions/category/:category')
  async getPermissionsByCategory(@Param('category') category: string) {
    return this.adminService.getPermissionsByCategory(category);
  }

  @Get('roles')
  async getAllRoles() {
    return this.adminService.getAllRoles();
  }

  @Get('roles/admin')
  async getAdminRoles() {
    return this.adminService.getAdminRoles();
  }

  @Get('roles/:roleCode/permissions')
  async getRolePermissions(@Param('roleCode') roleCode: string) {
    return this.adminService.getRolePermissions(roleCode);
  }
}