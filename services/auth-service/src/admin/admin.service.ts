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
        roleCode: data.roleCode || 'VIEWER',
      },
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    page?: number;
    limit?: number;
    where?: Prisma.AdminWhereInput;
    orderBy?: Prisma.AdminOrderByWithRelationInput;
  }): Promise<{ admins: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const { where, orderBy } = params || {};

    // 페이지네이션 처리
    const page = params?.page || 1;
    const limit = params?.limit || params?.take || 20;
    const skip = params?.skip || (page - 1) * limit;

    // 병렬로 데이터와 카운트 조회
    const [admins, total] = await Promise.all([
      this.prisma.admin.findMany({
        skip,
        take: limit,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include: {
          role: {
            select: {
              code: true,
              name: true,
              level: true,
              rolePermissions: {
                select: {
                  permissionCode: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.admin.count({ where }),
    ]);

    // 역할 기반 권한을 permissions 배열로 변환
    const transformedAdmins = admins.map((admin) => ({
      ...admin,
      permissions: admin.role?.rolePermissions?.map((rp) => ({
        permission: rp.permissionCode,
      })) || [],
    }));

    return {
      admins: transformedAdmins,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

    await this.prisma.admin.update({
      where: { id },
      data: updateData,
    });

    // 업데이트된 admin을 역할 기반 권한과 함께 반환
    return this.findOne(id);
  }

  async remove(id: number): Promise<Admin> {
    const admin = await this.findOne(id);

    // Prevent deleting the last ADMIN
    if (admin.roleCode === 'ADMIN') {
      const adminCount = await this.prisma.admin.count({
        where: { roleCode: 'ADMIN' },
      });

      if (adminCount <= 1) {
        throw new ConflictException('Cannot delete the last ADMIN');
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
    // 단일 쿼리로 전체 통계와 역할별 카운트 조회
    const [total, active, roleGrouped] = await Promise.all([
      this.prisma.admin.count(),
      this.prisma.admin.count({ where: { isActive: true } }),
      this.prisma.admin.groupBy({
        by: ['roleCode'],
        _count: { id: true },
      }),
    ]);

    // Build byRole object from grouped results
    const byRoleStats: Record<string, number> = {};
    roleGrouped.forEach((group) => {
      byRoleStats[group.roleCode] = group._count.id;
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

  async getRolesWithPermissions(userType?: string): Promise<any[]> {
    const where: any = { isActive: true };
    if (userType) {
      where.userType = userType;
    }

    // 단일 쿼리로 역할과 권한을 함께 조회
    const roles = await this.prisma.roleMaster.findMany({
      where,
      orderBy: [
        { userType: 'asc' },
        { level: 'desc' },
      ],
      include: {
        rolePermissions: {
          select: {
            permissionCode: true,
          },
        },
      },
    });

    // 권한 코드 배열로 변환
    return roles.map(role => ({
      code: role.code,
      name: role.name,
      description: role.description,
      userType: role.userType,
      level: role.level,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map(rp => rp.permissionCode),
    }));
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