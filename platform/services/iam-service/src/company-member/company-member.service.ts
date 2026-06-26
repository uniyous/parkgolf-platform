import { Injectable, Logger } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { companyMembers, users } from '../db/schema';
import { AppException } from '../common/exceptions/app.exception';
import { Errors } from '../common/exceptions/catalog/error-catalog';
import {
  CreateCompanyMemberDto,
  FindCompanyMembersQueryDto,
  UpdateCompanyMemberDto,
} from './dto/company-member.dto';

const USER_COLUMNS = {
  id: true,
  email: true,
  name: true,
  phone: true,
  isActive: true,
} as const;

@Injectable()
export class CompanyMemberService {
  private readonly logger = new Logger(CompanyMemberService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async create(dto: CreateCompanyMemberDto) {
    try {
      const [member] = await this.db
        .insert(companyMembers)
        .values({
          companyId: dto.companyId,
          userId: dto.userId,
          source: dto.source || 'MANUAL',
          memo: dto.memo,
        })
        .returning();

      return this.db.query.companyMembers.findFirst({
        where: eq(companyMembers.id, member.id),
        with: { user: { columns: USER_COLUMNS } },
      });
    } catch (error: any) {
      if (error.code === '23505') {
        throw new AppException(Errors.CompanyMember.ALREADY_EXISTS);
      }
      throw error;
    }
  }

  async findByCompany(query: FindCompanyMembersQueryDto) {
    const { companyId, search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const conds: SQL[] = [eq(companyMembers.companyId, companyId)];

    if (isActive !== undefined) {
      conds.push(eq(companyMembers.isActive, isActive));
    }

    if (search) {
      const matchedUsers = await this.db
        .select({ id: users.id })
        .from(users)
        .where(
          or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`),
            ilike(users.phone, `%${search}%`),
          ),
        );
      const userIds = matchedUsers.map((u) => u.id);
      // 매칭 사용자가 없으면 결과 없음
      conds.push(inArray(companyMembers.userId, userIds.length ? userIds : [-1]));
    }

    const where = and(...conds);

    const [data, [total]] = await Promise.all([
      this.db.query.companyMembers.findMany({
        where,
        offset: skip,
        limit,
        orderBy: [desc(companyMembers.joinedAt)],
        with: { user: { columns: USER_COLUMNS } },
      }),
      this.db.select({ value: count() }).from(companyMembers).where(where),
    ]);

    return { data, total: total.value, page, limit };
  }

  async findOne(id: number) {
    const member = await this.db.query.companyMembers.findFirst({
      where: eq(companyMembers.id, id),
      with: { user: { columns: USER_COLUMNS } },
    });

    if (!member) {
      throw new AppException(Errors.CompanyMember.NOT_FOUND);
    }

    return member;
  }

  async update(id: number, dto: UpdateCompanyMemberDto) {
    const [member] = await this.db
      .select()
      .from(companyMembers)
      .where(eq(companyMembers.id, id))
      .limit(1);
    if (!member) {
      throw new AppException(Errors.CompanyMember.NOT_FOUND);
    }

    await this.db.update(companyMembers).set(dto).where(eq(companyMembers.id, id));

    return this.db.query.companyMembers.findFirst({
      where: eq(companyMembers.id, id),
      with: { user: { columns: USER_COLUMNS } },
    });
  }

  async remove(id: number) {
    const [member] = await this.db
      .select()
      .from(companyMembers)
      .where(eq(companyMembers.id, id))
      .limit(1);
    if (!member) {
      throw new AppException(Errors.CompanyMember.NOT_FOUND);
    }

    await this.db.delete(companyMembers).where(eq(companyMembers.id, id));
  }

  async addByBooking(companyId: number, userId: number) {
    await this.db
      .insert(companyMembers)
      .values({
        companyId,
        userId,
        source: 'BOOKING',
      })
      .onConflictDoNothing();

    return this.db.query.companyMembers.findFirst({
      where: and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.userId, userId),
      ),
      with: { user: { columns: USER_COLUMNS } },
    });
  }
}
