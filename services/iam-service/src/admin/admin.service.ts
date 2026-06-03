import { Injectable, ConflictException, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { DrizzleService } from '../db/drizzle.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import * as bcrypt from 'bcrypt';
import type { Admin } from '../db/schema';
import {
  admins,
  adminCompanies,
  companies,
  permissionMasters,
  roleMasters,
  rolePermissions,
  adminActivityLogs,
} from '../db/schema';
import {
  eq,
  and,
  or,
  ne,
  inArray,
  ilike,
  count,
  asc,
  desc,
  type SQL,
} from 'drizzle-orm';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  /**
   * 컨트롤러에서 전달하는 Prisma 형태의 WHERE 절(any)을 Drizzle 조건으로 변환.
   * 지원: OR(name/email contains insensitive), isActive, companies.some(companyId/companyRoleCode/isActive)
   */
  private buildAdminWhere(where?: any): SQL | undefined {
    if (!where) return undefined;
    const conds: SQL[] = [];

    if (Array.isArray(where.OR)) {
      const orConds: SQL[] = [];
      for (const clause of where.OR) {
        if (clause?.name?.contains !== undefined) {
          orConds.push(ilike(admins.name, `%${clause.name.contains}%`));
        }
        if (clause?.email?.contains !== undefined) {
          orConds.push(ilike(admins.email, `%${clause.email.contains}%`));
        }
      }
      if (orConds.length) conds.push(or(...orConds));
    }

    if (where.isActive !== undefined) {
      conds.push(eq(admins.isActive, where.isActive));
    }

    if (where.companies?.some) {
      const some = where.companies.some;
      const acConds: SQL[] = [];
      if (some.companyId !== undefined) acConds.push(eq(adminCompanies.companyId, some.companyId));
      if (some.companyRoleCode !== undefined) acConds.push(eq(adminCompanies.companyRoleCode, some.companyRoleCode));
      if (some.isActive !== undefined) acConds.push(eq(adminCompanies.isActive, some.isActive));
      const subquery = this.db
        .select({ adminId: adminCompanies.adminId })
        .from(adminCompanies)
        .where(acConds.length ? and(...acConds) : undefined);
      conds.push(inArray(admins.id, subquery));
    }

    return conds.length ? and(...conds) : undefined;
  }

  async create(createAdminDto: CreateAdminDto): Promise<any> {
    const { password, companyId, roleCode, ...data } = createAdminDto;

    // Check if admin with same email exists
    const existing = await this.db.query.admins.findFirst({
      where: eq(admins.email, data.email),
    });

    if (existing) {
      throw new ConflictException('Admin with this email already exists');
    }

    // Verify company exists
    const [company] = await this.db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin with AdminCompany relation
    const admin = await this.db.transaction(async (tx) => {
      const [createdAdmin] = await tx
        .insert(admins)
        .values({
          ...data,
          password: hashedPassword,
        })
        .returning();

      await tx.insert(adminCompanies).values({
        adminId: createdAdmin.id,
        companyId,
        companyRoleCode: roleCode || 'COMPANY_VIEWER',
        isPrimary: true,
      });

      return tx.query.admins.findFirst({
        where: eq(admins.id, createdAdmin.id),
        with: {
          companies: {
            with: {
              company: true,
            },
          },
        },
      });
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
    where?: any;
    orderBy?: any;
  }): Promise<{ admins: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const { where, orderBy } = params || {};

    // 페이지네이션 처리
    const page = params?.page || 1;
    const limit = params?.limit || params?.take || 20;
    const skip = params?.skip || (page - 1) * limit;

    const condition = this.buildAdminWhere(where);

    // 정렬 (기본: createdAt desc)
    const orderByClause =
      orderBy?.createdAt === 'asc' ? asc(admins.createdAt) : desc(admins.createdAt);

    // 병렬로 데이터와 카운트 조회 (목록에서는 권한 정보 제외)
    const [adminRows, totalResult] = await Promise.all([
      this.db.query.admins.findMany({
        offset: skip,
        limit,
        where: condition,
        orderBy: orderByClause,
        columns: {
          id: true,
          email: true,
          name: true,
          phone: true,
          department: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        // AdminCompany를 통한 회사-역할 관계
        with: {
          companies: {
            where: eq(adminCompanies.isActive, true),
            columns: {
              id: true,
              companyId: true,
              companyRoleCode: true,
              isPrimary: true,
            },
            with: {
              company: {
                columns: {
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
      this.db.select({ value: count() }).from(admins).where(condition),
    ]);

    const total = totalResult[0].value;

    // 목록용 변환 (주 소속 역할코드 추가)
    const transformedAdmins = adminRows.map((admin) => {
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
    const admin = await this.db.query.admins.findFirst({
      where: eq(admins.id, id),
      with: {
        // AdminCompany를 통한 회사-역할 관계
        companies: {
          where: eq(adminCompanies.isActive, true),
          with: {
            company: true,
            companyRole: {
              with: {
                rolePermissions: {
                  with: {
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

    const admin = await this.db.query.admins.findFirst({
      where: eq(admins.email, email),
      with: {
        // AdminCompany를 통한 회사-역할 관계
        companies: {
          where: eq(adminCompanies.isActive, true),
          with: {
            company: true,
            companyRole: {
              with: {
                rolePermissions: {
                  with: {
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
      const existing = await this.db.query.admins.findFirst({
        where: and(ne(admins.id, id), eq(admins.email, email)),
      });

      if (existing) {
        throw new ConflictException('Admin with this email already exists');
      }
    }

    // Prepare update data
    const updateData: any = {
      ...data,
      email,
    };

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await this.db.update(admins).set(updateData).where(eq(admins.id, id));

    // 업데이트된 admin을 역할 기반 권한과 함께 반환
    return this.findOne(id);
  }

  async remove(id: number): Promise<Admin> {
    const admin = await this.findOne(id);

    // Prevent deleting the last PLATFORM_ADMIN
    if (admin.roleCode === 'PLATFORM_ADMIN') {
      const [platformAdminCountResult] = await this.db
        .select({ value: count() })
        .from(adminCompanies)
        .where(and(eq(adminCompanies.companyRoleCode, 'PLATFORM_ADMIN'), eq(adminCompanies.isActive, true)));
      const platformAdminCount = platformAdminCountResult.value;

      if (platformAdminCount <= 1) {
        throw new ConflictException('Cannot delete the last PLATFORM_ADMIN');
      }
    }

    const [deleted] = await this.db.delete(admins).where(eq(admins.id, id)).returning();
    return deleted;
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
    await this.db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, admin.id));
    this.logger.log(`[PERF] AdminService.validateAdmin (DB updateLastLogin): ${Date.now() - updateStartTime}ms`);

    this.logger.log(`[PERF] AdminService.validateAdmin SUCCESS - total: ${Date.now() - startTime}ms`);
    return admin;
  }

  async count(where?: any): Promise<number> {
    const [r] = await this.db.select({ value: count() }).from(admins).where(this.buildAdminWhere(where));
    return r.value;
  }

  async getStats(): Promise<any> {
    // AdminCompany 테이블에서 역할별 통계 조회
    const [totalResult, activeResult, roleGrouped] = await Promise.all([
      this.db.select({ value: count() }).from(admins),
      this.db.select({ value: count() }).from(admins).where(eq(admins.isActive, true)),
      this.db
        .select({ companyRoleCode: adminCompanies.companyRoleCode, count: count(adminCompanies.id) })
        .from(adminCompanies)
        .where(eq(adminCompanies.isActive, true))
        .groupBy(adminCompanies.companyRoleCode),
    ]);

    const total = totalResult[0].value;
    const active = activeResult[0].value;

    // Build byRole object from grouped results
    const byRoleStats: Record<string, number> = {};
    roleGrouped.forEach((group) => {
      byRoleStats[group.companyRoleCode] = group.count;
    });

    return {
      total,
      active,
      inactive: total - active,
      byRole: byRoleStats,
    };
  }

  async getAllPermissions(): Promise<any[]> {
    return this.db.query.permissionMasters.findMany({
      where: eq(permissionMasters.isActive, true),
      orderBy: [asc(permissionMasters.category), asc(permissionMasters.code)],
    });
  }

  async getAllRoles(): Promise<any[]> {
    return this.db.query.roleMasters.findMany({
      where: eq(roleMasters.isActive, true),
      orderBy: [asc(roleMasters.userType), desc(roleMasters.level)],
    });
  }

  async getRolePermissions(roleCode: string): Promise<string[]> {
    const rolePerms = await this.db.query.rolePermissions.findMany({
      where: eq(rolePermissions.roleCode, roleCode),
      with: {
        permission: true,
      },
    });

    return rolePerms.filter((rp) => rp.permission?.isActive).map((rp) => rp.permissionCode);
  }

  async getPermissionsByCategory(category?: string): Promise<any[]> {
    const conds: SQL[] = [eq(permissionMasters.isActive, true)];
    if (category) {
      conds.push(eq(permissionMasters.category, category));
    }

    return this.db.query.permissionMasters.findMany({
      where: and(...conds),
      orderBy: [asc(permissionMasters.category), desc(permissionMasters.level), asc(permissionMasters.code)],
    });
  }

  async getAdminRoles(): Promise<any[]> {
    return this.db.query.roleMasters.findMany({
      where: and(eq(roleMasters.userType, 'ADMIN'), eq(roleMasters.isActive, true)),
      orderBy: [desc(roleMasters.level), asc(roleMasters.code)],
    });
  }

  async getRolesWithPermissions(userType?: string): Promise<any[]> {
    const conds: SQL[] = [eq(roleMasters.isActive, true)];
    if (userType) {
      conds.push(eq(roleMasters.userType, userType));
    }

    // 단일 쿼리로 역할과 권한을 함께 조회
    const roles = await this.db.query.roleMasters.findMany({
      where: and(...conds),
      orderBy: [asc(roleMasters.userType), desc(roleMasters.level)],
      with: {
        rolePermissions: {
          columns: {
            permissionCode: true,
          },
        },
      },
    });

    // 권한 코드 배열로 변환
    return roles.map((role) => ({
      code: role.code,
      name: role.name,
      description: role.description,
      userType: role.userType,
      level: role.level,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rp) => rp.permissionCode),
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
    await this.db.insert(adminActivityLogs).values({
      adminId,
      action,
      resource,
      details,
      ipAddress,
      userAgent,
    });
  }
}
