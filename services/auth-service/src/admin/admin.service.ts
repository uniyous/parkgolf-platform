import { Injectable, ConflictException, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import * as bcrypt from 'bcrypt';
import { Admin, Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  async create(createAdminDto: CreateAdminDto): Promise<Admin> {
    const { password, ...data } = createAdminDto;
    
    // Check if admin with same username or email exists
    const existing = await this.prisma.admin.findFirst({
      where: {
        OR: [
          { email: data.email }
        ]
      }
    });

    if (existing) {
      throw new ConflictException('Admin with this username or email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.admin.create({
      data: {
        ...data,
        password: hashedPassword,
        roleCode: data.roleCode || 'READONLY_STAFF',
      },
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.AdminWhereInput;
    orderBy?: Prisma.AdminOrderByWithRelationInput;
  }): Promise<any[]> {
    const { skip, take, where, orderBy } = params || {};

    const admins = await this.prisma.admin.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // 역할 기반 권한을 permissions 배열로 변환
    return admins.map((admin) => ({
      ...admin,
      permissions: admin.role?.rolePermissions?.map((rp) => ({
        permission: rp.permission.code,
      })) || [],
    }));
  }

  async findOne(id: number): Promise<any> {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    // 역할 기반 권한을 permissions 배열로 변환
    return {
      ...admin,
      permissions: admin.role?.rolePermissions?.map((rp) => ({
        permission: rp.permission.code,
      })) || [],
    };
  }

  async findByEmail(email: string): Promise<any> {
    const admin = await this.prisma.admin.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!admin) {
      return null;
    }

    // 역할 기반 권한을 permissions 배열로 변환
    const permissions = admin.role?.rolePermissions?.map((rp) => ({
      permission: rp.permission.code,
    })) || [];

    this.logger.debug(`findByEmail - ${email} permissions: [${permissions.map(p => p.permission).join(', ')}]`);

    return {
      ...admin,
      permissions,
    };
  }

  async update(id: number, updateAdminDto: UpdateAdminDto): Promise<Admin> {
    const admin = await this.findOne(id);
    
    const { password, email, ...data } = updateAdminDto;
    
    // Check if new email already exists (if changed)
    if (email) {
      const existing = await this.prisma.admin.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { email },
          ],
        },
      });

      if (existing) {
        throw new ConflictException('Admin with this email already exists');
      }
    }

    // Prepare update data
    const updateData: Prisma.AdminUpdateInput = {
      ...data,
      email,
    };

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    return this.prisma.admin.update({
      where: { id },
      data: updateData,
      include: {
        permissions: true,
      },
    });
  }

  async remove(id: number): Promise<Admin> {
    const admin = await this.findOne(id);
    
    // Prevent deleting the last PLATFORM_OWNER
    if (admin.roleCode === 'PLATFORM_OWNER') {
      const ownerCount = await this.prisma.admin.count({
        where: { roleCode: 'PLATFORM_OWNER' },
      });
      
      if (ownerCount <= 1) {
        throw new ConflictException('Cannot delete the last PLATFORM_OWNER');
      }
    }

    return this.prisma.admin.delete({
      where: { id },
    });
  }

  async validateAdmin(email: string, password: string): Promise<Admin | null> {
    const admin = await this.findByEmail(email);
    console.log('🔍 validateAdmin - admin found with permissions:', admin?.permissions?.length || 0);
    
    if (!admin) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    if (!isPasswordValid) {
      return null;
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Update last login
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return admin;
  }

  async count(where?: Prisma.AdminWhereInput): Promise<number> {
    return this.prisma.admin.count({ where });
  }

  async getStats(): Promise<any> {
    // Get all active admin roles from RoleMaster
    const adminRoles = await this.prisma.roleMaster.findMany({
      where: { 
        userType: 'ADMIN',
        isActive: true 
      },
      orderBy: { level: 'desc' },
    });

    const [total, active, byRole] = await Promise.all([
      this.count(),
      this.count({ isActive: true }),
      Promise.all(
        adminRoles.map(role => 
          this.count({ roleCode: role.code })
        )
      ),
    ]);

    // Build dynamic byRole object
    const byRoleStats: Record<string, number> = {};
    adminRoles.forEach((role, index) => {
      byRoleStats[role.code] = byRole[index];
    });

    return {
      total,
      active,
      inactive: total - active,
      byRole: byRoleStats,
    };
  }

  async getAllPermissions(): Promise<any[]> {
    return this.prisma.permissionMaster.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { code: 'asc' },
      ],
    });
  }

  async getAllRoles(): Promise<any[]> {
    return this.prisma.roleMaster.findMany({
      where: { isActive: true },
      orderBy: [
        { userType: 'asc' },
        { level: 'desc' },
      ],
    });
  }

  async getRolePermissions(roleCode: string): Promise<string[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { 
        roleCode,
        permission: {
          isActive: true
        }
      },
      include: {
        permission: true
      }
    });
    
    return rolePermissions.map(rp => rp.permissionCode);
  }

  async getPermissionsByCategory(category?: string): Promise<any[]> {
    const where: any = { isActive: true };
    if (category) {
      where.category = category;
    }

    return this.prisma.permissionMaster.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { level: 'desc' },
        { code: 'asc' },
      ],
    });
  }

  async getAdminRoles(): Promise<any[]> {
    return this.prisma.roleMaster.findMany({
      where: { 
        userType: 'ADMIN',
        isActive: true 
      },
      orderBy: [
        { level: 'desc' },
        { code: 'asc' },
      ],
    });
  }

  // 개별 권한 관리는 제거됨 - 역할 기반 권한만 사용
  // 권한 변경은 역할(roleCode) 변경을 통해 수행
  async updatePermissions(adminId: number, _permissions: string[]): Promise<Admin> {
    // 개별 권한 테이블이 삭제되어 역할 기반으로만 권한 관리
    // 권한을 변경하려면 admin.update()를 통해 roleCode를 변경해야 함
    this.logger.warn(`updatePermissions is deprecated. Use role-based permissions by updating roleCode.`);
    return this.findOne(adminId);
  }

  async logActivity(
    adminId: number,
    action: string,
    resource?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.adminActivityLog.create({
      data: {
        adminId,
        action,
        resource,
        details,
        ipAddress,
        userAgent,
      },
    });
  }
}