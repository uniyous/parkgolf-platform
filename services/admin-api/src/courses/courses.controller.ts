import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  ParseIntPipe,
  HttpStatus,
  HttpException,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { CourseService } from './courses.service';

// Club DTOs
export interface ClubFiltersDto {
  companyId?: number;
  location?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateClubDto {
  companyId: number;
  name: string;
  location: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  operatingHours: {
    open: string;
    close: string;
  };
  facilities?: string[];
  status: 'ACTIVE' | 'MAINTENANCE' | 'SEASONAL_CLOSED' | 'INACTIVE';
}

export interface UpdateClubDto {
  name?: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  operatingHours?: {
    open: string;
    close: string;
  };
  facilities?: string[];
  status?: 'ACTIVE' | 'MAINTENANCE' | 'SEASONAL_CLOSED' | 'INACTIVE';
  seasonInfo?: {
    type: 'peak' | 'regular' | 'off';
    startDate: string;
    endDate: string;
  };
}

@ApiTags('courses')
@Controller('api/admin/courses')
export class CoursesController {
  private readonly logger = new Logger(CoursesController.name);

  constructor(private readonly courseService: CourseService) {}

  // ============================================
  // Club Management
  // ============================================
  @Get('clubs')
  @ApiOperation({ summary: 'Get clubs list' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Clubs retrieved successfully' })
  async getClubs(
    @Query() filters: ClubFiltersDto,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log('Fetching clubs');
    return this.courseService.getClubs(filters, token);
  }

  @Get('clubs/search')
  @ApiOperation({ summary: 'Search clubs' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchClubs(
    @Query('q') query: string,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Searching clubs: ${query}`);
    const result = await this.courseService.searchClubs(query, token);
    return { data: result };
  }

  @Get('clubs/company/:companyId')
  @ApiOperation({ summary: 'Get clubs by company' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Clubs retrieved successfully' })
  async getClubsByCompany(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Fetching clubs by company: ${companyId}`);
    return this.courseService.getClubsByCompany(companyId, token);
  }

  @Get('clubs/:id')
  @ApiOperation({ summary: 'Get club by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Club retrieved successfully' })
  async getClubById(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Fetching club: ${id}`);
    return this.courseService.getClubById(id, token);
  }

  @Post('clubs')
  @ApiOperation({ summary: 'Create new club' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Club created successfully' })
  async createClub(
    @Body() createClubDto: CreateClubDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log('Creating club');
    return this.courseService.createClub(createClubDto, token);
  }

  @Put('clubs/:id')
  @ApiOperation({ summary: 'Update club' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Club updated successfully' })
  async updateClub(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClubDto: UpdateClubDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Updating club: ${id}`);
    return this.courseService.updateClub(id, updateClubDto, token);
  }

  @Delete('clubs/:id')
  @ApiOperation({ summary: 'Delete club' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Club deleted successfully' })
  async deleteClub(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') authorization: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Deleting club: ${id}`);
    return this.courseService.deleteClub(id, token);
  }

  // ============================================
  // Course Management
  // ============================================
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
    const token = authorization ? this.extractToken(authorization) : undefined;
    this.logger.log(`Fetching courses - company: ${companyId || 'all'}, page: ${page}, limit: ${limit}`);
    return this.courseService.getCourses(companyId, page, limit, token);
  }

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
    const token = this.extractToken(authorization);

    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dateRange = {
      startDate: startDate || defaultStartDate,
      endDate: endDate || defaultEndDate
    };

    this.logger.log(`Fetching course statistics for range: ${dateRange.startDate} to ${dateRange.endDate}`);
    return this.courseService.getCourseStats(dateRange, token);
  }

  @Get('club/:clubId')
  @ApiOperation({ summary: 'Get courses by club' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  async getCoursesByClub(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization ? this.extractToken(authorization) : undefined;
    this.logger.log(`Fetching courses by club: ${clubId}`);
    return this.courseService.getCoursesByClub(clubId, token);
  }

  @Get(':courseId')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  async getCourseById(
    @Param('courseId') courseId: string,
    @Headers('authorization') authorization?: string
  ) {
    const token = authorization ? this.extractToken(authorization) : undefined;
    this.logger.log(`Fetching course: ${courseId}`);
    return this.courseService.getCourseById(courseId, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new golf course' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  async createCourse(
    @Body() courseData: any,
    @Headers('authorization') authorization: string
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Creating course: ${courseData.name}`);
    return this.courseService.createCourse(courseData, token);
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
    const token = this.extractToken(authorization);
    this.logger.log(`Updating course: ${courseId}`);
    return this.courseService.updateCourse(courseId, updateData, token);
  }

  @Delete(':courseId')
  @ApiOperation({ summary: 'Delete golf course' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully' })
  async deleteCourse(
    @Param('courseId') courseId: string,
    @Headers('authorization') authorization: string
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Deleting course: ${courseId}`);
    return this.courseService.deleteCourse(courseId, token);
  }

  // ============================================
  // Hole Management
  // ============================================
  @Get(':courseId/holes')
  @ApiOperation({ summary: 'Get holes for a course' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Holes retrieved successfully' })
  async getHoles(
    @Param('courseId') courseId: string,
    @Headers('authorization') authorization: string
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Fetching holes for course: ${courseId}`);
    return this.courseService.getHoles(courseId, token);
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
    const token = this.extractToken(authorization);
    this.logger.log(`Fetching hole: ${holeId} for course: ${courseId}`);
    return this.courseService.getHoleById(courseId, holeId, token);
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
    const token = this.extractToken(authorization);
    this.logger.log(`Creating hole for course: ${courseId}`);
    return this.courseService.createHole(courseId, holeData, token);
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
    const token = this.extractToken(authorization);
    this.logger.log(`Updating hole: ${holeId}`);
    return this.courseService.updateHole(courseId, holeId, updateData, token);
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
    const token = this.extractToken(authorization);
    this.logger.log(`Deleting hole: ${holeId}`);
    return this.courseService.deleteHole(courseId, holeId, token);
  }

  private extractToken(authorization?: string): string {
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
}
