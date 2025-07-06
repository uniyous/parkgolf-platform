import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Course, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCourseDto, FindCoursesQueryDto, UpdateCourseDto } from '../dto/course.dto';

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateCourseDto): Promise<Course> {
    this.logger.log(`Attempting to create a course with name: ${createDto.name} for company ID: ${createDto.companyId}`);

    // Company 존재 여부 확인
    const company = await this.prisma.company.findUnique({
      where: { id: createDto.companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID ${createDto.companyId} not found.`);
    }

    try {
      return await this.prisma.course.create({
        data: {
          name: createDto.name,
          companyId: createDto.companyId,
          address: createDto.address,
          description: createDto.description,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Unique constraint violation (companyId, name)
        if (error.code === 'P2002') {
          throw new ConflictException(`A course with name "${createDto.name}" already exists for company ID ${createDto.companyId}.`);
        }
      } else if (error instanceof Error) {
        this.logger.error(`ailed to create course: ${error.message}`, error.stack);
      } else {
        this.logger.error(`ailed to create course: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }

  async findAll(query: FindCoursesQueryDto): Promise<{ data: Course[]; total: number; page: number; limit: number }> {
    const { companyId, name, status, page = 1, limit = 10 } = query;
    this.logger.log(`Fetching courses with query: ${JSON.stringify(query)}`);

    const where: Prisma.CourseWhereInput = {};
    if (companyId) {
      where.companyId = companyId;
    }
    if (name) {
      where.name = { contains: name, mode: 'insensitive' }; // 대소문자 구분 없이 부분 일치 검색
    }
    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [courses, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // 예시 정렬
        // include: { company: true }, // 필요시 관계 데이터 포함
      }),
      this.prisma.course.count({ where }),
    ]);

    return { data: courses, total, page, limit };
  }

  async findOne(id: number): Promise<Course> {
    this.logger.log(`Fetching course with ID: ${id}`);
    const course = await this.prisma.course.findUnique({
      where: { id },
      // include: {
      //   company: true,
      //   holes: true,
      //   courseWeeklySchedules: true,
      //   courseTimeSlots: { where: { date: { gte: new Date() } } } // 예시: 오늘 이후의 타임슬롯만
      // },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found.`);
    }
    return course;
  }

  async update(id: number, updateDto: UpdateCourseDto): Promise<Course> {
    this.logger.log(`Attempting to update course with ID: ${id}`);

    // Course 존재 여부 확인
    await this.findOne(id); // findOne 내부에서 NotFoundException 처리

    // 만약 companyId 변경을 시도하고, 해당 Company가 존재하지 않으면 에러
    if (updateDto.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: updateDto.companyId },
      });
      if (!company) {
        throw new NotFoundException(`Target company with ID ${updateDto.companyId} not found for update.`);
      }
    }

    try {
      return await this.prisma.course.update({
        where: { id },
        data: {
          name: updateDto.name,
          companyId: updateDto.companyId,
          address: updateDto.address,
          description: updateDto.description,
          phoneNumber: updateDto.phoneNumber,
          status: updateDto.status,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Unique constraint violation (companyId, name) - 업데이트 시 발생 가능 (다른 코스가 이미 해당 이름을 사용)
        if (error.code === 'P2002' && error.meta?.target === 'Course_companyId_name_key') {
          // updateDto에 name과 companyId가 모두 있어야 이 에러를 정확히 판단 가능
          // 여기서는 name만 변경 시 기존 companyId와 조합하여 판단
          throw new ConflictException(`A course with name "${updateDto.name}" might already exist for the company.`);
        }
      } else if (error instanceof Error) {
        this.logger.error(`Failed to update course ID ${id}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to update course ID ${id}: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }

  async remove(id: number): Promise<Course> {
    this.logger.log(`Attempting to delete course with ID: ${id}`);
    // Course 존재 여부 확인
    await this.findOne(id);

    // onDelete: Restrict 이므로, 관련된 Hole, CourseWeeklySchedule, CourseTimeSlot이 있으면 삭제 불가
    // 먼저 하위 레코드를 삭제하거나, Prisma 스키마에서 onDelete 규칙을 변경해야 함.
    // 여기서는 Restrict를 존중하여, 연결된 데이터가 있으면 Prisma가 에러를 발생시킬 것으로 예상.
    try {
      return await this.prisma.course.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Course with ID ${id} not found.`);
        }
        if (error.code === 'P2003' || error.code === 'P2014') {
          throw new ConflictException(
            `Cannot delete course with ID ${id} as it has related records (e.g., holes, schedules, time slots). Please delete them first.`,
          );
        }
      } else if (error instanceof Error) {
        this.logger.error(`Failed to delete course ID ${id}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to delete course ID ${id}: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }
}
