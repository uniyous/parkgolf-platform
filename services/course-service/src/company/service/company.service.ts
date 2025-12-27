import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async create(createCompanyDto: CreateCompanyDto) {
    try {
      // Convert establishedDate string to DateTime if provided
      const data: any = {
        ...createCompanyDto,
      };
      
      if (createCompanyDto.establishedDate) {
        data.establishedDate = new Date(createCompanyDto.establishedDate);
      }
      
      return await this.prisma.company.create({
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new NotFoundException('A golf company with this name or business number already exists.');
      }
      throw error;
    }
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        skip,
        take: limit,
        include: {
          _count: {
            select: { courses: true, clubs: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.company.count()
    ]);

    return {
      companies: companies.map(company => ({
        ...company,
        coursesCount: company._count.courses,
        clubsCount: company._count.clubs,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { courses: true },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return company;
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto) {
    try {
      // Convert establishedDate string to DateTime if provided
      const data: any = {
        ...updateCompanyDto,
      };
      
      if (updateCompanyDto.establishedDate) {
        data.establishedDate = new Date(updateCompanyDto.establishedDate);
      }
      
      return await this.prisma.company.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Record to update not found
          throw new NotFoundException(`Company with ID ${id} not found to update.`);
        }
        if (error.code === 'P2002') {
          // Unique constraint failed
          throw new NotFoundException('A golf company with this name or business number already exists.');
        }
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.company.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Company with ID ${id} not found to delete.`);
      }
      // P2003: Foreign key constraint failed on the field: (usually means related records exist preventing deletion)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new NotFoundException(`Cannot delete Company with ID ${id} as it has associated golf courses.`);
      }
      throw error;
    }
  }
}
