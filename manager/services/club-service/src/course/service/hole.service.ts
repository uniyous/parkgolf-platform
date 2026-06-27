import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { courses, holes } from '../../db/schema';
import type { Hole } from '../../db/schema';
import { CreateHoleDto, FindHolesQueryDto, UpdateHoleDto } from '../dto/hole.dto';

@Injectable()
export class HoleService {
  private readonly logger = new Logger(HoleService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async create(courseId: number, createDto: CreateHoleDto): Promise<Hole> {
    this.logger.log(`Attempting to create a hole for course ID: ${courseId}, Hole No: ${createDto.holeNumber}`);

    // Course 존재 여부 확인
    const [course] = await this.db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) {
      throw new NotFoundException(` course with ID ${courseId} not found.`);
    }

    // holeNumber 중복 확인 (course_id + hole_number unique)
    const [existing] = await this.db
      .select()
      .from(holes)
      .where(and(eq(holes.courseId, courseId), eq(holes.holeNumber, createDto.holeNumber)))
      .limit(1);
    if (existing) {
      throw new ConflictException(`Hole number ${createDto.holeNumber} already exists for course ID ${courseId}.`);
    }

    const [row] = await this.db
      .insert(holes)
      .values({
        ...createDto,
        courseId: courseId, // 경로에서 받은 courseId 사용
      })
      .returning();
    return row;
  }

  async findAllByCourseId(courseId: number, query: FindHolesQueryDto): Promise<Hole[]> {
    this.logger.log(`Fetching holes for course ID: ${courseId} with query: ${JSON.stringify(query)}`);
    const { holeNumber, par } = query;

    const conditions = [eq(holes.courseId, courseId)];
    if (holeNumber) {
      conditions.push(eq(holes.holeNumber, holeNumber));
    }
    if (par) {
      conditions.push(eq(holes.par, par));
    }

    return this.db.query.holes.findMany({
      where: and(...conditions),
      orderBy: asc(holes.holeNumber),
      with: { teeBoxes: true },
    });
  }

  async findOne(courseId: number, holeId: number): Promise<Hole> {
    this.logger.log(`Fetching hole with ID: ${holeId} for course ID: ${courseId}`);
    const hole = await this.db.query.holes.findFirst({
      where: eq(holes.id, holeId),
      with: {
        teeBoxes: true,
        course: true,
      },
    });

    if (!hole) {
      throw new NotFoundException(`Hole with ID ${holeId} not found.`);
    }
    if (hole.courseId !== courseId) {
      throw new NotFoundException(`Hole with ID ${holeId} does not belong to course ID ${courseId}.`);
    }
    return hole;
  }

  async update(courseId: number, holeId: number, updateDto: UpdateHoleDto): Promise<Hole> {
    this.logger.log(`Attempting to update hole with ID: ${holeId} for course ID: ${courseId}`);

    // 먼저 해당 홀이 요청된 코스에 속하는지 확인 (findOne 메소드 재활용)
    await this.findOne(courseId, holeId);

    // 만약 holeNumber를 변경하려고 하고, 해당 번호가 이미 코스 내에 존재하면 에러
    if (updateDto.holeNumber) {
      const [existingHoleWithSameNumber] = await this.db
        .select()
        .from(holes)
        .where(and(eq(holes.courseId, courseId), eq(holes.holeNumber, updateDto.holeNumber)))
        .limit(1);
      // 만약 찾았는데, 그게 지금 업데이트하려는 홀(holeId)이 아니라면 중복임
      if (existingHoleWithSameNumber && existingHoleWithSameNumber.id !== holeId) {
        throw new ConflictException(`Hole number ${updateDto.holeNumber} already exists for course ID ${courseId}.`);
      }
    }

    const [row] = await this.db
      .update(holes)
      .set({
        holeNumber: updateDto.holeNumber,
        par: updateDto.par,
        distance: updateDto.distance,
        handicap: updateDto.handicap,
        description: updateDto.description,
        tips: updateDto.tips,
        imageUrl: updateDto.imageUrl,
      })
      .where(eq(holes.id, holeId))
      .returning();
    return row;
  }

  async remove(courseId: number, holeId: number): Promise<Hole> {
    this.logger.log(`Attempting to delete hole with ID: ${holeId} for course ID: ${courseId}`);
    // 해당 홀이 요청된 코스에 속하는지 확인 (findOne 메소드 재활용)
    await this.findOne(courseId, holeId);

    // onDelete: Cascade 이므로, 관련된 TeeBox도 함께 삭제됨
    const [row] = await this.db.delete(holes).where(eq(holes.id, holeId)).returning();
    if (!row) {
      throw new NotFoundException(`Hole with ID ${holeId} not found.`);
    }
    return row;
  }
}
