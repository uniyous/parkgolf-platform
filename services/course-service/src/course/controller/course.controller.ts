import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CourseService } from '../service/course.service';
import { CreateCourseDto, FindCoursesQueryDto, CourseResponseDto, UpdateCourseDto } from '../dto/course.dto';

@ApiTags('Courses')
@Controller('api/courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  // NATS Message Handlers
  @MessagePattern('courses.list')
  async getCoursesViaMessage(@Payload() data: { companyId?: string; page?: number; limit?: number; token?: string }) {
    try {
      const { companyId, page = 1, limit = 20 } = data;
      
      // Ensure proper type conversion
      const query: FindCoursesQueryDto = { 
        page: typeof page === 'string' ? parseInt(page) : page, 
        limit: typeof limit === 'string' ? parseInt(limit) : limit 
      };
      
      if (companyId) {
        query.companyId = typeof companyId === 'string' ? parseInt(companyId) : companyId;
      }
      
      const result = await this.courseService.findAll(query);
      
      return {
        success: true,
        data: result.data.map((course) => CourseResponseDto.fromEntity(course)),
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COURSES_FETCH_FAILED',
          message: error.message || 'Failed to fetch courses'
        }
      };
    }
  }

  @MessagePattern('courses.findById')
  async getCourseByIdViaMessage(@Payload() data: { courseId: string; token?: string }) {
    try {
      const course = await this.courseService.findOne(parseInt(data.courseId));
      return {
        success: true,
        data: CourseResponseDto.fromEntity(course)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: error.message || 'Course not found'
        }
      };
    }
  }

  @MessagePattern('courses.create')
  async createCourseViaMessage(@Payload() data: { data: CreateCourseDto; token: string }) {
    try {
      const course = await this.courseService.create(data.data);
      return {
        success: true,
        data: CourseResponseDto.fromEntity(course)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COURSE_CREATE_FAILED',
          message: error.message || 'Failed to create course'
        }
      };
    }
  }

  @MessagePattern('courses.update')
  async updateCourseViaMessage(@Payload() data: { courseId: string; data: UpdateCourseDto; token: string }) {
    try {
      const course = await this.courseService.update(parseInt(data.courseId), data.data);
      return {
        success: true,
        data: CourseResponseDto.fromEntity(course)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COURSE_UPDATE_FAILED',
          message: error.message || 'Failed to update course'
        }
      };
    }
  }

  @MessagePattern('courses.delete')
  async deleteCourseViaMessage(@Payload() data: { courseId: string; token: string }) {
    try {
      await this.courseService.remove(parseInt(data.courseId));
      return {
        success: true,
        message: `Course with ID ${data.courseId} successfully deleted.`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COURSE_DELETE_FAILED',
          message: error.message || 'Failed to delete course'
        }
      };
    }
  }

  // HTTP Endpoints (existing)
  @Post()
  @ApiOperation({ summary: '새로운 코스 생성' })
  @ApiResponse({ status: 201, description: '코스 생성 성공', type: CourseResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 404, description: '회사 없음' })
  @ApiResponse({ status: 409, description: '이미 존재하는 코스 이름 (해당 회사 내)' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async create(@Body() createDto: CreateCourseDto): Promise<CourseResponseDto> {
    const course = await this.courseService.create(createDto);
    return CourseResponseDto.fromEntity(course);
  }

  @Get()
  @ApiOperation({ summary: '코스 목록 조회 (페이지네이션 및 필터링 가능)' })
  @ApiResponse({ status: 200, description: '코스 목록 반환' })
  @UsePipes(new ValidationPipe({ transform: true, skipMissingProperties: true }))
  async findAll(@Query() query: FindCoursesQueryDto): Promise<{ data: CourseResponseDto[]; total: number; page: number; limit: number }> {
    const result = await this.courseService.findAll(query);
    return {
      ...result,
      data: result.data.map((course) => CourseResponseDto.fromEntity(course)),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID로 특정 코스 조회' })
  @ApiResponse({ status: 200, description: '코스 정보 반환', type: CourseResponseDto })
  @ApiResponse({ status: 404, description: '코스 없음' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CourseResponseDto> {
    const course = await this.courseService.findOne(id);
    return CourseResponseDto.fromEntity(course);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ID로 특정 코스 정보 수정' })
  @ApiResponse({ status: 200, description: '코스 수정 성공', type: CourseResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 404, description: '코스 또는 대상 회사 없음' })
  @ApiResponse({ status: 409, description: '이미 존재하는 코스 이름 (해당 회사 내)' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, skipMissingProperties: true }))
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCourseDto): Promise<CourseResponseDto> {
    const course = await this.courseService.update(id, updateDto);
    return CourseResponseDto.fromEntity(course);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'ID로 특정 코스 삭제' })
  @ApiResponse({ status: 204, description: '코스 삭제 성공' })
  @ApiResponse({ status: 404, description: '코스 없음' })
  @ApiResponse({ status: 409, description: '관련 데이터가 있어 삭제 불가' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.courseService.remove(id);
  }
}
