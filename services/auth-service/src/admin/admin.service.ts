import { Injectable, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import * as bcrypt from 'bcrypt';
import { Admin, AdminRole, Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async create(createAdminDto: CreateAdminDto): Promise<Admin> {
    const { password, ...data } = createAdminDto;
    
    // Check if admin with same username or email exists
    const existing = await this.prisma.admin.findFirst({
      where: {
        OR: [
          { username: data.username },
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
        role: data.role || AdminRole.VIEWER,
      },
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.AdminWhereInput;
    orderBy?: Prisma.AdminOrderByWithRelationInput;
  }): Promise<Admin[]> {
    const { skip, take, where, orderBy } = params || {};
    
    return this.prisma.admin.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async findOne(id: number): Promise<Admin> {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    return admin;
  }

  async findByUsername(username: string): Promise<Admin | null> {
    return this.prisma.admin.findUnique({
      where: { username },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async update(id: number, updateAdminDto: UpdateAdminDto): Promise<Admin> {
    const admin = await this.findOne(id);
    
    const { password, username, email, ...data } = updateAdminDto;
    
    // Check if new username or email already exists (if changed)
    if (username || email) {
      const existing = await this.prisma.admin.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                username ? { username } : {},
                email ? { email } : {},
              ],
            },
          ],
        },
      });

      if (existing) {
        throw new ConflictException('Admin with this username or email already exists');
      }
    }

    // Prepare update data
    const updateData: Prisma.AdminUpdateInput = {
      ...data,
      username,
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
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async remove(id: number): Promise<Admin> {
    const admin = await this.findOne(id);
    
    // Prevent deleting the last SUPER_ADMIN
    if (admin.role === AdminRole.SUPER_ADMIN) {
      const superAdminCount = await this.prisma.admin.count({
        where: { role: AdminRole.SUPER_ADMIN },
      });
      
      if (superAdminCount <= 1) {
        throw new ConflictException('Cannot delete the last SUPER_ADMIN');
      }
    }

    return this.prisma.admin.delete({
      where: { id },
    });
  }

  async validateAdmin(username: string, password: string): Promise<Admin | null> {
    const admin = await this.findByUsername(username);
    
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
    const [total, active, byRole] = await Promise.all([
      this.count(),
      this.count({ isActive: true }),
      Promise.all([
        this.count({ role: 'SUPER_ADMIN' }),
        this.count({ role: 'ADMIN' }),
        this.count({ role: 'MODERATOR' }),
        this.count({ role: 'VIEWER' }),
      ]),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      byRole: {
        SUPER_ADMIN: byRole[0],
        ADMIN: byRole[1],
        MODERATOR: byRole[2],
        VIEWER: byRole[3],
      },
    };
  }

  async getAllPermissions(): Promise<any[]> {
    return this.prisma.permission.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async updatePermissions(adminId: number, permissionIds: number[]): Promise<Admin> {
    // First, delete all existing permissions
    await this.prisma.adminPermission.deleteMany({
      where: { adminId },
    });

    // Then, create new permissions
    if (permissionIds.length > 0) {
      await this.prisma.adminPermission.createMany({
        data: permissionIds.map(permissionId => ({
          adminId,
          permissionId,
        })),
      });
    }

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