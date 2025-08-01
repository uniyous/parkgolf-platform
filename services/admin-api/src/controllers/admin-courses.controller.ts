import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query, 
  Headers,
  HttpStatus, 
  HttpException, 
  Logger 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { CourseNatsService } from '../services/course-nats.service';

@ApiTags('courses')
@Controller('api/admin/courses')
export class AdminCoursesController {
  private readonly logger = new Logger(AdminCoursesController.name);

  constructor(private readonly courseService: CourseNatsService) {}

  // Golf Company Management
  @Get('companies')
  @ApiOperation({ summary: 'Get golf companies list' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Companies list retrieved successfully' })
  async getCompanies(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching companies - page: ${page}, limit: ${limit}`);
      
      const result = await this.courseService.getCompanies(page, limit, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch companies', error);
      throw this.handleError(error);
    }
  }

  @Get('companies/:companyId')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  async getCompanyById(
    @Param('companyId') companyId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching company: ${companyId}`);
      
      const result = await this.courseService.getCompanyById(companyId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch company: ${companyId}`, error);
      throw this.handleError(error);
    }
  }

  @Post('companies')
  @ApiOperation({ summary: 'Create new golf company' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  async createCompany(
    @Body() companyData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Creating company: ${companyData.name}`);
      
      const result = await this.courseService.createCompany(companyData, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to create company', error);
      throw this.handleError(error);
    }
  }

  @Patch('companies/:companyId')
  @ApiOperation({ summary: 'Update golf company' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  async updateCompany(
    @Param('companyId') companyId: string,
    @Body() updateData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating company: ${companyId}`);
      
      const result = await this.courseService.updateCompany(companyId, updateData, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update company: ${companyId}`, error);
      throw this.handleError(error);
    }
  }

  @Delete('companies/:companyId')
  @ApiOperation({ summary: 'Delete golf company' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  async deleteCompany(
    @Param('companyId') companyId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Deleting company: ${companyId}`);
      
      const result = await this.courseService.deleteCompany(companyId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete company: ${companyId}`, error);
      throw this.handleError(error);
    }
  }

  // Golf Course Management
  @Get()
  @ApiOperation({ summary: 'Get golf courses list' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Courses list retrieved successfully' })
  async getCourses(
    @Query('companyId') companyId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = authorization ? this.extractToken(authorization) : undefined;
      this.logger.log(`Fetching courses - company: ${companyId || 'all'}, page: ${page}, limit: ${limit}`);
      
      const result = await this.courseService.getCourses(companyId, page, limit, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch courses', error);
      throw this.handleError(error);
    }
  }

  @Get(':courseId')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  async getCourseById(
    @Param('courseId') courseId: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = authorization ? this.extractToken(authorization) : undefined;
      this.logger.log(`Fetching course: ${courseId}`);
      
      const result = await this.courseService.getCourseById(courseId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch course: ${courseId}`, error);
      throw this.handleError(error);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create new golf course' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  async createCourse(
    @Body() courseData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Creating course: ${courseData.name}`);
      
      const result = await this.courseService.createCourse(courseData, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to create course', error);
      throw this.handleError(error);
    }
  }

  @Patch(':courseId')
  @ApiOperation({ summary: 'Update golf course' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  async updateCourse(
    @Param('courseId') courseId: string,
    @Body() updateData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating course: ${courseId}`);
      
      const result = await this.courseService.updateCourse(courseId, updateData, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update course: ${courseId}`, error);
      throw this.handleError(error);
    }
  }

  @Delete(':courseId')
  @ApiOperation({ summary: 'Delete golf course' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully' })
  async deleteCourse(
    @Param('courseId') courseId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Deleting course: ${courseId}`);
      
      const result = await this.courseService.deleteCourse(courseId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete course: ${courseId}`, error);
      throw this.handleError(error);
    }
  }

  // Time Slot Management
  @Get(':courseId/time-slots')
  @ApiOperation({ summary: 'Get course time slots' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Time slots retrieved successfully' })
  async getTimeSlots(
    @Param('courseId') courseId: string,
    @Query('date') date?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = authorization ? this.extractToken(authorization) : undefined;
      this.logger.log(`Fetching time slots for course: ${courseId}, date: ${date || 'all'}`);
      
      const result = await this.courseService.getTimeSlots(courseId, date, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch time slots for course: ${courseId}`, error);
      throw this.handleError(error);
    }
  }

  @Post(':courseId/time-slots')
  @ApiOperation({ summary: 'Create time slot for course' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Time slot created successfully' })
  async createTimeSlot(
    @Param('courseId') courseId: string,
    @Body() timeSlotData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Creating time slot for course: ${courseId}`);
      
      const result = await this.courseService.createTimeSlot(courseId, timeSlotData, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create time slot for course: ${courseId}`, error);
      throw this.handleError(error);
    }
  }

  @Patch(':courseId/time-slots/:timeSlotId')
  @ApiOperation({ summary: 'Update time slot' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Time slot updated successfully' })
  async updateTimeSlot(
    @Param('courseId') courseId: string,
    @Param('timeSlotId') timeSlotId: string,
    @Body() updateData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating time slot: ${timeSlotId}`);
      
      const result = await this.courseService.updateTimeSlot(courseId, timeSlotId, updateData, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update time slot: ${timeSlotId}`, error);
      throw this.handleError(error);
    }
  }

  @Delete(':courseId/time-slots/:timeSlotId')
  @ApiOperation({ summary: 'Delete time slot' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Time slot deleted successfully' })
  async deleteTimeSlot(
    @Param('courseId') courseId: string,
    @Param('timeSlotId') timeSlotId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Deleting time slot: ${timeSlotId}`);
      
      const result = await this.courseService.deleteTimeSlot(courseId, timeSlotId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete time slot: ${timeSlotId}`, error);
      throw this.handleError(error);
    }
  }

  // Weekly Schedule Management
  @Get(':courseId/weekly-schedules')
  @ApiOperation({ summary: 'Get all weekly schedules for course' })
  @ApiResponse({ status: 200, description: 'Weekly schedules retrieved successfully' })
  async getWeeklySchedules(
    @Param('courseId') courseId: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = authorization ? this.extractToken(authorization) : undefined;
      this.logger.log(`Fetching weekly schedules for course: ${courseId}`);
      
      const result = await this.courseService.getWeeklySchedules(courseId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch weekly schedules for course: ${courseId}`, error);
      throw this.handleError(error);
    }
  }

  @Get(':courseId/weekly-schedules/:scheduleId')
  @ApiOperation({ summary: 'Get weekly schedule by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Weekly schedule retrieved successfully' })
  async getWeeklyScheduleById(
    @Param('courseId') courseId: string,
    @Param('scheduleId') scheduleId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching weekly schedule: ${scheduleId} for course: ${courseId}`);
      
      const result = await this.courseService.getWeeklyScheduleById(scheduleId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch weekly schedule: ${scheduleId}`, error);
      throw this.handleError(error);
    }
  }

  @Get(':courseId/weekly-schedules/day/:dayOfWeek')
  @ApiOperation({ summary: 'Get weekly schedule by day of week' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Weekly schedule retrieved successfully' })
  async getWeeklyScheduleByDay(
    @Param('courseId') courseId: string,
    @Param('dayOfWeek') dayOfWeek: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching weekly schedule for course: ${courseId}, day: ${dayOfWeek}`);
      
      const result = await this.courseService.getWeeklyScheduleByDay(courseId, dayOfWeek, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch weekly schedule for day: ${dayOfWeek}`, error);
      throw this.handleError(error);
    }
  }

  @Post(':courseId/weekly-schedules')
  @ApiOperation({ summary: 'Create weekly schedule for course' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Weekly schedule created successfully' })
  async createWeeklySchedule(
    @Param('courseId') courseId: string,
    @Body() scheduleData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Creating weekly schedule for course: ${courseId}`);
      
      const data = { ...scheduleData, courseId: Number(courseId) };
      const result = await this.courseService.createWeeklySchedule(data, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create weekly schedule for course: ${courseId}`, error);
      throw this.handleError(error);
    }
  }

  @Patch(':courseId/weekly-schedules/:scheduleId')
  @ApiOperation({ summary: 'Update weekly schedule' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Weekly schedule updated successfully' })
  async updateWeeklySchedule(
    @Param('courseId') courseId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() scheduleData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating weekly schedule: ${scheduleId} for course: ${courseId}`);
      
      const result = await this.courseService.updateWeeklySchedule(scheduleId, scheduleData, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update weekly schedule: ${scheduleId}`, error);
      throw this.handleError(error);
    }
  }

  @Delete(':courseId/weekly-schedules/:scheduleId')
  @ApiOperation({ summary: 'Delete weekly schedule' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Weekly schedule deleted successfully' })
  async deleteWeeklySchedule(
    @Param('courseId') courseId: string,
    @Param('scheduleId') scheduleId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Deleting weekly schedule: ${scheduleId} for course: ${courseId}`);
      
      const result = await this.courseService.deleteWeeklySchedule(scheduleId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete weekly schedule: ${scheduleId}`, error);
      throw this.handleError(error);
    }
  }

  // Hole Management
  @Get(':courseId/holes')
  @ApiOperation({ summary: 'Get holes for a course' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Holes retrieved successfully' })
  async getHoles(
    @Param('courseId') courseId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching holes for course: ${courseId}`);
      
      const result = await this.courseService.getHoles(courseId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch holes for course: ${courseId}`, error);
      throw this.handleError(error);
    }
  }

  @Get(':courseId/holes/:holeId')
  @ApiOperation({ summary: 'Get hole by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Hole retrieved successfully' })
  async getHoleById(
    @Param('courseId') courseId: string,
    @Param('holeId') holeId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching hole: ${holeId} for course: ${courseId}`);
      
      const result = await this.courseService.getHoleById(courseId, holeId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch hole: ${holeId}`, error);
      throw this.handleError(error);
    }
  }

  @Post(':courseId/holes')
  @ApiOperation({ summary: 'Create new hole for course' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Hole created successfully' })
  async createHole(
    @Param('courseId') courseId: string,
    @Body() holeData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Creating hole for course: ${courseId}`);
      
      const result = await this.courseService.createHole(courseId, holeData, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create hole for course: ${courseId}`, error);
      throw this.handleError(error);
    }
  }

  @Patch(':courseId/holes/:holeId')
  @ApiOperation({ summary: 'Update hole' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Hole updated successfully' })
  async updateHole(
    @Param('courseId') courseId: string,
    @Param('holeId') holeId: string,
    @Body() updateData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating hole: ${holeId}`);
      
      const result = await this.courseService.updateHole(courseId, holeId, updateData, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update hole: ${holeId}`, error);
      throw this.handleError(error);
    }
  }

  @Delete(':courseId/holes/:holeId')
  @ApiOperation({ summary: 'Delete hole' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Hole deleted successfully' })
  async deleteHole(
    @Param('courseId') courseId: string,
    @Param('holeId') holeId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Deleting hole: ${holeId}`);
      
      const result = await this.courseService.deleteHole(courseId, holeId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete hole: ${holeId}`, error);
      throw this.handleError(error);
    }
  }


  // Course Statistics
  @Get('stats/overview')
  @ApiOperation({ summary: 'Get course statistics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Course statistics retrieved successfully' })
  async getCourseStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);
      
      // Default to last 30 days if no date range provided
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const dateRange = {
        startDate: startDate || defaultStartDate,
        endDate: endDate || defaultEndDate
      };
      
      this.logger.log(`Fetching course statistics for range: ${dateRange.startDate} to ${dateRange.endDate}`);
      
      const result = await this.courseService.getCourseStats(dateRange, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch course statistics', error);
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