import { 
  Controller, 
  Get, 
  Post,
  Put,
  Delete,
  Query, 
  Body,
  Param,
  Headers,
  HttpStatus, 
  HttpException, 
  Logger 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CourseNatsService } from '../services/course-nats.service';

@ApiTags('time-slots')
@Controller('api/admin/time-slots')
export class AdminTimeSlotsController {
  private readonly logger = new Logger(AdminTimeSlotsController.name);

  constructor(private readonly courseService: CourseNatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get time slots list with filters (9-hole support)' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiQuery({ name: 'firstCourseId', required: false, description: 'Filter by first course ID' })
  @ApiQuery({ name: 'secondCourseId', required: false, description: 'Filter by second course ID' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'roundType', required: false, description: 'Round type (NINE_HOLE, EIGHTEEN_HOLE)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Time slots retrieved successfully' })
  async getTimeSlots(
    @Query('companyId') companyId?: string,
    @Query('firstCourseId') firstCourseId?: string,
    @Query('secondCourseId') secondCourseId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('roundType') roundType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = authorization ? this.extractToken(authorization) : undefined;
      
      const filters = {
        companyId: companyId ? Number(companyId) : undefined,
        firstCourseId: firstCourseId ? Number(firstCourseId) : undefined,
        secondCourseId: secondCourseId ? Number(secondCourseId) : undefined,
        dateFrom,
        dateTo,
        roundType,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20
      };
      
      this.logger.log(`Fetching time slots with filters:`, filters);
      
      // company 기반 필터링인 경우 해당 회사의 모든 코스 time slot 조회
      if (companyId && !firstCourseId) {
        // 해당 회사의 모든 코스를 먼저 조회
        const coursesResult = await this.courseService.getCourses(companyId, 1, 100, token);
        const courses = coursesResult?.courses || [];
        
        let allTimeSlots = [];
        for (const course of courses) {
          try {
            const courseTimeSlots = await this.courseService.getTimeSlots({
              courseId: course.id.toString(),
              ...filters
            }, token);
            if (courseTimeSlots?.timeSlots) {
              allTimeSlots = allTimeSlots.concat(courseTimeSlots.timeSlots);
            }
          } catch (error) {
            this.logger.warn(`Failed to fetch time slots for course ${course.id}:`, error);
          }
        }
        
        return {
          success: true,
          data: {
            timeSlots: allTimeSlots,
            totalCount: allTimeSlots.length,
            totalPages: Math.ceil(allTimeSlots.length / (filters.limit || 20)),
            page: filters.page || 1
          }
        };
      }
      
      // 특정 코스에 대한 time slot 조회
      if (firstCourseId) {
        const result = await this.courseService.getTimeSlots({
          courseId: firstCourseId,
          ...filters
        }, token);
        return {
          success: true,
          data: result
        };
      }
      
      // 필터 조건이 부족한 경우
      return {
        success: true,
        data: {
          timeSlots: [],
          totalCount: 0,
          totalPages: 0,
          page: filters.page || 1
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch time slots', error);
      throw this.handleError(error);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create new time slot (9-hole support)' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        date: { type: 'string', example: '2024-07-29' },
        startTime: { type: 'string', example: '09:00' },
        endTime: { type: 'string', example: '11:00' },
        roundType: { type: 'string', enum: ['NINE_HOLE', 'EIGHTEEN_HOLE'], example: 'EIGHTEEN_HOLE' },
        firstCourseId: { type: 'number', example: 1 },
        secondCourseId: { type: 'number', example: 2, nullable: true },
        availableSlots: { type: 'number', example: 4 },
        nineHolePrice: { type: 'number', example: 50000, nullable: true },
        eighteenHolePrice: { type: 'number', example: 90000 },
        notes: { type: 'string', example: '날씨 좋음', nullable: true }
      },
      required: ['date', 'startTime', 'endTime', 'firstCourseId', 'availableSlots', 'eighteenHolePrice']
    }
  })
  @ApiResponse({ status: 201, description: 'Time slot created successfully' })
  async createTimeSlot(
    @Body() data: any,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = authorization ? this.extractToken(authorization) : undefined;
      
      this.logger.log('Creating new time slot:', data);
      
      const result = await this.courseService.createTimeSlot(data.firstCourseId?.toString() || '1', data, token);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error('Failed to create time slot', error);
      throw this.handleError(error);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update time slot (9-hole support)' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Time slot updated successfully' })
  async updateTimeSlot(
    @Param('id') id: string,
    @Body() data: any,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = authorization ? this.extractToken(authorization) : undefined;
      
      this.logger.log(`Updating time slot ${id}:`, data);
      
      const result = await this.courseService.updateTimeSlot(data.firstCourseId?.toString() || '1', id, data, token);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error(`Failed to update time slot ${id}`, error);
      throw this.handleError(error);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete time slot' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Time slot deleted successfully' })
  async deleteTimeSlot(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = authorization ? this.extractToken(authorization) : undefined;
      
      this.logger.log(`Deleting time slot ${id}`);
      
      const result = await this.courseService.deleteTimeSlot('1', id, token);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error(`Failed to delete time slot ${id}`, error);
      throw this.handleError(error);
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get time slot statistics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter by course ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Time slot statistics retrieved successfully' })
  async getTimeSlotStats(
    @Query('courseId') courseId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = authorization ? this.extractToken(authorization) : undefined;
      
      // Default to last 30 days if no date range provided
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const params = {
        courseId,
        startDate: startDate || defaultStartDate,
        endDate: endDate || defaultEndDate
      };
      
      this.logger.log(`Fetching time slot statistics - Course: ${courseId || 'all'}, Range: ${params.startDate} to ${params.endDate}`);
      
      const result = await this.courseService.getTimeSlotStats(params, token);
      return {
        success: true,
        data: {
          stats: result
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch time slot statistics', error);
      throw this.handleError(error);
    }
  }

  private extractToken(authorization: string): string {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization token required',
          }
        },
        HttpStatus.UNAUTHORIZED
      );
    }
    return authorization.substring(7);
  }

  private handleError(error: any): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (error.message?.includes('timeout') || error.code === 'ECONNREFUSED') {
      return new HttpException(
        {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Course service temporarily unavailable',
          }
        },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    return new HttpException(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        }
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}