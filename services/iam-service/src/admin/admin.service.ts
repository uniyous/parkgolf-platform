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

  async create(createAdminDto: CreateAdminDto): Promise<any> {
    const { password, companyId, roleCode, ...data } = createAdminDto;

    // Check if admin with same email exists
    const existing = await this.prisma.admin.findFirst({
      where: { email: data.email }
    });

    if (existing) {
      throw new ConflictException('Admin with this email already exists');
    }

    // Verify company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId }
    });
    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin with AdminCompany relation
    const admin = await this.prisma.admin.create({
      data: {
        ...data,
        password: hashedPassword,
        companies: {
          create: {
            companyId,
            companyRoleCode: roleCode || 'COMPANY_VIEWER',
            isPrimary: true,
          },
        },
      },
      include: {
        companies: {
          include: {
            company: true,
          },
        },
      },
    });

    // Return with computed roleCode
    const primaryCompany = admin.companies?.find((c) => c.isPrimary) || admin.companies?.[0];
    return {
      ...admin,
      roleCode: primaryCompany?.companyRoleCode || 'COMPANY_VIEWER',
    };
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

    // 병렬로 데이터와 카운트 조회 (목록에서는 권한 정보 제외)
    const [admins, total] = await Promise.all([
      this.prisma.admin.findMany({
        skip,
        take: limit,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          department: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          // AdminCompany를 통한 회사-역할 관계
          companies: {
            where: { isActive: true },
            select: {
              id: true,
              companyId: true,
              companyRoleCode: true,
              isPrimary: true,
              company: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  companyType: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.admin.count({ where }),
    ]);

    // 목록용 변환 (주 소속 역할코드 추가)
    const transformedAdmins = admins.map((admin) => {
      const primaryCompany = admin.companies?.find((c) => c.isPrimary) || admin.companies?.[0];
      return {
        ...admin,
        roleCode: primaryCompany?.companyRoleCode || 'COMPANY_VIEWER',
        permissions: [],
      };
    });

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
        // AdminCompany를 통한 회사-역할 관계
        companies: {
          where: { isActive: true },
          include: {
            company: true,
            companyRole: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    // 주 소속 회사 찾기 (isPrimary=true 또는 첫 번째)
    const primaryCompany = admin.companies?.find((c) => c.isPrimary) || admin.companies?.[0];
    const primaryRole = primaryCompany?.companyRole;

    // 역할 기반 권한을 permissions 배열로 변환
    const permissions = primaryRole?.rolePermissions?.map((rp) => ({
      permission: rp.permission.code,
    })) || [];

    return {
      ...admin,
      // 레거시 호환성을 위한 roleCode (주 소속의 역할 코드)
      roleCode: primaryCompany?.companyRoleCode || 'COMPANY_VIEWER',
      permissions,
    };
  }

  async findByEmail(email: string): Promise<any> {
    const startTime = Date.now();
    this.logger.log(`[PERF] AdminService.findByEmail START - ${email}`);

    const admin = await this.prisma.admin.findUnique({
      where: { email },
      include: {
        // AdminCompany를 통한 회사-역할 관계
        companies: {
          where: { isActive: true },
          include: {
            company: true,
            companyRole: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    this.logger.log(`[PERF] AdminService.findByEmail (prisma query): ${Date.now() - startTime}ms`);

    if (!admin) {
      this.logger.log(`[PERF] AdminService.findByEmail NOT FOUND - total: ${Date.now() - startTime}ms`);
      return null;
    }

    // 주 소속 회사 찾기 (isPrimary=true 또는 첫 번째)
    const primaryCompany = admin.companies?.find((c) => c.isPrimary) || admin.companies?.[0];
    const primaryRole = primaryCompany?.companyRole;

    // 역할 기반 권한을 permissions 배열로 변환
    const permissions = primaryRole?.rolePermissions?.map((rp) => ({
      permission: rp.permission.code,
    })) || [];

    this.logger.log(`[PERF] AdminService.findByEmail SUCCESS - ${email}, companies: ${admin.companies?.length || 0}, permissions: ${permissions.length}, total: ${Date.now() - startTime}ms`);

    return {
      ...admin,
      // 레거시 호환성을 위한 roleCode (주 소속의 역할 코드)
      roleCode: primaryCompany?.companyRoleCode || 'COMPANY_VIEWER',
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

    // Prevent deleting the last PLATFORM_ADMIN
    if (admin.roleCode === 'PLATFORM_ADMIN') {
      const platformAdminCount = await this.prisma.adminCompany.count({
        where: {
          companyRoleCode: 'PLATFORM_ADMIN',
          isActive: true,
        },
      });

      if (platformAdminCount <= 1) {
        throw new ConflictException('Cannot delete the last PLATFORM_ADMIN');
      }
    }

    return this.prisma.admin.delete({
      where: { id },
    });
  }

  async validateAdmin(email: string, password: string): Promise<Admin | null> {
    const startTime = Date.now();
    this.logger.log(`[PERF] AdminService.validateAdmin START - ${email}`);

    // DB Query: findByEmail
    const dbStartTime = Date.now();
    const admin = await this.findByEmail(email);
    this.logger.log(`[PERF] AdminService.validateAdmin (DB findByEmail): ${Date.now() - dbStartTime}ms`);
    this.logger.log(`[PERF] Admin found: ${!!admin}, permissions: ${admin?.permissions?.length || 0}`);

    if (!admin) {
      this.logger.log(`[PERF] AdminService.validateAdmin FAILED (not found) - total: ${Date.now() - startTime}ms`);
      return null;
    }

    // bcrypt compare
    const bcryptStartTime = Date.now();
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    this.logger.log(`[PERF] AdminService.validateAdmin (bcrypt compare): ${Date.now() - bcryptStartTime}ms`);

    if (!isPasswordValid) {
      this.logger.log(`[PERF] AdminService.validateAdmin FAILED (wrong password) - total: ${Date.now() - startTime}ms`);
      return null;
    }

    if (!admin.isActive) {
      this.logger.log(`[PERF] AdminService.validateAdmin FAILED (inactive) - total: ${Date.now() - startTime}ms`);
      throw new UnauthorizedException('Account is inactive');
    }

    // Update last login
    const updateStartTime = Date.now();
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });
    this.logger.log(`[PERF] AdminService.validateAdmin (DB updateLastLogin): ${Date.now() - updateStartTime}ms`);

    this.logger.log(`[PERF] AdminService.validateAdmin SUCCESS - total: ${Date.now() - startTime}ms`);
    return admin;
  }

  async count(where?: Prisma.AdminWhereInput): Promise<number> {
    return this.prisma.admin.count({ where });
  }

  async getStats(): Promise<any> {
    // AdminCompany 테이블에서 역할별 통계 조회
    const [total, active, roleGrouped] = await Promise.all([
      this.prisma.admin.count(),
      this.prisma.admin.count({ where: { isActive: true } }),
      this.prisma.adminCompany.groupBy({
        by: ['companyRoleCode'],
        where: { isActive: true },
        _count: { id: true },
      }),
    ]);

    // Build byRole object from grouped results
    const byRoleStats: Record<string, number> = {};
    roleGrouped.forEach((group) => {
      byRoleStats[group.companyRoleCode] = group._count.id;
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