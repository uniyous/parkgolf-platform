import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CourseTimeSlot, Prisma } from '@prisma/client';
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
    this.logger.log('Creating new time slot');

    // 중복 체크
    const existing = await this.prisma.courseTimeSlot.findFirst({
      where: {
        courseId: data.courseId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });

    if (existing) {
      throw new ConflictException('같은 코스와 시간에 이미 타임슬롯이 존재합니다.');
    }

    const timeSlot = await this.prisma.courseTimeSlot.create({
      data: {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        courseId: data.courseId,
        maxPlayers: data.maxPlayers || 4,
        price: data.price,
        isActive: true,
      },
      include: {
        courses: true,
      },
    });

    this.logger.log(`Created time slot with ID ${timeSlot.id}`);
    
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
        courseId: data.courseId,
        maxPlayers: data.maxPlayers,
        price: data.price,
        isActive: data.isActive,
      },
      include: {
        courses: true,
      },
    });

    this.logger.log(`Updated time slot ${id}`);
    
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
  }

  /**
   * 필터 조건으로 타임슬롯 목록 조회
   */
  async findWithFilters(companyId?: number, filters?: TimeSlotFilterDto): Promise<CourseTimeSlot[]> {
    this.logger.log('Finding time slots with filters');

    const where: Prisma.CourseTimeSlotWhereInput = {};

    // 회사 필터
    if (companyId) {
      where.courses = {
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
        courses: true,
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
        courseId: courseId,
      },
      include: {
        courses: true,
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }

}