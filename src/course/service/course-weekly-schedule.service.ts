import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CourseWeeklySchedule, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCourseWeeklyScheduleDto, UpdateCourseWeeklyScheduleDto } from '../dto/course-weekly-schedule.dto';

@Injectable()
export class CourseWeeklyScheduleService {
  private readonly logger = new Logger(CourseWeeklyScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateCourseWeeklyScheduleDto): Promise<CourseWeeklySchedule> {
    this.logger.log(`Attempting to create a weekly schedule for course ID: ${createDto.golfCourseId}, Day: ${createDto.dayOfWeek}`);

    // GolfCourse 존재 여부 확인
    const golfCourse = await this.prisma.golfCourse.findUnique({
      where: { id: createDto.golfCourseId },
    });
    if (!golfCourse) {
      throw new NotFoundException(`Golf course with ID ${createDto.golfCourseId} not found.`);
    }

    // 시간 유효성 검사
    if (createDto.openTime >= createDto.closeTime) {
      throw new ConflictException('Open time must be earlier than close time.');
    }

    try {
      return await this.prisma.courseWeeklySchedule.create({
        data: {
          golfCourseId: createDto.golfCourseId,
          dayOfWeek: createDto.dayOfWeek,
          openTime: createDto.openTime,
          closeTime: createDto.closeTime,
          slotDuration: createDto.slotDuration,
          maxCapacity: createDto.maxCapacity,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`A weekly schedule for course ID ${createDto.golfCourseId} and day ${createDto.dayOfWeek} already exists.`);
        }
      } else if (error instanceof Error) {
        this.logger.error(`Failed to create weekly schedule: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to create weekly schedule: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }

  async findAllByGolfCourseId(golfCourseId: number): Promise<CourseWeeklySchedule[]> {
    this.logger.log(`Fetching all weekly schedules for golf course ID: ${golfCourseId}`);
    return this.prisma.courseWeeklySchedule.findMany({
      where: { golfCourseId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async findOne(id: number): Promise<CourseWeeklySchedule> {
    this.logger.log(`Fetching weekly schedule with ID: ${id}`);
    const schedule = await this.prisma.courseWeeklySchedule.findUnique({
      where: { id },
    });
    if (!schedule) {
      throw new NotFoundException(`Weekly schedule with ID ${id} not found.`);
    }
    return schedule;
  }

  async findByCourseAndDay(golfCourseId: number, dayOfWeek: number): Promise<CourseWeeklySchedule> {
    this.logger.log(`Fetching weekly schedule for course ID: ${golfCourseId}, Day: ${dayOfWeek}`);
    const schedule = await this.prisma.courseWeeklySchedule.findUnique({
      where: {
        golfCourseId_dayOfWeek: { golfCourseId, dayOfWeek },
      },
    });
    if (!schedule) {
      throw new NotFoundException(`Weekly schedule with GolfCourseId, dayOfWeek: ${golfCourseId}, ${dayOfWeek} not found.`);
    }
    return schedule;
  }

  async update(
    id: number, // 또는 golfCourseId와 dayOfWeek를 식별자로 사용
    updateDto: UpdateCourseWeeklyScheduleDto,
  ): Promise<CourseWeeklySchedule> {
    this.logger.log(`Attempting to update weekly schedule with ID: ${id}`);

    // 먼저 해당 ID의 스케줄이 존재하는지 확인
    const existingSchedule = await this.prisma.courseWeeklySchedule.findUnique({
      where: { id },
    });
    if (!existingSchedule) {
      throw new NotFoundException(`Weekly schedule with ID ${id} not found.`);
    }

    // 시간 유효성 검사 (업데이트 시 openTime 또는 closeTime이 주어졌을 경우)
    const openTime = updateDto.openTime || existingSchedule.openTime;
    const closeTime = updateDto.closeTime || existingSchedule.closeTime;
    if (openTime >= closeTime) {
      throw new ConflictException('Open time must be earlier than close time.');
    }

    // golfCourseId나 dayOfWeek를 변경하려는 시도가 있다면, 이는 사실상 다른 레코드를 의미하므로
    // 삭제 후 생성 또는 별도의 로직이 필요할 수 있음.
    // 여기서는 해당 ID의 레코드의 다른 필드만 업데이트한다고 가정.
    // 만약 updateDto에 golfCourseId나 dayOfWeek가 포함되어 있고, 기존 값과 다르다면 에러 처리.
    if (
      (updateDto.golfCourseId && updateDto.golfCourseId !== existingSchedule.golfCourseId) ||
      (updateDto.dayOfWeek !== undefined && updateDto.dayOfWeek !== existingSchedule.dayOfWeek)
    ) {
      throw new ConflictException('Cannot change golfCourseId or dayOfWeek during update. Create a new schedule instead.');
    }

    try {
      return await this.prisma.courseWeeklySchedule.update({
        where: { id },
        data: {
          // golfCourseId와 dayOfWeek는 업데이트하지 않음 (식별자이므로)
          // 만약 이들을 변경해야 한다면, 해당 레코드를 삭제하고 새로 생성하는 것이 더 안전함.
          // 또는 upsert 로직을 사용 (findByCourseAndDay로 찾아서 ID를 가져오거나, golfCourseId_dayOfWeek unique key 사용)
          openTime: updateDto.openTime,
          closeTime: updateDto.closeTime,
          slotDuration: updateDto.slotDuration,
          maxCapacity: updateDto.maxCapacity,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to update weekly schedule ID ${id}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to update weekly schedule ID ${id}: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }

  async remove(id: number): Promise<CourseWeeklySchedule> {
    this.logger.log(`Attempting to delete weekly schedule with ID: ${id}`);
    try {
      return await this.prisma.courseWeeklySchedule.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Weekly schedule with ID ${id} not found.`);
        }
      } else if (error instanceof Error) {
        this.logger.error(`Failed to delete weekly schedule ID ${id}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to delete weekly schedule ID ${id}: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }
}
