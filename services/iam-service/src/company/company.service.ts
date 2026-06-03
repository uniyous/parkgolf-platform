import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleService } from '../db/drizzle.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyStatus } from '../contracts/enums';
import { eq, and, or, ilike, count, desc, type SQL } from 'drizzle-orm';
import { companies, adminCompanies } from '../db/schema';
import type { Company } from '../db/schema';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    // Check if company code already exists
    const [existingByCode] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.code, createCompanyDto.code))
      .limit(1);
    if (existingByCode) {
      throw new ConflictException(`Company with code '${createCompanyDto.code}' already exists`);
    }

    // Check if email already exists
    if (createCompanyDto.email) {
      const [existingByEmail] = await this.db
        .select()
        .from(companies)
        .where(eq(companies.email, createCompanyDto.email))
        .limit(1);
      if (existingByEmail) {
        throw new ConflictException(`Company with email '${createCompanyDto.email}' already exists`);
      }
    }

    // Check if business number already exists
    if (createCompanyDto.businessNumber) {
      const [existingByBn] = await this.db
        .select()
        .from(companies)
        .where(eq(companies.businessNumber, createCompanyDto.businessNumber))
        .limit(1);
      if (existingByBn) {
        throw new ConflictException(`Company with business number '${createCompanyDto.businessNumber}' already exists`);
      }
    }

    const [row] = await this.db
      .insert(companies)
      .values({
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
      })
      .returning();
    return row;
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

    const conds: SQL[] = [];

    if (status) {
      conds.push(eq(companies.status, status));
    }

    if (isActive !== undefined) {
      conds.push(eq(companies.isActive, isActive));
    }

    if (search) {
      conds.push(
        or(
          ilike(companies.name, `%${search}%`),
          ilike(companies.code, `%${search}%`),
          ilike(companies.email, `%${search}%`),
          ilike(companies.businessNumber, `%${search}%`),
        ),
      );
    }

    const where = conds.length ? and(...conds) : undefined;

    const [companyList, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(companies)
        .where(where)
        .offset(skip)
        .limit(limit)
        .orderBy(desc(companies.createdAt)),
      this.db.select({ value: count() }).from(companies).where(where),
    ]);

    return { companies: companyList, total: totalRow.value, page, limit };
  }

  async findOne(id: number): Promise<Company> {
    const [company] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return company;
  }

  async findByCode(code: string): Promise<Company> {
    const [company] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.code, code))
      .limit(1);

    if (!company) {
      throw new NotFoundException(`Company with code '${code}' not found`);
    }

    return company;
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);

    // Check for unique constraints if updating
    if (updateCompanyDto.code && updateCompanyDto.code !== company.code) {
      const [existingByCode] = await this.db
        .select()
        .from(companies)
        .where(eq(companies.code, updateCompanyDto.code))
        .limit(1);
      if (existingByCode) {
        throw new ConflictException(`Company with code '${updateCompanyDto.code}' already exists`);
      }
    }

    if (updateCompanyDto.email && updateCompanyDto.email !== company.email) {
      const [existingByEmail] = await this.db
        .select()
        .from(companies)
        .where(eq(companies.email, updateCompanyDto.email))
        .limit(1);
      if (existingByEmail) {
        throw new ConflictException(`Company with email '${updateCompanyDto.email}' already exists`);
      }
    }

    if (updateCompanyDto.businessNumber && updateCompanyDto.businessNumber !== company.businessNumber) {
      const [existingByBn] = await this.db
        .select()
        .from(companies)
        .where(eq(companies.businessNumber, updateCompanyDto.businessNumber))
        .limit(1);
      if (existingByBn) {
        throw new ConflictException(`Company with business number '${updateCompanyDto.businessNumber}' already exists`);
      }
    }

    const [row] = await this.db
      .update(companies)
      .set(updateCompanyDto)
      .where(eq(companies.id, id))
      .returning();
    return row;
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);

    // Check if company has any admin associations
    const [adminCompanyCountRow] = await this.db
      .select({ value: count() })
      .from(adminCompanies)
      .where(eq(adminCompanies.companyId, id));
    const adminCompanyCount = adminCompanyCountRow.value;

    if (adminCompanyCount > 0) {
      throw new ConflictException(
        `Cannot delete company with ID ${id}. It has ${adminCompanyCount} admin associations.`
      );
    }

    await this.db.delete(companies).where(eq(companies.id, id));
  }

  async updateStatus(id: number, status: CompanyStatus): Promise<Company> {
    await this.findOne(id);
    const [row] = await this.db
      .update(companies)
      .set({ status })
      .where(eq(companies.id, id))
      .returning();
    return row;
  }

  async getAdmins(companyId: number): Promise<any[]> {
    await this.findOne(companyId);

    const adminCompanyList = await this.db.query.adminCompanies.findMany({
      where: and(eq(adminCompanies.companyId, companyId), eq(adminCompanies.isActive, true)),
      with: {
        admin: {
          columns: {
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
          columns: {
            code: true,
            name: true,
            level: true,
          },
        },
      },
      orderBy: desc(adminCompanies.createdAt),
    });

    return adminCompanyList.map((ac) => ({
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
    const [
      [totalRow],
      [activeRow],
      [inactiveRow],
      [suspendedRow],
      [pendingRow],
    ] = await Promise.all([
      this.db.select({ value: count() }).from(companies),
      this.db.select({ value: count() }).from(companies).where(eq(companies.status, CompanyStatus.ACTIVE)),
      this.db.select({ value: count() }).from(companies).where(eq(companies.status, CompanyStatus.INACTIVE)),
      this.db.select({ value: count() }).from(companies).where(eq(companies.status, CompanyStatus.SUSPENDED)),
      this.db.select({ value: count() }).from(companies).where(eq(companies.status, CompanyStatus.PENDING)),
    ]);

    return {
      total: totalRow.value,
      active: activeRow.value,
      inactive: inactiveRow.value,
      suspended: suspendedRow.value,
      pending: pendingRow.value,
    };
  }
}
