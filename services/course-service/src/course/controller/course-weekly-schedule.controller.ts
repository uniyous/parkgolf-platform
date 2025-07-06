import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CourseWeeklyScheduleService } from '../service/course-weekly-schedule.service';
import { CourseWeeklyScheduleResponseDto, CreateCourseWeeklyScheduleDto, UpdateCourseWeeklyScheduleDto } from '../dto/course-weekly-schedule.dto';

@ApiTags(' Courses - Weekly Schedules')
@Controller('api/courses/:courseId/weekly-schedules')
export class CourseWeeklyScheduleController {
  constructor(private readonly scheduleService: CourseWeeklyScheduleService) {}

  @Post()
  @ApiOperation({ summary: '새로운 주간 스케줄 항목 생성' })
  @ApiResponse({ status: 201, description: '스케줄 생성 성공', type: CourseWeeklyScheduleResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 404, description: '골프 코스 없음' })
  @ApiResponse({ status: 409, description: '이미 해당 요일의 스케줄 존재 또는 시간 오류' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async create(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() createDto: Omit<CreateCourseWeeklyScheduleDto, 'courseId'>,
  ): Promise<CourseWeeklyScheduleResponseDto> {
    const fullDto: CreateCourseWeeklyScheduleDto = { ...createDto, courseId };
    const schedule = await this.scheduleService.create(fullDto);
    return CourseWeeklyScheduleResponseDto.fromEntity(schedule);
  }

  @Get()
  @ApiOperation({ summary: '특정 골프 코스의 모든 주간 스케줄 조회' })
  @ApiResponse({ status: 200, description: '스케줄 목록 반환', type: [CourseWeeklyScheduleResponseDto] })
  async findAllByCourseId(@Param('courseId', ParseIntPipe) courseId: number): Promise<CourseWeeklyScheduleResponseDto[]> {
    const schedules = await this.scheduleService.findAllByCourseId(courseId);
    return schedules.map((schedule) => CourseWeeklyScheduleResponseDto.fromEntity(schedule));
  }

  @Get('day/:dayOfWeek')
  @ApiOperation({ summary: '특정 골프 코스의 특정 요일 스케줄 조회' })
  @ApiParam({ name: 'courseId', type: Number })
  @ApiParam({ name: 'dayOfWeek', type: Number, description: '0 (Sunday) to 6 (Saturday)' })
  @ApiResponse({ status: 200, description: '스케줄 반환', type: CourseWeeklyScheduleResponseDto })
  @ApiResponse({ status: 404, description: '스케줄 없음' })
  async findByCourseAndDay(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('dayOfWeek', ParseIntPipe) dayOfWeek: number,
  ): Promise<CourseWeeklyScheduleResponseDto> {
    const schedule = await this.scheduleService.findByCourseAndDay(courseId, dayOfWeek);
    if (!schedule) {
      throw new NotFoundException(`Weekly schedule not found for course ${courseId} on day ${dayOfWeek}`);
    }
    return CourseWeeklyScheduleResponseDto.fromEntity(schedule);
  }

  // ID (PK) 기반의 조회, 수정, 삭제는 잘 사용되지 않을 수 있음 (courseId와 dayOfWeek 조합이 더 자연스러움)
  @Get(':scheduleId')
  @ApiOperation({ summary: 'ID로 특정 주간 스케줄 항목 조회' })
  @ApiResponse({ status: 200, description: '스케줄 반환', type: CourseWeeklyScheduleResponseDto })
  @ApiResponse({ status: 404, description: '스케줄 없음' })
  async findOne(@Param('scheduleId', ParseIntPipe) scheduleId: number): Promise<CourseWeeklyScheduleResponseDto> {
    const schedule = await this.scheduleService.findOne(scheduleId);
    return CourseWeeklyScheduleResponseDto.fromEntity(schedule);
  }

  @Patch(':scheduleId')
  @ApiOperation({ summary: 'ID로 특정 주간 스케줄 항목 수정' })
  @ApiResponse({ status: 200, description: '스케줄 수정 성공', type: CourseWeeklyScheduleResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 404, description: '스케줄 없음' })
  @ApiResponse({ status: 409, description: '시간 오류 또는 식별자 변경 시도' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, skipMissingProperties: true }))
  async update(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Body() updateDto: UpdateCourseWeeklyScheduleDto,
  ): Promise<CourseWeeklyScheduleResponseDto> {
    const schedule = await this.scheduleService.update(scheduleId, updateDto);
    return CourseWeeklyScheduleResponseDto.fromEntity(schedule);
  }

  @Delete(':scheduleId')
  @ApiOperation({ summary: 'ID로 특정 주간 스케줄 항목 삭제' })
  @ApiResponse({ status: 204, description: '스케줄 삭제 성공' })
  @ApiResponse({ status: 404, description: '스케줄 없음' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('scheduleId', ParseIntPipe) scheduleId: number): Promise<void> {
    await this.scheduleService.remove(scheduleId);
  }
}
