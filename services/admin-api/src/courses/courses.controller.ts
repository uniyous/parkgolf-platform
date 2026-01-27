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
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CourseService } from './courses.service';
import { BearerToken } from '../common';

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
@ApiBearerAuth()
@Controller('api/admin/courses')
export class CoursesController {
  private readonly logger = new Logger(CoursesController.name);

  constructor(private readonly courseService: CourseService) {}

  // ============================================
  // Club Management
  // ============================================
  @Get('clubs')
  @ApiOperation({ summary: 'Get clubs list' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Clubs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getClubs(
    @BearerToken() token: string,
    @Query() filters: ClubFiltersDto,
  ) {
    this.logger.log('Fetching clubs');
    return this.courseService.getClubs(filters, token);
  }

  @Get('clubs/search')
  @ApiOperation({ summary: 'Search clubs' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchClubs(
    @BearerToken() token: string,
    @Query('q') query: string,
  ) {
    this.logger.log(`Searching clubs: ${query}`);
    const result = await this.courseService.searchClubs(query, token);
    return { data: result };
  }

  @Get('clubs/company/:companyId')
  @ApiOperation({ summary: 'Get clubs by company' })
  @ApiResponse({ status: 200, description: 'Clubs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getClubsByCompany(
    @BearerToken() token: string,
    @Param('companyId', ParseIntPipe) companyId: number,
  ) {
    this.logger.log(`Fetching clubs by company: ${companyId}`);
    return this.courseService.getClubsByCompany(companyId, token);
  }

  @Get('clubs/:id')
  @ApiOperation({ summary: 'Get club by ID' })
  @ApiResponse({ status: 200, description: 'Club retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getClubById(
    @BearerToken() token: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.logger.log(`Fetching club: ${id}`);
    return this.courseService.getClubById(id, token);
  }

  @Post('clubs')
  @ApiOperation({ summary: 'Create new club' })
  @ApiResponse({ status: 201, description: 'Club created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createClub(
    @BearerToken() token: string,
    @Body() createClubDto: CreateClubDto,
  ) {
    this.logger.log('Creating club');
    return this.courseService.createClub(createClubDto, token);
  }

  @Put('clubs/:id')
  @ApiOperation({ summary: 'Update club' })
  @ApiResponse({ status: 200, description: 'Club updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateClub(
    @BearerToken() token: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClubDto: UpdateClubDto,
  ) {
    this.logger.log(`Updating club: ${id}`);
    return this.courseService.updateClub(id, updateClubDto, token);
  }

  @Delete('clubs/:id')
  @ApiOperation({ summary: 'Delete club' })
  @ApiResponse({ status: 200, description: 'Club deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteClub(
    @BearerToken() token: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCourses(
    @BearerToken({ required: false }) token: string | undefined,
    @Query('companyId') companyId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    this.logger.log(`Fetching courses - company: ${companyId || 'all'}, page: ${page}, limit: ${limit}`);
    return this.courseService.getCourses(companyId, page, limit, token);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get course statistics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Course statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCourseStats(
    @BearerToken() token: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dateRange = {
      startDate: startDate || defaultStartDate,
      endDate: endDate || defaultEndDate,
    };

    this.logger.log(`Fetching course statistics for range: ${dateRange.startDate} to ${dateRange.endDate}`);
    return this.courseService.getCourseStats(dateRange, token);
  }

  @Get('club/:clubId')
  @ApiOperation({ summary: 'Get courses by club' })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCoursesByClub(
    @BearerToken({ required: false }) token: string | undefined,
    @Param('clubId', ParseIntPipe) clubId: number,
  ) {
    this.logger.log(`Fetching courses by club: ${clubId}`);
    return this.courseService.getCoursesByClub(clubId, token);
  }

  @Get(':courseId')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCourseById(
    @BearerToken({ required: false }) token: string | undefined,
    @Param('courseId') courseId: string,
  ) {
    this.logger.log(`Fetching course: ${courseId}`);
    return this.courseService.getCourseById(courseId, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new golf course' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCourse(
    @BearerToken() token: string,
    @Body() courseData: Record<string, unknown>,
  ) {
    this.logger.log(`Creating course: ${courseData.name}`);
    return this.courseService.createCourse(courseData, token);
  }

  @Patch(':courseId')
  @ApiOperation({ summary: 'Update golf course' })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateCourse(
    @BearerToken() token: string,
    @Param('courseId') courseId: string,
    @Body() updateData: Record<string, unknown>,
  ) {
    this.logger.log(`Updating course: ${courseId}`);
    return this.courseService.updateCourse(courseId, updateData, token);
  }

  @Delete(':courseId')
  @ApiOperation({ summary: 'Delete golf course' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteCourse(
    @BearerToken() token: string,
    @Param('courseId') courseId: string,
  ) {
    this.logger.log(`Deleting course: ${courseId}`);
    return this.courseService.deleteCourse(courseId, token);
  }

  // ============================================
  // Hole Management
  // ============================================
  @Get(':courseId/holes')
  @ApiOperation({ summary: 'Get holes for a course' })
  @ApiResponse({ status: 200, description: 'Holes retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHoles(
    @BearerToken() token: string,
    @Param('courseId') courseId: string,
  ) {
    this.logger.log(`Fetching holes for course: ${courseId}`);
    return this.courseService.getHoles(courseId, token);
  }

  @Get(':courseId/holes/:holeId')
  @ApiOperation({ summary: 'Get hole by ID' })
  @ApiResponse({ status: 200, description: 'Hole retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHoleById(
    @BearerToken() token: string,
    @Param('courseId') courseId: string,
    @Param('holeId') holeId: string,
  ) {
    this.logger.log(`Fetching hole: ${holeId} for course: ${courseId}`);
    return this.courseService.getHoleById(courseId, holeId, token);
  }

  @Post(':courseId/holes')
  @ApiOperation({ summary: 'Create new hole for course' })
  @ApiResponse({ status: 201, description: 'Hole created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createHole(
    @BearerToken() token: string,
    @Param('courseId') courseId: string,
    @Body() holeData: Record<string, unknown>,
  ) {
    this.logger.log(`Creating hole for course: ${courseId}`);
    return this.courseService.createHole(courseId, holeData, token);
  }

  @Patch(':courseId/holes/:holeId')
  @ApiOperation({ summary: 'Update hole' })
  @ApiResponse({ status: 200, description: 'Hole updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateHole(
    @BearerToken() token: string,
    @Param('courseId') courseId: string,
    @Param('holeId') holeId: string,
    @Body() updateData: Record<string, unknown>,
  ) {
    this.logger.log(`Updating hole: ${holeId}`);
    return this.courseService.updateHole(courseId, holeId, updateData, token);
  }

  @Delete(':courseId/holes/:holeId')
  @ApiOperation({ summary: 'Delete hole' })
  @ApiResponse({ status: 200, description: 'Hole deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteHole(
    @BearerToken() token: string,
    @Param('courseId') courseId: string,
    @Param('holeId') holeId: string,
  ) {
    this.logger.log(`Deleting hole: ${holeId}`);
    return this.courseService.deleteHole(courseId, holeId, token);
  }
}
