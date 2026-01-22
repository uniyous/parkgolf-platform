import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company, CompanyStatus, Prisma } from '@prisma/client';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    // Check if company code already exists
    const existingByCode = await this.prisma.company.findUnique({
      where: { code: createCompanyDto.code },
    });
    if (existingByCode) {
      throw new ConflictException(`Company with code '${createCompanyDto.code}' already exists`);
    }

    // Check if email already exists
    if (createCompanyDto.email) {
      const existingByEmail = await this.prisma.company.findUnique({
        where: { email: createCompanyDto.email },
      });
      if (existingByEmail) {
        throw new ConflictException(`Company with email '${createCompanyDto.email}' already exists`);
      }
    }

    // Check if business number already exists
    if (createCompanyDto.businessNumber) {
      const existingByBn = await this.prisma.company.findUnique({
        where: { businessNumber: createCompanyDto.businessNumber },
      });
      if (existingByBn) {
        throw new ConflictException(`Company with business number '${createCompanyDto.businessNumber}' already exists`);
      }
    }

    return this.prisma.company.create({
      data: {
        name: createCompanyDto.name,
        code: createCompanyDto.code,
        description: createCompanyDto.description,
        businessNumber: createCompanyDto.businessNumber,
        address: createCompanyDto.address,
        phoneNumber: createCompanyDto.phoneNumber,
        email: createCompanyDto.email,
        website: createCompanyDto.website,
        logoUrl: createCompanyDto.logoUrl,
        status: createCompanyDto.status || CompanyStatus.ACTIVE,
        isActive: createCompanyDto.isActive ?? true,
        metadata: createCompanyDto.metadata,
      },
    });
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    status?: CompanyStatus;
    isActive?: boolean;
    search?: string;
  }): Promise<{ companies: Company[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, status, isActive, search } = options || {};
    const skip = (page - 1) * limit;

    const where: Prisma.CompanyWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { businessNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { companies, total, page, limit };
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return company;
  }

  async findByCode(code: string): Promise<Company> {
    const company = await this.prisma.company.findUnique({
      where: { code },
    });

    if (!company) {
      throw new NotFoundException(`Company with code '${code}' not found`);
    }

    return company;
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);

    // Check for unique constraints if updating
    if (updateCompanyDto.code && updateCompanyDto.code !== company.code) {
      const existingByCode = await this.prisma.company.findUnique({
        where: { code: updateCompanyDto.code },
      });
      if (existingByCode) {
        throw new ConflictException(`Company with code '${updateCompanyDto.code}' already exists`);
      }
    }

    if (updateCompanyDto.email && updateCompanyDto.email !== company.email) {
      const existingByEmail = await this.prisma.company.findUnique({
        where: { email: updateCompanyDto.email },
      });
      if (existingByEmail) {
        throw new ConflictException(`Company with email '${updateCompanyDto.email}' already exists`);
      }
    }

    if (updateCompanyDto.businessNumber && updateCompanyDto.businessNumber !== company.businessNumber) {
      const existingByBn = await this.prisma.company.findUnique({
        where: { businessNumber: updateCompanyDto.businessNumber },
      });
      if (existingByBn) {
        throw new ConflictException(`Company with business number '${updateCompanyDto.businessNumber}' already exists`);
      }
    }

    return this.prisma.company.update({
      where: { id },
      data: updateCompanyDto,
    });
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);

    // Check if company has any admin associations
    const adminCompanyCount = await this.prisma.adminCompany.count({
      where: { companyId: id },
    });

    if (adminCompanyCount > 0) {
      throw new ConflictException(
        `Cannot delete company with ID ${id}. It has ${adminCompanyCount} admin associations.`
      );
    }

    await this.prisma.company.delete({
      where: { id },
    });
  }

  async updateStatus(id: number, status: CompanyStatus): Promise<Company> {
    await this.findOne(id);
    return this.prisma.company.update({
      where: { id },
      data: { status },
    });
  }

  async getAdmins(companyId: number): Promise<any[]> {
    await this.findOne(companyId);

    const adminCompanies = await this.prisma.adminCompany.findMany({
      where: { companyId, isActive: true },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            department: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        companyRole: {
          select: {
            code: true,
            name: true,
            level: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return adminCompanies.map((ac) => ({
      ...ac.admin,
      companyRole: ac.companyRole,
      isPrimary: ac.isPrimary,
      assignedAt: ac.createdAt,
    }));
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    pending: number;
  }> {
    const [total, active, inactive, suspended, pending] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { status: CompanyStatus.ACTIVE } }),
      this.prisma.company.count({ where: { status: CompanyStatus.INACTIVE } }),
      this.prisma.company.count({ where: { status: CompanyStatus.SUSPENDED } }),
      this.prisma.company.count({ where: { status: CompanyStatus.PENDING } }),
    ]);

    return { total, active, inactive, suspended, pending };
  }
}
