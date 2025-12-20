import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // Golf Company Management
  async getCompanies(page = 1, limit = 20, adminToken: string): Promise<any> {
    this.logger.log('Fetching golf companies');
    return this.natsClient.send('companies.list', { page, limit, token: adminToken }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getCompanyById(companyId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching company: ${companyId}`);
    return this.natsClient.send('companies.findById', { companyId, token: adminToken }, NATS_TIMEOUTS.QUICK);
  }

  async createCompany(companyData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating golf company');
    return this.natsClient.send('companies.create', { data: companyData, token: adminToken });
  }

  async updateCompany(companyId: string, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating company: ${companyId}`);
    return this.natsClient.send('companies.update', { companyId, data: updateData, token: adminToken });
  }

  async deleteCompany(companyId: string, adminToken: string): Promise<any> {
    this.logger.log(`Deleting company: ${companyId}`);
    return this.natsClient.send('companies.delete', { companyId, token: adminToken });
  }

  // Golf Course Management
  async getCourses(companyId?: string, page = 1, limit = 20, adminToken?: string): Promise<any> {
    this.logger.log('Fetching golf courses');
    const params: any = { page, limit };
    if (companyId) params.companyId = companyId;
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('courses.list', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getCourseById(courseId: string, adminToken?: string): Promise<any> {
    this.logger.log(`Fetching course: ${courseId}`);
    const params: any = { courseId };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('courses.findById', params, NATS_TIMEOUTS.QUICK);
  }

  async createCourse(courseData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating golf course');
    return this.natsClient.send('courses.create', { data: courseData, token: adminToken });
  }

  async updateCourse(courseId: string, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating course: ${courseId}`);
    return this.natsClient.send('courses.update', { courseId, data: updateData, token: adminToken });
  }

  async deleteCourse(courseId: string, adminToken: string): Promise<any> {
    this.logger.log(`Deleting course: ${courseId}`);
    return this.natsClient.send('courses.delete', { courseId, token: adminToken });
  }

  // Time Slot Management
  async getTimeSlots(courseId: string, date?: string, adminToken?: string): Promise<any>;
  async getTimeSlots(filters: any, adminToken: string): Promise<any>;
  async getTimeSlots(courseIdOrFilters: string | any, dateOrAdminToken?: string, adminToken?: string): Promise<any> {
    let params: any;
    let token: string | undefined;

    if (typeof courseIdOrFilters === 'string') {
      this.logger.log(`Fetching time slots for course: ${courseIdOrFilters}`);
      params = { courseId: courseIdOrFilters };
      if (dateOrAdminToken && adminToken) {
        params.date = dateOrAdminToken;
        token = adminToken;
      } else if (dateOrAdminToken) {
        if (dateOrAdminToken.includes('-')) {
          params.date = dateOrAdminToken;
        } else {
          token = dateOrAdminToken;
        }
      }
    } else {
      this.logger.log('Fetching time slots with filters');
      params = { ...courseIdOrFilters };
      token = dateOrAdminToken as string;
    }

    if (token) params.token = token;
    return this.natsClient.send('timeSlots.list', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  async createTimeSlot(courseId: string, timeSlotData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating time slot');
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
      // Return empty stats if service is unavailable
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

  // Weekly Schedule Management
  async getWeeklySchedule(courseId: string, adminToken?: string): Promise<any> {
    this.logger.log(`Fetching weekly schedule for course: ${courseId}`);
    const params: any = { courseId };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('courses.weeklySchedule.get', params, NATS_TIMEOUTS.QUICK);
  }

  async updateWeeklySchedule(courseId: string, scheduleData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating weekly schedule for course: ${courseId}`);
    return this.natsClient.send('courses.weeklySchedule.update', {
      courseId,
      data: scheduleData,
      token: adminToken,
    });
  }

  // Hole Management
  async getHoles(courseId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching holes for course: ${courseId}`);
    try {
      const result = await this.natsClient.send('holes.findByCourse', { courseId, token: adminToken }, NATS_TIMEOUTS.QUICK);
      return { success: true, data: result };
    } catch {
      return { success: true, data: [] };
    }
  }

  async getHoleById(courseId: string, holeId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching hole: ${holeId}`);
    return this.natsClient.send('courses.holes.findById', { courseId, holeId, token: adminToken }, NATS_TIMEOUTS.QUICK);
  }

  async createHole(courseId: string, holeData: any, adminToken: string): Promise<any> {
    this.logger.log(`Creating hole for course: ${courseId}`);
    return this.natsClient.send('courses.holes.create', { courseId, data: holeData, token: adminToken });
  }

  async updateHole(courseId: string, holeId: string, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating hole: ${holeId}`);
    return this.natsClient.send('courses.holes.update', { courseId, holeId, data: updateData, token: adminToken });
  }

  async deleteHole(courseId: string, holeId: string, adminToken: string): Promise<any> {
    this.logger.log(`Deleting hole: ${holeId}`);
    return this.natsClient.send('courses.holes.delete', { courseId, holeId, token: adminToken });
  }

  // Course Statistics
  async getCourseStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    this.logger.log('Fetching course statistics');
    return this.natsClient.send('courses.stats', { dateRange, token: adminToken }, NATS_TIMEOUTS.ANALYTICS);
  }

  // Weekly Schedule CRUD
  async getWeeklySchedules(courseId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching weekly schedules for course: ${courseId}`);
    return this.natsClient.send('courses.weeklySchedule.list', { courseId, token: adminToken }, NATS_TIMEOUTS.QUICK);
  }

  async getWeeklyScheduleById(scheduleId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching weekly schedule: ${scheduleId}`);
    return this.natsClient.send('courses.weeklySchedule.findById', { scheduleId, token: adminToken }, NATS_TIMEOUTS.QUICK);
  }

  async getWeeklyScheduleByDay(courseId: string, dayOfWeek: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching weekly schedule by day: ${dayOfWeek}`);
    return this.natsClient.send('courses.weeklySchedule.findByCourseAndDay', {
      courseId,
      dayOfWeek: Number(dayOfWeek),
      token: adminToken,
    }, NATS_TIMEOUTS.QUICK);
  }

  async createWeeklySchedule(scheduleData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating weekly schedule');
    return this.natsClient.send('courses.weeklySchedule.create', { data: scheduleData, token: adminToken });
  }

  async deleteWeeklySchedule(scheduleId: string, adminToken: string): Promise<any> {
    this.logger.log(`Deleting weekly schedule: ${scheduleId}`);
    return this.natsClient.send('courses.weeklySchedule.delete', { scheduleId, token: adminToken });
  }

  // Club Management
  async getClubs(filters: any = {}, adminToken?: string): Promise<any> {
    this.logger.log('Fetching clubs');
    const params: any = { ...filters };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('club.findAll', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getClubById(id: number, adminToken?: string): Promise<any> {
    this.logger.log(`Fetching club: ${id}`);
    const params: any = { id };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('club.findOne', params, NATS_TIMEOUTS.QUICK);
  }

  async createClub(clubData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating club');
    return this.natsClient.send('club.create', { data: clubData, token: adminToken });
  }

  async updateClub(id: number, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating club: ${id}`);
    return this.natsClient.send('club.update', { id, updateClubDto: updateData, token: adminToken });
  }

  async deleteClub(id: number, adminToken: string): Promise<any> {
    this.logger.log(`Deleting club: ${id}`);
    return this.natsClient.send('club.remove', { id, token: adminToken });
  }

  async getClubsByCompany(companyId: number, adminToken?: string): Promise<any> {
    this.logger.log(`Fetching clubs by company: ${companyId}`);
    const params: any = { companyId };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('club.findByCompany', params, NATS_TIMEOUTS.QUICK);
  }

  async searchClubs(query: string, adminToken?: string): Promise<any> {
    this.logger.log(`Searching clubs: ${query}`);
    const params: any = { query };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('club.search', params, NATS_TIMEOUTS.QUICK);
  }
}
