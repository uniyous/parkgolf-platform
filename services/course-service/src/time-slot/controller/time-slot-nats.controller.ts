import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TimeSlotService } from '../service/time-slot.service';
import {
  successResponse,
  errorResponse,
  paginationMeta,
  mapTimeSlotToResponse,
} from '../../common/utils/response.util';

@Controller()
export class TimeSlotNatsController {
  private readonly logger = new Logger(TimeSlotNatsController.name);

  constructor(private readonly timeSlotService: TimeSlotService) {}

  @MessagePattern('timeSlots.list')
  async getTimeSlots(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting time slots for course ${data.courseId}`);

      const { courseId, page = 1, limit = 20 } = data;
      const slots = await this.timeSlotService.findByCourse(Number(courseId));

      const result = slots.map(slot => ({
        ...mapTimeSlotToResponse(slot),
        courseName: `코스 ${slot.courseId}`,
        maxSlots: slot.maxPlayers,
        bookedSlots: 0,
        availableSlots: slot.maxPlayers,
        status: slot.isActive ? 'AVAILABLE' : 'INACTIVE',
        isRecurring: false,
        revenue: 0,
        utilizationRate: 0,
      }));

      this.logger.log(`NATS: Returning ${result.length} time slots`);
      return successResponse(
        { timeSlots: result },
        paginationMeta(slots.length, Number(page), Number(limit))
      );
    } catch (error) {
      this.logger.error('NATS: Failed to get time slots', error);
      return errorResponse('TIMESLOTS_LIST_FAILED', error.message || 'Failed to get time slots');
    }
  }

  @MessagePattern('timeSlots.stats')
  async getTimeSlotStats(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting time slot stats for course ${data.courseId || 'all'}`);

      // Get actual data from database
      const courseId = data.courseId ? Number(data.courseId) : null;
      const slots = courseId
        ? await this.timeSlotService.findByCourse(courseId)
        : await this.timeSlotService.findAll();

      const activeSlots = slots.filter(s => s.isActive);
      const totalRevenue = slots.reduce((sum, s) => sum + Number(s.price), 0);
      const averagePrice = slots.length > 0 ? Math.round(totalRevenue / slots.length) : 0;

      const stats = {
        totalSlots: slots.length,
        activeSlots: activeSlots.length,
        fullyBookedSlots: 0,
        cancelledSlots: slots.length - activeSlots.length,
        totalRevenue: 0,
        averageUtilization: 0,
        totalBookings: 0,
        averagePrice,
        peakHours: [],
        topCourses: [],
      };

      this.logger.log('NATS: Returning time slot statistics');
      return successResponse(stats);
    } catch (error) {
      this.logger.error('NATS: Failed to get time slot stats', error);
      return errorResponse('TIMESLOTS_STATS_FAILED', error.message || 'Failed to get time slot stats');
    }
  }

  @MessagePattern('timeSlots.create')
  async createTimeSlot(@Payload() data: any) {
    try {
      this.logger.log('NATS: Creating time slot');

      const slot = await this.timeSlotService.create(data.data);
      this.logger.log(`NATS: Created time slot with ID ${slot.id}`);
      return successResponse(mapTimeSlotToResponse(slot));
    } catch (error) {
      this.logger.error('NATS: Failed to create time slot', error);
      return errorResponse('TIMESLOT_CREATE_FAILED', error.message || 'Failed to create time slot');
    }
  }

  @MessagePattern('timeSlots.update')
  async updateTimeSlot(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Updating time slot ${data.timeSlotId}`);

      const slot = await this.timeSlotService.update(Number(data.timeSlotId), data.data);
      this.logger.log(`NATS: Updated time slot ${slot.id}`);
      return successResponse(mapTimeSlotToResponse(slot));
    } catch (error) {
      this.logger.error('NATS: Failed to update time slot', error);
      return errorResponse('TIMESLOT_UPDATE_FAILED', error.message || 'Failed to update time slot');
    }
  }

  @MessagePattern('timeSlots.delete')
  async deleteTimeSlot(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Deleting time slot ${data.timeSlotId}`);

      await this.timeSlotService.delete(Number(data.timeSlotId));
      this.logger.log(`NATS: Deleted time slot ${data.timeSlotId}`);
      return successResponse({ deleted: true });
    } catch (error) {
      this.logger.error('NATS: Failed to delete time slot', error);
      return errorResponse('TIMESLOT_DELETE_FAILED', error.message || 'Failed to delete time slot');
    }
  }

  @MessagePattern('timeSlots.findByCourse')
  async findTimeSlotsByCourse(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Finding time slots for course ${data.courseId}`);

      const slots = await this.timeSlotService.findByCourse(Number(data.courseId));
      this.logger.log(`NATS: Returning ${slots.length} time slots for course ${data.courseId}`);
      return successResponse(slots.map(mapTimeSlotToResponse));
    } catch (error) {
      this.logger.error('NATS: Failed to find time slots by course', error);
      return errorResponse('TIMESLOTS_BY_COURSE_FAILED', error.message || 'Failed to find time slots by course');
    }
  }
}
