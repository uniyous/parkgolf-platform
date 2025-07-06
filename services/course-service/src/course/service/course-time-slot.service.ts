import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CourseTimeSlot, Prisma } from '@prisma/client';
import { addMinutes, eachDayOfInterval, format, getDay, parse, setHours, setMilliseconds, setMinutes, setSeconds, startOfDay } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetSlotDetailsForBookingDto, SlotDetailsForBookingResponseDto } from '../dto/course-time-slot.dto';
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

    const slotsToCreate: Prisma.CourseTimeSlotCreateManyInput[] = basicTimeSlots.map(slot => ({
      courseId: course.id,
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
}
