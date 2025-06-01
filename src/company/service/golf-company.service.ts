import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGolfCompanyDto } from '../dto/create-golf-company.dto';
import { UpdateGolfCompanyDto } from '../dto/update-golf-company.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class GolfCompanyService {
  constructor(private prisma: PrismaService) {}

  async create(createGolfCompanyDto: CreateGolfCompanyDto) {
    try {
      return await this.prisma.golfCompany.create({
        data: createGolfCompanyDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new NotFoundException('A golf company with this name already exists.');
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.golfCompany.findMany({
      include: { golfCourses: true },
    });
  }

  async findOne(id: number) {
    const company = await this.prisma.golfCompany.findUnique({
      where: { id },
      include: { golfCourses: true },
    });
    if (!company) {
      throw new NotFoundException(`GolfCompany with ID ${id} not found`);
    }
    return company;
  }

  async update(id: number, updateGolfCompanyDto: UpdateGolfCompanyDto) {
    try {
      return await this.prisma.golfCompany.update({
        where: { id },
        data: updateGolfCompanyDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Record to update not found
          throw new NotFoundException(`GolfCompany with ID ${id} not found to update.`);
        }
        if (error.code === 'P2002') {
          // Unique constraint failed
          throw new NotFoundException('A golf company with this name already exists.');
        }
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.golfCompany.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`GolfCompany with ID ${id} not found to delete.`);
      }
      // P2003: Foreign key constraint failed on the field: (usually means related records exist preventing deletion)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new NotFoundException(`Cannot delete GolfCompany with ID ${id} as it has associated golf courses.`);
      }
      throw error;
    }
  }
}
