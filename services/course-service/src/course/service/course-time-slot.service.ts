import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CourseTimeSlot, Prisma } from '@prisma/client';
import { addMinutes, eachDayOfInterval, format, getDay, parse, setHours, setMilliseconds, setMinutes, setSeconds, startOfDay } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetSlotDetailsForBookingDto, SlotDetailsForBookingResponseDto, CreateTimeSlotDto, UpdateTimeSlotDto } from '../dto/course-time-slot.dto';
import { ClientProxy } from '@nestjs/microservices';
import { RcpClient } from '../../common/microservice/rcp-client';

@Injectable()
export class CourseTimeSlotService {
  private readonly logger = new Logger(CourseTimeSlotService.name);

  constructor(
    private readonly prisma: PrismaService,
    // @Inject(RcpClient.NOTIFICATION_SERVICE) private readonly bookingEventSubscriber: ClientProxy,
  ) {}

  /**
   * 특정 코스의 모든 시간 슬롯을 조회합니다.
   */
  async findAvailableByCourse(
    courseId: number,
  ): Promise<CourseTimeSlot[]> {
    this.logger.log(`Fetching time slots for course ID: ${courseId}`);

    return this.prisma.courseTimeSlot.findMany({
      where: {
        courseId: courseId,
        isActive: true,
      },
      orderBy: [{ startTime: 'asc' }],
    });
  }

  /**
   * 특정 슬롯 ID에 대한 상세 정보를 반환합니다. (Booking Service용)
   */
  async getSlotDetailsForBooking(dto: GetSlotDetailsForBookingDto): Promise<SlotDetailsForBookingResponseDto> {
    this.logger.log(`Getting slot details for booking: ${JSON.stringify(dto)}`);
    const { courseId, slotId } = dto;

    const slot = await this.prisma.courseTimeSlot.findUnique({
      where: { id: parseInt(slotId) },
    });

    if (!slot || slot.courseId !== courseId) {
      throw new NotFoundException(`Time slot with ID ${slotId} not found for course ID ${courseId}.`);
    }

    return {
      id: slot.id.toString(),
      courseId: slot.courseId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxCapacity: slot.maxPlayers,
      isAvailable: true, // 스키마에 bookedCount가 없으므로 기본적으로 true
    };
  }

  /**
   * 특정 코스에 대한 기본 시간 슬롯들을 생성합니다.
   */
  async generateBasicSlotsForCourse(
    courseId: number,
  ): Promise<{ count: number }> {
    this.logger.log(`Generating basic slots for course ID ${courseId}`);

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { weeklySchedules: true },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found.`);
    }
    if (!course.weeklySchedules || course.weeklySchedules.length === 0) {
      this.logger.warn(`No weekly schedule found for course ${courseId}. No slots will be generated.`);
      return { count: 0 };
    }

    // 기본 시간대 슬롯 생성 (예: 08:00, 10:00, 12:00, 14:00, 16:00)
    const basicTimeSlots = [
      { startTime: '08:00', endTime: '10:00' },
      { startTime: '10:00', endTime: '12:00' },
      { startTime: '12:00', endTime: '14:00' },
      { startTime: '14:00', endTime: '16:00' },
      { startTime: '16:00', endTime: '18:00' },
    ];

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    const slotsToCreate: Prisma.CourseTimeSlotCreateManyInput[] = basicTimeSlots.map(slot => ({
      courseId: course.id,
      date: today, // 오늘 날짜로 기본 설정
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxPlayers: 4, // 기본 4명
      price: 50000, // 기본 가격
    }));

    const result = await this.prisma.courseTimeSlot.createMany({
      data: slotsToCreate,
      skipDuplicates: true,
    });

    this.logger.log(`${result.count} time slots were created for course ID ${courseId}.`);
    return { count: result.count };
  }

  /**
   * 특정 슬롯을 비활성화합니다.
   */
  async deactivateSlot(slotId: number): Promise<CourseTimeSlot> {
    this.logger.log(`Deactivating slot ID ${slotId}`);
    
    return this.prisma.courseTimeSlot.update({
      where: { id: slotId },
      data: { isActive: false },
    });
  }

  /**
   * 특정 슬롯을 활성화합니다.
   */
  async activateSlot(slotId: number): Promise<CourseTimeSlot> {
    this.logger.log(`Activating slot ID ${slotId}`);
    
    return this.prisma.courseTimeSlot.update({
      where: { id: slotId },
      data: { isActive: true },
    });
  }

  // ===== Admin API Methods =====

  /**
   * [Admin] 특정 코스의 모든 타임슬롯 조회 (활성/비활성 모두 포함)
   */
  async findAllByCourse(courseId: number): Promise<CourseTimeSlot[]> {
    this.logger.log(`Fetching all time slots for course ID: ${courseId}`);
    
    return this.prisma.courseTimeSlot.findMany({
      where: { courseId },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * [Admin] 필터링을 통한 타임슬롯 조회
   */
  async findWithFilters(courseId: number, filter: any): Promise<CourseTimeSlot[]> {
    this.logger.log(`Fetching time slots for course ${courseId} with filters: ${JSON.stringify(filter)}`);
    
    const where: any = { courseId };

    // 날짜 범위 필터
    if (filter.dateFrom || filter.dateTo) {
      where.date = {};
      if (filter.dateFrom) {
        where.date.gte = filter.dateFrom;
      }
      if (filter.dateTo) {
        where.date.lte = filter.dateTo;
      }
    }

    // 시간 범위 필터  
    if (filter.timeFrom) {
      where.startTime = { gte: filter.timeFrom };
    }
    if (filter.timeTo) {
      where.endTime = { lte: filter.timeTo };
    }

    // 활성 상태 필터
    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive === 'true' || filter.isActive === true;
    }

    const page = parseInt(filter.page) || 1;
    const limit = parseInt(filter.limit) || 20;
    const skip = (page - 1) * limit;

    return this.prisma.courseTimeSlot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      skip,
      take: limit,
    });
  }

  /**
   * [Admin] 특정 타임슬롯 조회
   */
  async findById(timeSlotId: number, courseId: number): Promise<CourseTimeSlot> {
    this.logger.log(`Fetching time slot ${timeSlotId} for course ${courseId}`);
    
    const timeSlot = await this.prisma.courseTimeSlot.findFirst({
      where: {
        id: timeSlotId,
        courseId,
      },
    });

    if (!timeSlot) {
      throw new NotFoundException(`Time slot with ID ${timeSlotId} not found for course ${courseId}`);
    }

    return timeSlot;
  }

  /**
   * [Admin] 타임슬롯 생성
   */
  async create(courseId: number, createDto: CreateTimeSlotDto): Promise<CourseTimeSlot> {
    this.logger.log(`Creating time slot for course ${courseId}: ${JSON.stringify(createDto)}`);
    
    // 중복 시간 검사
    const existingSlot = await this.prisma.courseTimeSlot.findFirst({
      where: {
        courseId,
        date: createDto.date,
        startTime: createDto.startTime,
        endTime: createDto.endTime,
      },
    });

    if (existingSlot) {
      throw new ConflictException(`Time slot with start time ${createDto.startTime} and end time ${createDto.endTime} already exists for course ${courseId}`);
    }

    return this.prisma.courseTimeSlot.create({
      data: {
        courseId,
        date: createDto.date,
        startTime: createDto.startTime,
        endTime: createDto.endTime,
        maxPlayers: createDto.maxPlayers,
        price: createDto.price,
        isActive: createDto.isActive ?? true,
      },
    });
  }

  /**
   * [Admin] 타임슬롯 대량 생성
   */
  async createBulk(courseId: number, createDtos: CreateTimeSlotDto[]): Promise<CourseTimeSlot[]> {
    this.logger.log(`Creating ${createDtos.length} time slots for course ${courseId}`);
    
    const results: CourseTimeSlot[] = [];
    
    // 트랜잭션으로 처리
    await this.prisma.$transaction(async (prisma) => {
      for (const dto of createDtos) {
        // 중복 체크는 하지 않고 skipDuplicates로 처리
        try {
          const timeSlot = await prisma.courseTimeSlot.create({
            data: {
              courseId,
              date: dto.date,
              startTime: dto.startTime,
              endTime: dto.endTime,
              maxPlayers: dto.maxPlayers,
              price: dto.price,
              isActive: dto.isActive ?? true,
            },
          });
          results.push(timeSlot);
        } catch (error) {
          // 중복 오류는 무시하고 계속 진행
          if (error.code === 'P2002') {
            this.logger.warn(`Duplicate time slot skipped: ${dto.startTime}-${dto.endTime} for course ${courseId}`);
          } else {
            throw error;
          }
        }
      }
    });

    this.logger.log(`Successfully created ${results.length} time slots for course ${courseId}`);
    return results;
  }

  /**
   * [Admin] 타임슬롯 수정
   */
  async update(timeSlotId: number, courseId: number, updateDto: UpdateTimeSlotDto): Promise<CourseTimeSlot> {
    this.logger.log(`Updating time slot ${timeSlotId} for course ${courseId}: ${JSON.stringify(updateDto)}`);
    
    // 존재 여부 확인
    await this.findById(timeSlotId, courseId);

    // 시간 중복 검사 (시간이 변경되는 경우)
    if (updateDto.startTime || updateDto.endTime) {
      const existingSlot = await this.prisma.courseTimeSlot.findFirst({
        where: {
          courseId,
          id: { not: timeSlotId },
          startTime: updateDto.startTime,
          endTime: updateDto.endTime,
        },
      });

      if (existingSlot) {
        throw new ConflictException(`Time slot with start time ${updateDto.startTime} and end time ${updateDto.endTime} already exists for course ${courseId}`);
      }
    }

    return this.prisma.courseTimeSlot.update({
      where: { id: timeSlotId },
      data: {
        ...(updateDto.startTime && { startTime: updateDto.startTime }),
        ...(updateDto.endTime && { endTime: updateDto.endTime }),
        ...(updateDto.maxPlayers && { maxPlayers: updateDto.maxPlayers }),
        ...(updateDto.price && { price: updateDto.price }),
        ...(updateDto.isActive !== undefined && { isActive: updateDto.isActive }),
      },
    });
  }

  /**
   * [Admin] 타임슬롯 삭제
   */
  async delete(timeSlotId: number, courseId: number): Promise<void> {
    this.logger.log(`Deleting time slot ${timeSlotId} for course ${courseId}`);
    
    // 존재 여부 확인
    await this.findById(timeSlotId, courseId);

    await this.prisma.courseTimeSlot.delete({
      where: { id: timeSlotId },
    });

    this.logger.log(`Time slot ${timeSlotId} deleted successfully`);
  }
}
