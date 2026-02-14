import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { Errors } from '../common/exceptions/catalog/error-catalog';
import {
  CreateCompanyMemberDto,
  FindCompanyMembersQueryDto,
  UpdateCompanyMemberDto,
} from './dto/company-member.dto';

@Injectable()
export class CompanyMemberService {
  private readonly logger = new Logger(CompanyMemberService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompanyMemberDto) {
    try {
      return await this.prisma.companyMember.create({
        data: {
          companyId: dto.companyId,
          userId: dto.userId,
          source: dto.source || 'MANUAL',
          memo: dto.memo,
        },
        include: {
          user: {
            select: { id: true, email: true, name: true, phone: true, isActive: true },
          },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppException(Errors.CompanyMember.ALREADY_EXISTS);
      }
      throw error;
    }
  }

  async findByCompany(query: FindCompanyMembersQueryDto) {
    const { companyId, search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.companyMember.findMany({
        where,
        skip,
        take: limit,
        orderBy: { joinedAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, name: true, phone: true, isActive: true },
          },
        },
      }),
      this.prisma.companyMember.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: number) {
    const member = await this.prisma.companyMember.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true, phone: true, isActive: true },
        },
      },
    });

    if (!member) {
      throw new AppException(Errors.CompanyMember.NOT_FOUND);
    }

    return member;
  }

  async update(id: number, dto: UpdateCompanyMemberDto) {
    const member = await this.prisma.companyMember.findUnique({ where: { id } });
    if (!member) {
      throw new AppException(Errors.CompanyMember.NOT_FOUND);
    }

    return this.prisma.companyMember.update({
      where: { id },
      data: dto,
      include: {
        user: {
          select: { id: true, email: true, name: true, phone: true, isActive: true },
        },
      },
    });
  }

  async remove(id: number) {
    const member = await this.prisma.companyMember.findUnique({ where: { id } });
    if (!member) {
      throw new AppException(Errors.CompanyMember.NOT_FOUND);
    }

    await this.prisma.companyMember.delete({ where: { id } });
  }

  async addByBooking(companyId: number, userId: number) {
    return this.prisma.companyMember.upsert({
      where: { companyId_userId: { companyId, userId } },
      create: {
        companyId,
        userId,
        source: 'BOOKING',
      },
      update: {},
      include: {
        user: {
          select: { id: true, email: true, name: true, phone: true, isActive: true },
        },
      },
    });
  }
}
