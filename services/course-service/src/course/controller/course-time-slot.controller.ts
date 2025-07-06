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

@ApiTags('Courses - Time Slots')
@Controller('api/courses/:courseId/time-slots')
export class CourseTimeSlotController {
  private readonly logger = new Logger(CourseTimeSlotController.name);

  constructor(private readonly timeSlotService: CourseTimeSlotService) {}

  @Get('available')
  @ApiOperation({ summary: '특정 코스의 시간 슬롯 조회' })
  @ApiParam({ name: 'courseId', type: Number, description: '코스 ID' })
  @ApiResponse({ status: 200, description: '슬롯 목록 반환', type: [CourseTimeSlotResponseDto] })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAvailableSlots(
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<CourseTimeSlotResponseDto[]> {
    const slots = await this.timeSlotService.findAvailableByCourse(courseId);
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

  // 현재 스키마에서는 bookedCount가 없으므로 이 핸들러는 사용하지 않음
  // @MessagePattern('booking.slot_count_changed')
  // async handleBookingSlotCountChanged() {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: '[Admin] 기본 시간 슬롯을 생성' })
  @ApiResponse({ status: 202, description: '슬롯 생성 작업 완료됨' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async generateTimeSlots(@Body() dto: GenerateTimeSlotsDto): Promise<{ message: string; count?: number }> {
    this.logger.log(`Request to generate time slots: ${JSON.stringify(dto)}`);
    const result = await this.timeSlotService.generateBasicSlotsForCourse(dto.courseId);
    return { message: 'Time slot generation process finished.', count: result.count };
  }
}
