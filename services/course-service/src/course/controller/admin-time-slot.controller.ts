import { 
  Body, 
  Controller, 
  Delete, 
  Get, 
  HttpCode, 
  HttpStatus, 
  Logger, 
  Param, 
  ParseIntPipe, 
  Patch, 
  Post, 
  Query,
  UsePipes, 
  ValidationPipe 
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CourseTimeSlotService } from '../service/course-time-slot.service';
import {
  CourseTimeSlotResponseDto,
  CreateTimeSlotDto,
  UpdateTimeSlotDto,
  BulkCreateTimeSlotsDto,
  TimeSlotFilterDto,
} from '../dto/course-time-slot.dto';

@ApiTags('Admin - Course Time Slots')
@Controller('api/admin/courses/:courseId/time-slots')
export class AdminTimeSlotController {
  private readonly logger = new Logger(AdminTimeSlotController.name);

  constructor(private readonly timeSlotService: CourseTimeSlotService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] 코스의 모든 타임슬롯 조회 (필터링 지원)' })
  @ApiParam({ name: 'courseId', type: Number, description: '코스 ID' })
  @ApiQuery({ name: 'dateFrom', required: false, description: '시작 날짜 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, description: '종료 날짜 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'timeFrom', required: false, description: '시작 시간 (HH:MM)' })
  @ApiQuery({ name: 'timeTo', required: false, description: '종료 시간 (HH:MM)' })
  @ApiQuery({ name: 'isActive', required: false, description: '활성 상태' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '페이지 크기', example: 20 })
  @ApiResponse({ status: 200, description: '타임슬롯 목록', type: [CourseTimeSlotResponseDto] })
  async getAllTimeSlots(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query() filterDto: TimeSlotFilterDto,
  ): Promise<CourseTimeSlotResponseDto[]> {
    this.logger.log(`Getting time slots for course ${courseId} with filters: ${JSON.stringify(filterDto)}`);
    const slots = await this.timeSlotService.findWithFilters(courseId, filterDto);
    return slots.map((slot) => CourseTimeSlotResponseDto.fromEntity(slot));
  }

  @Get(':timeSlotId')
  @ApiOperation({ summary: '[Admin] 특정 타임슬롯 조회' })
  @ApiParam({ name: 'courseId', type: Number, description: '코스 ID' })
  @ApiParam({ name: 'timeSlotId', type: Number, description: '타임슬롯 ID' })
  @ApiResponse({ status: 200, description: '타임슬롯 정보', type: CourseTimeSlotResponseDto })
  async getTimeSlot(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('timeSlotId', ParseIntPipe) timeSlotId: number,
  ): Promise<CourseTimeSlotResponseDto> {
    this.logger.log(`Getting time slot ${timeSlotId} for course ${courseId}`);
    const slot = await this.timeSlotService.findById(timeSlotId, courseId);
    return CourseTimeSlotResponseDto.fromEntity(slot);
  }

  @Post()
  @ApiOperation({ summary: '[Admin] 타임슬롯 생성' })
  @ApiParam({ name: 'courseId', type: Number, description: '코스 ID' })
  @ApiResponse({ status: 201, description: '생성된 타임슬롯', type: CourseTimeSlotResponseDto })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createTimeSlot(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() createDto: CreateTimeSlotDto,
  ): Promise<CourseTimeSlotResponseDto> {
    this.logger.log(`Creating time slot for course ${courseId}: ${JSON.stringify(createDto)}`);
    const slot = await this.timeSlotService.create(courseId, createDto);
    return CourseTimeSlotResponseDto.fromEntity(slot);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] 타임슬롯 대량 생성' })
  @ApiParam({ name: 'courseId', type: Number, description: '코스 ID' })
  @ApiResponse({ status: 201, description: '생성된 타임슬롯 목록', type: [CourseTimeSlotResponseDto] })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createBulkTimeSlots(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() bulkDto: BulkCreateTimeSlotsDto,
  ): Promise<CourseTimeSlotResponseDto[]> {
    this.logger.log(`Creating ${bulkDto.timeSlots.length} time slots for course ${courseId}`);
    const slots = await this.timeSlotService.createBulk(courseId, bulkDto.timeSlots);
    return slots.map((slot) => CourseTimeSlotResponseDto.fromEntity(slot));
  }

  @Patch(':timeSlotId')
  @ApiOperation({ summary: '[Admin] 타임슬롯 수정' })
  @ApiParam({ name: 'courseId', type: Number, description: '코스 ID' })
  @ApiParam({ name: 'timeSlotId', type: Number, description: '타임슬롯 ID' })
  @ApiResponse({ status: 200, description: '수정된 타임슬롯', type: CourseTimeSlotResponseDto })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateTimeSlot(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('timeSlotId', ParseIntPipe) timeSlotId: number,
    @Body() updateDto: UpdateTimeSlotDto,
  ): Promise<CourseTimeSlotResponseDto> {
    this.logger.log(`Updating time slot ${timeSlotId} for course ${courseId}: ${JSON.stringify(updateDto)}`);
    const slot = await this.timeSlotService.update(timeSlotId, courseId, updateDto);
    return CourseTimeSlotResponseDto.fromEntity(slot);
  }

  @Delete(':timeSlotId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] 타임슬롯 삭제' })
  @ApiParam({ name: 'courseId', type: Number, description: '코스 ID' })
  @ApiParam({ name: 'timeSlotId', type: Number, description: '타임슬롯 ID' })
  @ApiResponse({ status: 204, description: '삭제 완료' })
  async deleteTimeSlot(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('timeSlotId', ParseIntPipe) timeSlotId: number,
  ): Promise<void> {
    this.logger.log(`Deleting time slot ${timeSlotId} for course ${courseId}`);
    await this.timeSlotService.delete(timeSlotId, courseId);
  }
}