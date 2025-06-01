import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GolfCourse, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateGolfCourseDto, FindGolfCoursesQueryDto, UpdateGolfCourseDto } from '../dto/golf-course.dto';

@Injectable()
export class GolfCourseService {
  private readonly logger = new Logger(GolfCourseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateGolfCourseDto): Promise<GolfCourse> {
    this.logger.log(`Attempting to create a golf course with name: ${createDto.name} for company ID: ${createDto.golfCompanyId}`);

    // GolfCompany 존재 여부 확인
    const golfCompany = await this.prisma.golfCompany.findUnique({
      where: { id: createDto.golfCompanyId },
    });
    if (!golfCompany) {
      throw new NotFoundException(`Golf company with ID ${createDto.golfCompanyId} not found.`);
    }

    try {
      return await this.prisma.golfCourse.create({
        data: {
          name: createDto.name,
          golfCompanyId: createDto.golfCompanyId,
          location: createDto.location,
          description: createDto.description,
          holeCount: createDto.holeCount,
          imageUrl: createDto.imageUrl,
          contactInfo: createDto.contactInfo,
          status: createDto.status,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Unique constraint violation (golfCompanyId, name)
        if (error.code === 'P2002') {
          throw new ConflictException(`A golf course with name "${createDto.name}" already exists for company ID ${createDto.golfCompanyId}.`);
        }
      } else if (error instanceof Error) {
        this.logger.error(`ailed to create golf course: ${error.message}`, error.stack);
      } else {
        this.logger.error(`ailed to create golf course: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }

  async findAll(query: FindGolfCoursesQueryDto): Promise<{ data: GolfCourse[]; total: number; page: number; limit: number }> {
    const { golfCompanyId, name, status, page = 1, limit = 10 } = query;
    this.logger.log(`Fetching golf courses with query: ${JSON.stringify(query)}`);

    const where: Prisma.GolfCourseWhereInput = {};
    if (golfCompanyId) {
      where.golfCompanyId = golfCompanyId;
    }
    if (name) {
      where.name = { contains: name, mode: 'insensitive' }; // 대소문자 구분 없이 부분 일치 검색
    }
    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [golfCourses, total] = await this.prisma.$transaction([
      this.prisma.golfCourse.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // 예시 정렬
        // include: { golfCompany: true }, // 필요시 관계 데이터 포함
      }),
      this.prisma.golfCourse.count({ where }),
    ]);

    return { data: golfCourses, total, page, limit };
  }

  async findOne(id: number): Promise<GolfCourse> {
    this.logger.log(`Fetching golf course with ID: ${id}`);
    const golfCourse = await this.prisma.golfCourse.findUnique({
      where: { id },
      // include: {
      //   golfCompany: true,
      //   golfHoles: true,
      //   courseWeeklySchedules: true,
      //   courseTimeSlots: { where: { date: { gte: new Date() } } } // 예시: 오늘 이후의 타임슬롯만
      // },
    });
    if (!golfCourse) {
      throw new NotFoundException(`Golf course with ID ${id} not found.`);
    }
    return golfCourse;
  }

  async update(id: number, updateDto: UpdateGolfCourseDto): Promise<GolfCourse> {
    this.logger.log(`Attempting to update golf course with ID: ${id}`);

    // GolfCourse 존재 여부 확인
    await this.findOne(id); // findOne 내부에서 NotFoundException 처리

    // 만약 golfCompanyId 변경을 시도하고, 해당 GolfCompany가 존재하지 않으면 에러
    if (updateDto.golfCompanyId) {
      const golfCompany = await this.prisma.golfCompany.findUnique({
        where: { id: updateDto.golfCompanyId },
      });
      if (!golfCompany) {
        throw new NotFoundException(`Target golf company with ID ${updateDto.golfCompanyId} not found for update.`);
      }
    }

    try {
      return await this.prisma.golfCourse.update({
        where: { id },
        data: {
          name: updateDto.name,
          // golfCompanyId: updateDto.golfCompanyId, // 주석 처리: 회사 변경은 신중해야 함. 필요시 주석 해제.
          location: updateDto.location,
          description: updateDto.description,
          holeCount: updateDto.holeCount,
          imageUrl: updateDto.imageUrl,
          contactInfo: updateDto.contactInfo,
          status: updateDto.status,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Unique constraint violation (golfCompanyId, name) - 업데이트 시 발생 가능 (다른 코스가 이미 해당 이름을 사용)
        if (error.code === 'P2002' && error.meta?.target === 'GolfCourse_golfCompanyId_name_key') {
          // updateDto에 name과 golfCompanyId가 모두 있어야 이 에러를 정확히 판단 가능
          // 여기서는 name만 변경 시 기존 golfCompanyId와 조합하여 판단
          throw new ConflictException(`A golf course with name "${updateDto.name}" might already exist for the company.`);
        }
      } else if (error instanceof Error) {
        this.logger.error(`Failed to update golf course ID ${id}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to update golf course ID ${id}: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }

  async remove(id: number): Promise<GolfCourse> {
    this.logger.log(`Attempting to delete golf course with ID: ${id}`);
    // GolfCourse 존재 여부 확인
    await this.findOne(id);

    // onDelete: Restrict 이므로, 관련된 GolfHole, CourseWeeklySchedule, CourseTimeSlot이 있으면 삭제 불가
    // 먼저 하위 레코드를 삭제하거나, Prisma 스키마에서 onDelete 규칙을 변경해야 함.
    // 여기서는 Restrict를 존중하여, 연결된 데이터가 있으면 Prisma가 에러를 발생시킬 것으로 예상.
    try {
      return await this.prisma.golfCourse.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Golf course with ID ${id} not found.`);
        }
        if (error.code === 'P2003' || error.code === 'P2014') {
          throw new ConflictException(
            `Cannot delete golf course with ID ${id} as it has related records (e.g., holes, schedules, time slots). Please delete them first.`,
          );
        }
      } else if (error instanceof Error) {
        this.logger.error(`Failed to delete golf course ID ${id}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to delete golf course ID ${id}: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }
}
