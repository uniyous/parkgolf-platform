import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // ============================================
  // Club Management
  // ============================================
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

  // ============================================
  // Course Management
  // ============================================
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

  async getCourseStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    this.logger.log('Fetching course statistics');
    return this.natsClient.send('courses.stats', { dateRange, token: adminToken }, NATS_TIMEOUTS.ANALYTICS);
  }

  // ============================================
  // Hole Management
  // ============================================
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
    return this.natsClient.send('holes.findById', { courseId, holeId, token: adminToken }, NATS_TIMEOUTS.QUICK);
  }

  async createHole(courseId: string, holeData: any, adminToken: string): Promise<any> {
    this.logger.log(`Creating hole for course: ${courseId}`);
    return this.natsClient.send('holes.create', { courseId, data: holeData, token: adminToken });
  }

  async updateHole(courseId: string, holeId: string, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating hole: ${holeId}`);
    return this.natsClient.send('holes.update', { courseId, holeId, data: updateData, token: adminToken });
  }

  async deleteHole(courseId: string, holeId: string, adminToken: string): Promise<any> {
    this.logger.log(`Deleting hole: ${holeId}`);
    return this.natsClient.send('holes.delete', { courseId, holeId, token: adminToken });
  }

  // ============================================
  // Weekly Schedule Management
  // ============================================
  async getWeeklySchedule(courseId: string, adminToken?: string): Promise<any> {
    this.logger.log(`Fetching weekly schedule for course: ${courseId}`);
    const params: any = { courseId };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('courses.weeklySchedule.get', params, NATS_TIMEOUTS.QUICK);
  }

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

  async updateWeeklySchedule(courseId: string, scheduleData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating weekly schedule for course: ${courseId}`);
    return this.natsClient.send('courses.weeklySchedule.update', {
      courseId,
      data: scheduleData,
      token: adminToken,
    });
  }

  async deleteWeeklySchedule(scheduleId: string, adminToken: string): Promise<any> {
    this.logger.log(`Deleting weekly schedule: ${scheduleId}`);
    return this.natsClient.send('courses.weeklySchedule.delete', { scheduleId, token: adminToken });
  }
}
