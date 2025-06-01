import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Param, ParseIntPipe, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CourseTimeSlotService } from '../service/course-time-slot.service';
import {
  CourseTimeSlotResponseDto,
  GenerateTimeSlotsDto,
  GetAvailableTimeSlotsDto,
  GetSlotDetailsForBookingDto,
  SlotDetailsForBookingResponseDto,
} from '../dto/course-time-slot.dto';

@ApiTags('Golf Courses - Time Slots')
@Controller('api/courses/:golfCourseId/time-slots')
export class CourseTimeSlotController {
  private readonly logger = new Logger(CourseTimeSlotController.name);

  constructor(private readonly timeSlotService: CourseTimeSlotService) {}

  @Get('available')
  @ApiOperation({ summary: '특정 코스, 특정 날짜의 예약 가능한 시간 슬롯 조회' })
  @ApiParam({ name: 'golfCourseId', type: Number, description: '골프 코스 ID' })
  @ApiQuery({ name: 'date', required: true, description: '조회 날짜 (YYYY-MM-DD)', type: String })
  @ApiResponse({ status: 200, description: '예약 가능한 슬롯 목록 반환', type: [CourseTimeSlotResponseDto] })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAvailableSlots(
    @Param('golfCourseId', ParseIntPipe) golfCourseId: number,
    @Query() query: GetAvailableTimeSlotsDto,
  ): Promise<CourseTimeSlotResponseDto[]> {
    const slots = await this.timeSlotService.findAvailableByCourseAndDate(golfCourseId, query.date);
    return slots.map((slot) => CourseTimeSlotResponseDto.fromEntity(slot));
  }

  @MessagePattern('course.get_slot_details')
  async handleGetSlotDetails(
    @Payload(new ValidationPipe({ transform: true, whitelist: true }))
    payload: GetSlotDetailsForBookingDto,
  ): Promise<SlotDetailsForBookingResponseDto> {
    this.logger.log(`NATS: Received request for slot details: ${JSON.stringify(payload)}`);
    return this.timeSlotService.getSlotDetailsForBooking(payload);
  }

  // 이 이벤트 핸들러는 BookingService에서 예약/취소 시 발행하는 이벤트를 구독합니다.
  // bookedCount를 CourseService에서 직접 관리하는 경우에 필요합니다.
  @MessagePattern('booking.slot_count_changed')
  async handleBookingSlotCountChanged(
    @Payload() data: { slotId: string; change: number }, // change: +1 (예약), -1 (취소)
  ): Promise<void> {
    this.logger.log(`NATS: Received slot count change event: ${JSON.stringify(data)}`);
    try {
      await this.timeSlotService.updateBookedCount(data.slotId, data.change);
      this.logger.log(`NATS: Successfully updated booked count for slot ${data.slotId}`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`NATS: Failed to update booked count for slot ${data.slotId} from event: ${error.message}`, error.stack);
      } else {
        this.logger.error(`NATS: Failed to update booked count for slot ${data.slotId} from event: ${JSON.stringify(error)}`);
      }
      // 여기서 에러를 어떻게 처리할지 결정 (예: 재시도 큐, 관리자 알림 등)
    }
  }

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: '[Admin] 특정 기간의 시간 슬롯을 DB에 미리 생성' })
  @ApiResponse({ status: 202, description: '슬롯 생성 작업 시작됨 또는 완료됨' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async generateTimeSlots(@Body() dto: GenerateTimeSlotsDto): Promise<{ message: string; count?: number }> {
    this.logger.log(`Request to generate time slots: ${JSON.stringify(dto)}`);
    // 실제로는 비동기 작업으로 백그라운드에서 처리하고 즉시 응답하는 것이 좋을 수 있음 (예: BullMQ)
    const result = await this.timeSlotService.generateAndSaveSlotsForPeriod(dto.golfCourseId, dto.dateFrom, dto.dateTo);
    return { message: 'Time slot generation process finished.', count: result.count };
  }
}
