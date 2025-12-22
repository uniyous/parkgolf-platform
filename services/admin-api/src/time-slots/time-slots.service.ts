import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

@Injectable()
export class TimeSlotsService {
  private readonly logger = new Logger(TimeSlotsService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async getTimeSlots(filters: any, adminToken?: string): Promise<any> {
    this.logger.log('Fetching time slots with filters');
    const params: any = { ...filters };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('timeSlots.list', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getTimeSlotById(timeSlotId: string, adminToken?: string): Promise<any> {
    this.logger.log(`Fetching time slot: ${timeSlotId}`);
    const params: any = { timeSlotId: Number(timeSlotId) };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('timeSlots.findById', params, NATS_TIMEOUTS.QUICK);
  }

  async createTimeSlot(courseId: string, timeSlotData: any, adminToken: string): Promise<any> {
    this.logger.log(`Creating time slot for course: ${courseId}`);
    return this.natsClient.send('timeSlots.create', {
      courseId,
      data: timeSlotData,
      token: adminToken,
    });
  }

  async updateTimeSlot(courseId: string, timeSlotId: string, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating time slot: ${timeSlotId}`);
    return this.natsClient.send('timeSlots.update', {
      courseId,
      timeSlotId: Number(timeSlotId),
      data: updateData,
      token: adminToken,
    });
  }

  async deleteTimeSlot(courseId: string, timeSlotId: string, adminToken: string): Promise<any> {
    this.logger.log(`Deleting time slot: ${timeSlotId}`);
    return this.natsClient.send('timeSlots.delete', {
      courseId,
      timeSlotId: Number(timeSlotId),
      token: adminToken,
    });
  }

  async getTimeSlotStats(params: any, adminToken?: string): Promise<any> {
    this.logger.log('Fetching time slot statistics');
    const requestParams: any = { ...params };
    if (adminToken) requestParams.token = adminToken;

    try {
      return await this.natsClient.send('timeSlots.stats', requestParams, NATS_TIMEOUTS.ANALYTICS);
    } catch {
      return {
        totalSlots: 0,
        activeSlots: 0,
        fullyBookedSlots: 0,
        cancelledSlots: 0,
        totalRevenue: 0,
        averageUtilization: 0,
        totalBookings: 0,
        averagePrice: 0,
        peakHours: [],
        topCourses: [],
      };
    }
  }

  async bulkCreateTimeSlots(courseId: string, timeSlots: any[], adminToken: string): Promise<any[]> {
    this.logger.log(`Creating bulk time slots for course: ${courseId}`);
    const results = [];
    for (const timeSlotData of timeSlots) {
      try {
        const result = await this.createTimeSlot(courseId, timeSlotData, adminToken);
        results.push(result);
      } catch (error) {
        this.logger.warn(`Failed to create time slot:`, error);
      }
    }
    return results;
  }
}
