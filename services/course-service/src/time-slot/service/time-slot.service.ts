import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CourseTimeSlot, Prisma, RoundType, TimeSlotStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTimeSlotDto, UpdateTimeSlotDto, TimeSlotFilterDto } from '../dto/time-slot.dto';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class TimeSlotService {
  private readonly logger = new Logger(TimeSlotService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * 새 타임슬롯 생성 (9홀 기준)
   */
  async create(data: CreateTimeSlotDto): Promise<CourseTimeSlot> {
    this.logger.log('Creating new time slot with 9-hole support');

    // 중복 체크
    const existing = await this.prisma.courseTimeSlot.findFirst({
      where: {
        firstCourseId: data.firstCourseId,
        secondCourseId: data.secondCourseId || null,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });

    if (existing) {
      throw new ConflictException('같은 코스 조합과 시간에 이미 타임슬롯이 존재합니다.');
    }

    const timeSlot = await this.prisma.courseTimeSlot.create({
      data: {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        roundType: data.roundType || RoundType.EIGHTEEN_HOLE,
        firstCourseId: data.firstCourseId,
        secondCourseId: data.secondCourseId,
        availableSlots: data.availableSlots,
        nineHolePrice: data.nineHolePrice,
        eighteenHolePrice: data.eighteenHolePrice,
        status: TimeSlotStatus.ACTIVE,
        notes: data.notes,
        bookedCount: 0,
      },
      include: {
        firstCourse: true,
        secondCourse: true,
      },
    });

    this.logger.log(`Created time slot with ID ${timeSlot.id}`);
    await this.publishTimeSlotCreated(timeSlot);
    
    return timeSlot;
  }

  /**
   * 타임슬롯 수정
   */
  async update(id: number, data: UpdateTimeSlotDto): Promise<CourseTimeSlot> {
    this.logger.log(`Updating time slot ${id}`);

    const existing = await this.prisma.courseTimeSlot.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`타임슬롯 ID ${id}를 찾을 수 없습니다.`);
    }

    const timeSlot = await this.prisma.courseTimeSlot.update({
      where: { id },
      data: {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        roundType: data.roundType,
        firstCourseId: data.firstCourseId,
        secondCourseId: data.secondCourseId,
        availableSlots: data.availableSlots,
        nineHolePrice: data.nineHolePrice,
        eighteenHolePrice: data.eighteenHolePrice,
        notes: data.notes,
      },
      include: {
        firstCourse: true,
        secondCourse: true,
      },
    });

    this.logger.log(`Updated time slot ${id}`);
    await this.publishTimeSlotUpdated(timeSlot);
    
    return timeSlot;
  }

  /**
   * 타임슬롯 삭제
   */
  async delete(id: number): Promise<void> {
    this.logger.log(`Deleting time slot ${id}`);

    const existing = await this.prisma.courseTimeSlot.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`타임슬롯 ID ${id}를 찾을 수 없습니다.`);
    }

    await this.prisma.courseTimeSlot.delete({
      where: { id },
    });

    this.logger.log(`Deleted time slot ${id}`);
    await this.publishTimeSlotDeleted(id);
  }

  /**
   * 필터 조건으로 타임슬롯 목록 조회
   */
  async findWithFilters(companyId?: number, filters?: TimeSlotFilterDto): Promise<CourseTimeSlot[]> {
    this.logger.log('Finding time slots with filters');

    const where: Prisma.CourseTimeSlotWhereInput = {};

    // 회사 필터 (첫 번째 코스 기준)
    if (companyId) {
      where.firstCourse = {
        companyId: companyId,
      };
    }

    // 날짜 범위 필터
    if (filters?.dateFrom && filters?.dateTo) {
      where.date = {
        gte: filters.dateFrom,
        lte: filters.dateTo,
      };
    } else if (filters?.dateFrom) {
      where.date = {
        gte: filters.dateFrom,
      };
    } else if (filters?.dateTo) {
      where.date = {
        lte: filters.dateTo,
      };
    }

    const timeSlots = await this.prisma.courseTimeSlot.findMany({
      where,
      include: {
        firstCourse: true,
        secondCourse: true,
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
      take: filters?.limit || 20,
      skip: filters?.page ? (filters.page - 1) * (filters.limit || 20) : 0,
    });

    this.logger.log(`Found ${timeSlots.length} time slots`);
    return timeSlots;
  }

  /**
   * 특정 코스가 포함된 타임슬롯 조회
   */
  async findByCourse(courseId: number): Promise<CourseTimeSlot[]> {
    this.logger.log(`Finding time slots for course ${courseId}`);

    return this.prisma.courseTimeSlot.findMany({
      where: {
        OR: [
          { firstCourseId: courseId },
          { secondCourseId: courseId },
        ],
      },
      include: {
        firstCourse: true,
        secondCourse: true,
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }

  /**
   * 이벤트 발행 메서드들
   */
  private async publishTimeSlotCreated(timeSlot: CourseTimeSlot): Promise<void> {
    try {
      const event = {
        eventType: 'TIMESLOT_CREATED',
        timeSlotId: timeSlot.id,
        roundType: timeSlot.roundType,
        firstCourseId: timeSlot.firstCourseId,
        secondCourseId: timeSlot.secondCourseId,
        date: timeSlot.date,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        availableSlots: timeSlot.availableSlots,
        nineHolePrice: timeSlot.nineHolePrice ? Number(timeSlot.nineHolePrice) : null,
        eighteenHolePrice: Number(timeSlot.eighteenHolePrice),
        status: timeSlot.status,
        timestamp: new Date().toISOString(),
      };

      this.natsClient.emit('timeslot.created', event);
      this.logger.log(`Published TIMESLOT_CREATED event for slot ${timeSlot.id}`);
    } catch (error) {
      this.logger.error(`Failed to publish TIMESLOT_CREATED event: ${error.message}`);
    }
  }

  private async publishTimeSlotUpdated(timeSlot: CourseTimeSlot): Promise<void> {
    try {
      const event = {
        eventType: 'TIMESLOT_UPDATED',
        timeSlotId: timeSlot.id,
        roundType: timeSlot.roundType,
        firstCourseId: timeSlot.firstCourseId,
        secondCourseId: timeSlot.secondCourseId,
        timestamp: new Date().toISOString(),
      };

      this.natsClient.emit('timeslot.updated', event);
      this.logger.log(`Published TIMESLOT_UPDATED event for slot ${timeSlot.id}`);
    } catch (error) {
      this.logger.error(`Failed to publish TIMESLOT_UPDATED event: ${error.message}`);
    }
  }

  private async publishTimeSlotDeleted(timeSlotId: number): Promise<void> {
    try {
      const event = {
        eventType: 'TIMESLOT_DELETED',
        timeSlotId,
        timestamp: new Date().toISOString(),
      };

      this.natsClient.emit('timeslot.deleted', event);
      this.logger.log(`Published TIMESLOT_DELETED event for slot ${timeSlotId}`);
    } catch (error) {
      this.logger.error(`Failed to publish TIMESLOT_DELETED event: ${error.message}`);
    }
  }
}