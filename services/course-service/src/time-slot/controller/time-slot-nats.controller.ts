import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TimeSlotService } from '../service/time-slot.service';
import { TimeSlotFilterDto } from '../dto/time-slot.dto';

@Controller()
export class TimeSlotNatsController {
  private readonly logger = new Logger(TimeSlotNatsController.name);

  constructor(
    private readonly timeSlotService: TimeSlotService,
  ) {}

  // Time Slot NATS Message Handlers
  @MessagePattern('timeSlots.list')
  async getTimeSlots(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting time slots for course ${data.courseId}`);
      
      const { courseId, page = 1, limit = 20, sortBy = 'date', sortOrder = 'asc', ...filters } = data;
      
      const filterDto: TimeSlotFilterDto = {
        page: Number(page),
        limit: Number(limit),
        sortBy,
        sortOrder,
        ...filters
      };

      const slots = await this.timeSlotService.findWithFilters(Number(courseId), filterDto);
      
      const result = {
        timeSlots: slots.map(slot => ({
          id: slot.id,
          courseId: slot.firstCourseId,
          courseName: `코스 ${slot.firstCourseId}`, // Since course relation might not be loaded
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxSlots: slot.availableSlots,
          bookedSlots: slot.bookedCount || 0,
          availableSlots: slot.availableSlots,
          price: Number(slot.eighteenHolePrice),
          status: slot.status === 'ACTIVE' ? 'AVAILABLE' : 'INACTIVE',
          isRecurring: false, // Not tracked yet in database
          createdAt: slot.createdAt.toISOString(),
          updatedAt: slot.updatedAt.toISOString(),
          revenue: 0, // No bookings tracked yet
          utilizationRate: 0 // No bookings tracked yet
        })),
        totalCount: slots.length,
        totalPages: Math.ceil(slots.length / limit),
        page: Number(page)
      };

      this.logger.log(`NATS: Returning ${result.timeSlots.length} time slots`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to get time slots', error);
      throw error;
    }
  }

  @MessagePattern('timeSlots.stats')
  async getTimeSlotStats(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting time slot stats for course ${data.courseId || 'all'}`);
      
      // For now, return mock stats since we don't have aggregation logic yet
      const stats = {
        totalSlots: 150,
        activeSlots: 120,
        fullyBookedSlots: 45,
        cancelledSlots: 30,
        totalRevenue: 4500000,
        averageUtilization: 78,
        totalBookings: 234,
        averagePrice: 75000,
        peakHours: ['09:00', '10:00', '14:00', '15:00'],
        topCourses: [
          { courseId: 1, courseName: '메인 코스', totalSlots: 80, revenue: 2400000, utilizationRate: 85 },
          { courseId: 2, courseName: '서브 코스', totalSlots: 70, revenue: 2100000, utilizationRate: 72 },
        ],
      };

      this.logger.log('NATS: Returning time slot statistics');
      return stats;
    } catch (error) {
      this.logger.error('NATS: Failed to get time slot stats', error);
      throw error;
    }
  }

  @MessagePattern('timeSlots.create')
  async createTimeSlot(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Creating time slot`);
      
      const slot = await this.timeSlotService.create(data.data);
      
      const result = {
        id: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        roundType: slot.roundType,
        firstCourseId: slot.firstCourseId,
        secondCourseId: slot.secondCourseId,
        bookedCount: slot.bookedCount || 0,
        availableSlots: slot.availableSlots,
        nineHolePrice: slot.nineHolePrice ? Number(slot.nineHolePrice) : null,
        eighteenHolePrice: Number(slot.eighteenHolePrice),
        status: slot.status,
        notes: slot.notes,
        createdAt: slot.createdAt.toISOString(),
        updatedAt: slot.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Created time slot with ID ${slot.id}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to create time slot', error);
      throw error;
    }
  }

  @MessagePattern('timeSlots.update')
  async updateTimeSlot(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Updating time slot ${data.timeSlotId}`);
      
      const slot = await this.timeSlotService.update(
        Number(data.timeSlotId), 
        data.data
      );
      
      const result = {
        id: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        roundType: slot.roundType,
        firstCourseId: slot.firstCourseId,
        secondCourseId: slot.secondCourseId,
        bookedCount: slot.bookedCount || 0,
        availableSlots: slot.availableSlots,
        nineHolePrice: slot.nineHolePrice ? Number(slot.nineHolePrice) : null,
        eighteenHolePrice: Number(slot.eighteenHolePrice),
        status: slot.status,
        notes: slot.notes,
        createdAt: slot.createdAt.toISOString(),
        updatedAt: slot.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Updated time slot ${slot.id}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to update time slot', error);
      throw error;
    }
  }

  @MessagePattern('timeSlots.delete')
  async deleteTimeSlot(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Deleting time slot ${data.timeSlotId}`);
      
      await this.timeSlotService.delete(Number(data.timeSlotId));
      
      this.logger.log(`NATS: Deleted time slot ${data.timeSlotId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('NATS: Failed to delete time slot', error);
      throw error;
    }
  }

  @MessagePattern('timeSlots.findByCourse')
  async findTimeSlotsByCourse(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Finding time slots for course ${data.courseId}`);
      
      const slots = await this.timeSlotService.findByCourse(Number(data.courseId));
      
      const result = slots.map(slot => ({
        id: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        roundType: slot.roundType,
        firstCourseId: slot.firstCourseId,
        secondCourseId: slot.secondCourseId,
        bookedCount: slot.bookedCount || 0,
        availableSlots: slot.availableSlots,
        nineHolePrice: slot.nineHolePrice ? Number(slot.nineHolePrice) : null,
        eighteenHolePrice: Number(slot.eighteenHolePrice),
        status: slot.status,
        notes: slot.notes,
        createdAt: slot.createdAt.toISOString(),
        updatedAt: slot.updatedAt.toISOString()
      }));

      this.logger.log(`NATS: Returning ${result.length} time slots for course ${data.courseId}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to find time slots by course', error);
      throw error;
    }
  }
}