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
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { TimeSlotsService } from './time-slots.service';

@ApiTags('time-slots')
@Controller('api/admin/time-slots')
export class TimeSlotsController {
  private readonly logger = new Logger(TimeSlotsController.name);

  constructor(private readonly timeSlotsService: TimeSlotsService) {}

  @Get()
  @ApiOperation({ summary: 'Get time slots list' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter by course ID' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'timeFrom', required: false, description: 'Filter from time (HH:MM)' })
  @ApiQuery({ name: 'timeTo', required: false, description: 'Filter to time (HH:MM)' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Time slots retrieved successfully' })
  async getTimeSlots(
    @Query() query: any,
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Fetching time slots with filters:`, query);
    const result = await this.timeSlotsService.getTimeSlots(query, token);
    return { success: true, data: result };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get time slot statistics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter by course ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Time slot statistics retrieved successfully' })
  async getTimeSlotStats(
    @Query() query: any,
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log('Fetching time slot statistics');
    const result = await this.timeSlotsService.getTimeSlotStats(query, token);
    return { success: true, data: result };
  }

  @Get(':timeSlotId')
  @ApiOperation({ summary: 'Get time slot by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Time slot retrieved successfully' })
  async getTimeSlotById(
    @Param('timeSlotId') timeSlotId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Fetching time slot: ${timeSlotId}`);
    const result = await this.timeSlotsService.getTimeSlotById(timeSlotId, token);
    return { success: true, data: result };
  }

  @Post('course/:courseId')
  @ApiOperation({ summary: 'Create time slot for course' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Time slot created successfully' })
  async createTimeSlot(
    @Param('courseId') courseId: string,
    @Body() timeSlotData: any,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Creating time slot for course: ${courseId}`);
    const result = await this.timeSlotsService.createTimeSlot(courseId, timeSlotData, token);
    return { success: true, data: result };
  }

  @Post('course/:courseId/bulk')
  @ApiOperation({ summary: 'Create bulk time slots for course' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Bulk time slots created successfully' })
  async createBulkTimeSlots(
    @Param('courseId') courseId: string,
    @Body() bulkData: { timeSlots: any[] },
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Creating bulk time slots for course: ${courseId}`);
    const results = await this.timeSlotsService.bulkCreateTimeSlots(courseId, bulkData.timeSlots, token);
    return { success: true, data: results };
  }

  @Patch(':timeSlotId/course/:courseId')
  @ApiOperation({ summary: 'Update time slot' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Time slot updated successfully' })
  async updateTimeSlot(
    @Param('courseId') courseId: string,
    @Param('timeSlotId') timeSlotId: string,
    @Body() updateData: any,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Updating time slot: ${timeSlotId}`);
    const result = await this.timeSlotsService.updateTimeSlot(courseId, timeSlotId, updateData, token);
    return { success: true, data: result };
  }

  @Delete(':timeSlotId/course/:courseId')
  @ApiOperation({ summary: 'Delete time slot' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Time slot deleted successfully' })
  async deleteTimeSlot(
    @Param('courseId') courseId: string,
    @Param('timeSlotId') timeSlotId: string,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Deleting time slot: ${timeSlotId}`);
    const result = await this.timeSlotsService.deleteTimeSlot(courseId, timeSlotId, token);
    return { success: true, data: result };
  }
}
