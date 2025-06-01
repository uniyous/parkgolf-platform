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
    @Inject(RcpClient.NOTIFICATION_SERVICE) private readonly bookingEventSubscriber: ClientProxy,
  ) {}

  /**
   * 특정 골프 코스, 특정 날짜의 예약 가능한 시간 슬롯 목록을 조회합니다.
   * DB에 미리 생성된 슬롯을 기준으로 하며, bookedCount를 통해 isAvailable을 판단합니다.
   */
  async findAvailableByCourseAndDate(
    golfCourseId: number,
    date: string, // YYYY-MM-DD
  ): Promise<CourseTimeSlot[]> {
    // Prisma 모델 타입을 직접 반환할 수도 있고, DTO로 변환해서 반환할 수도 있음
    this.logger.log(`Fetching available time slots for course ID: ${golfCourseId} on date: ${date}`);
    const targetDate = startOfDay(parse(date, 'yyyy-MM-dd', new Date()));

    return this.prisma.courseTimeSlot.findMany({
      where: {
        golfCourseId: golfCourseId,
        date: targetDate,
        // bookedCount가 maxCapacity보다 작은 슬롯만 가져오는 필터 (DB 레벨에서)
        // bookedCount: {
        //   lt: prisma.courseTimeSlot.fields.maxCapacity // Prisma 5.8.0+ 에서 이런 비교가 가능하도록 개선됨
        // },
        // 위 필터가 직접 지원되지 않으면, 모든 슬롯을 가져와서 서비스 레벨에서 필터링
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    // 서비스 레벨 필터링 예시:
    // const allSlots = await this.prisma.courseTimeSlot.findMany(...);
    // return allSlots.filter(slot => slot.bookedCount < slot.maxCapacity);
  }

  /**
   * 특정 슬롯 ID에 대한 상세 정보를 반환합니다. (Booking Service용)
   */
  async getSlotDetailsForBooking(dto: GetSlotDetailsForBookingDto): Promise<SlotDetailsForBookingResponseDto> {
    this.logger.log(`Getting slot details for booking: ${JSON.stringify(dto)}`);
    const { courseId, slotId, date: requestedDateStr } = dto;

    const slot = await this.prisma.courseTimeSlot.findUnique({
      where: { id: slotId },
    });

    if (!slot || slot.golfCourseId !== courseId) {
      throw new NotFoundException(`Time slot with ID ${slotId} not found for course ID ${courseId}.`);
    }

    // 요청된 날짜와 슬롯의 날짜가 일치하는지 확인 (보안 및 정합성)
    const slotDateStr = format(startOfDay(slot.date), 'yyyy-MM-dd');
    if (slotDateStr !== requestedDateStr) {
      throw new ConflictException(`Requested date ${requestedDateStr} does not match the slot date ${slotDateStr}.`);
    }

    const isAvailable = slot.bookedCount < slot.maxCapacity;

    return {
      id: slot.id,
      courseId: slot.golfCourseId,
      date: slotDateStr,
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      maxCapacity: slot.maxCapacity,
      isAvailable: isAvailable,
    };
  }

  /**
   * 특정 기간 동안의 시간 슬롯을 CourseWeeklySchedule 기반으로 생성하여 DB에 저장합니다.
   * (주로 관리자 기능 또는 배치 작업으로 사용)
   */
  async generateAndSaveSlotsForPeriod(
    golfCourseId: number,
    dateFromString: string, // YYYY-MM-DD
    dateToString: string, // YYYY-MM-DD
  ): Promise<{ count: number }> {
    this.logger.log(`Generating slots for course ID ${golfCourseId} from ${dateFromString} to ${dateToString}`);

    const course = await this.prisma.golfCourse.findUnique({
      where: { id: golfCourseId },
      include: { courseWeeklySchedules: true },
    });

    if (!course) {
      throw new NotFoundException(`Golf course with ID ${golfCourseId} not found.`);
    }
    if (!course.courseWeeklySchedules || course.courseWeeklySchedules.length === 0) {
      this.logger.warn(`No weekly schedule found for course ${golfCourseId}. No slots will be generated.`);
      return { count: 0 };
    }

    const startDate = startOfDay(parse(dateFromString, 'yyyy-MM-dd', new Date()));
    const endDate = startOfDay(parse(dateToString, 'yyyy-MM-dd', new Date())); // endOfDay 대신 startOfDay로 하여 해당 날짜까지 포함

    if (startDate > endDate) {
      throw new ConflictException('Start date cannot be later than end date.');
    }

    const datesToGenerate = eachDayOfInterval({ start: startDate, end: endDate });
    const slotsToCreate: Prisma.CourseTimeSlotCreateManyInput[] = [];

    for (const currentDate of datesToGenerate) {
      const dayOfWeek = getDay(currentDate); // 0 (Sunday) to 6 (Saturday)
      const schedule = course.courseWeeklySchedules.find((s) => s.dayOfWeek === dayOfWeek);

      if (!schedule) continue; // 해당 요일 운영 안 함

      const openTimeParts = schedule.openTime.split(':').map(Number);
      const closeTimeParts = schedule.closeTime.split(':').map(Number);

      // 날짜에 시간 설정 (UTC 기준)
      let currentSlotStartTime = setMilliseconds(
        setSeconds(setMinutes(setHours(new Date(currentDate.toISOString()), openTimeParts[0]), openTimeParts[1]), 0),
        0,
      );

      const dayEndTimeLimit = setMilliseconds(
        setSeconds(setMinutes(setHours(new Date(currentDate.toISOString()), closeTimeParts[0]), closeTimeParts[1]), 0),
        0,
      );

      while (currentSlotStartTime < dayEndTimeLimit) {
        const currentSlotEndTime = addMinutes(currentSlotStartTime, schedule.slotDuration);
        if (currentSlotEndTime > dayEndTimeLimit) break;

        slotsToCreate.push({
          // id는 CUID이므로 Prisma가 자동으로 생성
          golfCourseId: course.id,
          date: startOfDay(currentDate), // 날짜만 정확히 (시간은 00:00:00 UTC)
          startTime: currentSlotStartTime,
          endTime: currentSlotEndTime,
          maxCapacity: schedule.maxCapacity,
          bookedCount: 0, // 초기값
        });
        currentSlotStartTime = currentSlotEndTime;
      }
    }

    if (slotsToCreate.length === 0) {
      this.logger.log(`No operable slots to generate for the given period and schedule.`);
      return { count: 0 };
    }

    // 기존 슬롯 삭제 후 재생성 또는 upsert 등을 고려할 수 있음
    // 여기서는 createMany 와 skipDuplicates를 사용하여 중복 방지 (unique 제약 기반)
    const result = await this.prisma.courseTimeSlot.createMany({
      data: slotsToCreate,
      skipDuplicates: true, // @@unique([golfCourseId, date, startTime]) 제약에 따라 중복 건너뛰기
    });

    this.logger.log(`${result.count} time slots were created for course ID ${golfCourseId}.`);
    return { count: result.count };
  }

  // NATS 이벤트를 통해 BookingService로부터 bookedCount 업데이트를 받는 메소드 (예시)
  async updateBookedCount(slotId: string, change: number): Promise<CourseTimeSlot | null> {
    this.logger.log(`Updating booked count for slot ID ${slotId} by ${change}`);
    try {
      // 트랜잭션 안에서 현재 bookedCount를 읽고 업데이트 (Race Condition 방지)
      return await this.prisma.$transaction(async (tx) => {
        const slot = await tx.courseTimeSlot.findUnique({ where: { id: slotId } });
        if (!slot) {
          this.logger.warn(`Slot ID ${slotId} not found for updating booked count.`);
          return null;
        }

        const newBookedCount = slot.bookedCount + change;
        if (newBookedCount < 0 || newBookedCount > slot.maxCapacity) {
          this.logger.error(`Invalid booked count update for slot ${slotId}: current=${slot.bookedCount}, change=${change}, max=${slot.maxCapacity}`);
          // 이 경우 에러를 발생시키거나, 보정 로직을 수행해야 함
          throw new ConflictException('Booked count update would exceed capacity or go below zero.');
        }

        return tx.courseTimeSlot.update({
          where: { id: slotId },
          data: { bookedCount: newBookedCount },
        });
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Error updating booked count for slot ${slotId}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Error updating booked count for slot ${slotId}: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }
}
