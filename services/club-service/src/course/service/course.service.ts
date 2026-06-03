import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, gte, ilike, lte, type SQL } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { pgCode } from '../../db/db-error';
import { courses, holes } from '../../db/schema';
import type { Course } from '../../db/schema';
import { CreateCourseDto, FindCoursesQueryDto, UpdateCourseDto } from '../dto/course.dto';

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async create(createDto: CreateCourseDto): Promise<Course> {
    this.logger.log(`Attempting to create a course with name: ${createDto.name} for company ID: ${createDto.companyId}`);

    // Note: Company validation should be done via NATS 'iam.companies.getById' if needed
    // companyId is a cross-database reference to iam_db.companies

    try {
      const [row] = await this.db
        .insert(courses)
        .values({
          name: createDto.name,
          code: createDto.code,
          subtitle: createDto.subtitle,
          companyId: createDto.companyId,
          clubId: createDto.clubId,
          holeCount: createDto.holeCount || 9,
          par: createDto.par || 36,
          totalDistance: createDto.totalDistance,
          difficulty: createDto.difficulty || 3,
          scenicRating: createDto.scenicRating || 3,
          courseRating: createDto.courseRating,
          slopeRating: createDto.slopeRating,
          imageUrl: createDto.imageUrl,
          description: createDto.description,
          status: createDto.status,
        })
        .returning();
      return row;
    } catch (error: unknown) {
      if (pgCode(error) === '23505') {
        throw new ConflictException(`A course with name "${createDto.name}" already exists for company ID ${createDto.companyId}.`);
      }
      throw error;
    }
  }

  async findAll(query: FindCoursesQueryDto): Promise<{ data: Course[]; total: number; page: number; limit: number }> {
    const { companyId, clubId, name, status, page = 1, limit = 10, includeHoles = false } = query;
    this.logger.log(`Fetching courses with query: ${JSON.stringify(query)}`);

    const conds: SQL[] = [];
    if (companyId) {
      conds.push(eq(courses.companyId, companyId));
    }
    if (clubId) {
      conds.push(eq(courses.clubId, clubId));
    }
    if (name) {
      conds.push(ilike(courses.name, `%${name}%`)); // 대소문자 구분 없이 부분 일치 검색
    }
    if (status) {
      conds.push(eq(courses.status, status));
    }
    const where = conds.length ? and(...conds) : undefined;

    const skip = (page - 1) * limit;

    // includeHoles가 true이면 holes 정보 포함
    const data = await this.db.query.courses.findMany({
      where,
      offset: skip,
      limit,
      orderBy: desc(courses.createdAt),
      with: includeHoles
        ? {
            holes: {
              orderBy: asc(holes.holeNumber),
            },
          }
        : undefined,
    });

    const [totalRow] = await this.db.select({ value: count() }).from(courses).where(where);
    const total = totalRow.value;

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Course> {
    this.logger.log(`Fetching course with ID: ${id}`);
    const course = await this.db.query.courses.findFirst({
      where: eq(courses.id, id),
      with: {
        // company relation removed - use NATS 'iam.companies.getById' for Company data
        club: true,
        holes: {
          with: {
            teeBoxes: true,
          },
          orderBy: asc(holes.holeNumber),
        },
      },
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

    // Note: Company validation should be done via NATS 'iam.companies.getById' if needed
    // companyId is a cross-database reference to iam_db.companies

    try {
      const [row] = await this.db
        .update(courses)
        .set({
          name: updateDto.name,
          code: updateDto.code,
          subtitle: updateDto.subtitle,
          companyId: updateDto.companyId,
          clubId: updateDto.clubId,
          holeCount: updateDto.holeCount,
          par: updateDto.par,
          totalDistance: updateDto.totalDistance,
          difficulty: updateDto.difficulty,
          scenicRating: updateDto.scenicRating,
          courseRating: updateDto.courseRating,
          slopeRating: updateDto.slopeRating,
          imageUrl: updateDto.imageUrl,
          description: updateDto.description,
          status: updateDto.status,
        })
        .where(eq(courses.id, id))
        .returning();
      return row;
    } catch (error) {
      if (error?.code === '23505' && error?.constraint === 'Course_companyId_name_key') {
        throw new ConflictException(`A course with name "${updateDto.name}" might already exist for the company.`);
      }
      throw error;
    }
  }

  async getStats(dateRange?: { startDate: string; endDate: string }): Promise<{
    totalCourses: number;
    activeCourses: number;
    coursesByStatus: Record<string, number>;
  }> {
    const conds: SQL[] = [];
    if (dateRange) {
      conds.push(gte(courses.createdAt, new Date(dateRange.startDate)));
      conds.push(lte(courses.createdAt, new Date(dateRange.endDate)));
    }
    const where = conds.length ? and(...conds) : undefined;

    const [totalRow] = await this.db.select({ value: count() }).from(courses).where(where);
    const total = totalRow.value;

    const activeWhere = and(...conds, eq(courses.isActive, true));
    const [activeRow] = await this.db.select({ value: count() }).from(courses).where(activeWhere);
    const active = activeRow.value;

    // groupBy를 별도 호출 (Prisma $transaction 타입 추론 이슈 회피)
    const statusGroups = await this.db
      .select({ status: courses.status, count: count(courses.id) })
      .from(courses)
      .where(where)
      .groupBy(courses.status);

    const coursesByStatus = statusGroups.reduce(
      (acc, item) => {
        acc[item.status] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return { totalCourses: total, activeCourses: active, coursesByStatus };
  }

  async remove(id: number): Promise<Course> {
    this.logger.log(`Attempting to delete course with ID: ${id}`);
    // Course 존재 여부 확인
    await this.findOne(id);

    // onDelete: Restrict 이므로, 관련된 Hole, Game이 있으면 삭제 불가
    // 먼저 하위 레코드를 삭제하거나, 스키마에서 onDelete 규칙을 변경해야 함.
    try {
      const [row] = await this.db.delete(courses).where(eq(courses.id, id)).returning();
      if (!row) {
        throw new NotFoundException(`Course with ID ${id} not found.`);
      }
      return row;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (pgCode(error) === '23503') {
        throw new ConflictException(
          `Cannot delete course with ID ${id} as it has related records (e.g., holes, games). Please delete them first.`,
        );
      }
      throw error;
    }
  }
}
