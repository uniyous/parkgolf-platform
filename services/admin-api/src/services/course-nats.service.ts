import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class CourseNatsService {
  private readonly logger = new Logger(CourseNatsService.name);

  constructor(
    @Inject('COURSE_SERVICE') private readonly courseClient: ClientProxy,
  ) {}

  // Golf Company Management
  async getCompanies(page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      this.logger.log('Fetching golf companies via NATS');
      
      const result = await firstValueFrom(
        this.courseClient.send('companies.list', { page, limit, token: adminToken }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch golf companies', error);
      throw error;
    }
  }

  async getCompanyById(companyId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching company via NATS: ${companyId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('companies.findById', { companyId, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch company: ${companyId}`, error);
      throw error;
    }
  }

  async createCompany(companyData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log('Creating golf company via NATS');
      
      const result = await firstValueFrom(
        this.courseClient.send('companies.create', { data: companyData, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to create golf company', error);
      throw error;
    }
  }

  async updateCompany(companyId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Updating company via NATS: ${companyId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('companies.update', { companyId, data: updateData, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update company: ${companyId}`, error);
      throw error;
    }
  }

  async deleteCompany(companyId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Deleting company via NATS: ${companyId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('companies.delete', { companyId, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete company: ${companyId}`, error);
      throw error;
    }
  }

  // Golf Course Management
  async getCourses(companyId?: string, page = 1, limit = 20, adminToken?: string): Promise<any> {
    try {
      this.logger.log('Fetching golf courses via NATS');
      
      const params: any = { page, limit };
      if (companyId) params.companyId = companyId;
      if (adminToken) params.token = adminToken;

      const result = await firstValueFrom(
        this.courseClient.send('courses.list', params).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch golf courses', error);
      throw error;
    }
  }

  async getCourseById(courseId: string, adminToken?: string): Promise<any> {
    try {
      this.logger.log(`Fetching course via NATS: ${courseId}`);
      
      const params: any = { courseId };
      if (adminToken) params.token = adminToken;

      const result = await firstValueFrom(
        this.courseClient.send('courses.findById', params).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch course: ${courseId}`, error);
      throw error;
    }
  }

  async createCourse(courseData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log('Creating golf course via NATS');
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.create', { data: courseData, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to create golf course', error);
      throw error;
    }
  }

  async updateCourse(courseId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Updating course via NATS: ${courseId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.update', { courseId, data: updateData, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update course: ${courseId}`, error);
      throw error;
    }
  }

  async deleteCourse(courseId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Deleting course via NATS: ${courseId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.delete', { courseId, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete course: ${courseId}`, error);
      throw error;
    }
  }

  // Time Slot Management
  async getTimeSlots(courseId: string, date?: string, adminToken?: string): Promise<any>;
  async getTimeSlots(filters: any, adminToken: string): Promise<any>;
  async getTimeSlots(courseIdOrFilters: string | any, dateOrAdminToken?: string, adminToken?: string): Promise<any> {
    try {
      // Handle different overloads
      let params: any;
      let token: string;
      
      if (typeof courseIdOrFilters === 'string') {
        // First overload: getTimeSlots(courseId, date?, adminToken?)
        this.logger.log(`Fetching time slots via NATS for course: ${courseIdOrFilters}`);
        params = { courseId: courseIdOrFilters };
        if (dateOrAdminToken && typeof dateOrAdminToken === 'string' && !adminToken) {
          // Assume dateOrAdminToken is date if adminToken is not provided
          params.date = dateOrAdminToken;
        } else if (dateOrAdminToken && adminToken) {
          // Both date and adminToken provided
          params.date = dateOrAdminToken;
          token = adminToken;
        } else if (dateOrAdminToken && !adminToken) {
          // Could be either date or adminToken
          if (dateOrAdminToken.includes('-')) {
            params.date = dateOrAdminToken;
          } else {
            token = dateOrAdminToken;
          }
        }
      } else {
        // Second overload: getTimeSlots(filters, adminToken)
        this.logger.log('Fetching time slots with filters via NATS:', courseIdOrFilters);
        params = { ...courseIdOrFilters };
        token = dateOrAdminToken as string;
      }

      if (token) params.token = token;

      const result = await firstValueFrom(
        this.courseClient.send('timeSlots.list', params).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch time slots', error);
      throw error;
    }
  }

  async createTimeSlot(courseId: string, timeSlotData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log('Creating time slot via NATS with 9-hole support');
      
      const result = await firstValueFrom(
        this.courseClient.send('timeSlots.create', { 
          courseId,
          data: timeSlotData, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to create time slot', error);
      throw error;
    }
  }


  async updateTimeSlot(courseId: string, timeSlotId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Updating time slot via NATS: ${timeSlotId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('timeSlots.update', { 
          courseId,
          timeSlotId: Number(timeSlotId), 
          data: updateData, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update time slot: ${timeSlotId}`, error);
      throw error;
    }
  }

  async deleteTimeSlot(courseId: string, timeSlotId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Deleting time slot via NATS: ${timeSlotId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('timeSlots.delete', { 
          courseId,
          timeSlotId: Number(timeSlotId), 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete time slot: ${timeSlotId}`, error);
      throw error;
    }
  }

  async getTimeSlotStats(params: any, adminToken?: string): Promise<any> {
    try {
      this.logger.log('Fetching time slot statistics via NATS');
      
      const requestParams: any = { ...params };
      if (adminToken) requestParams.token = adminToken;

      const result = await firstValueFrom(
        this.courseClient.send('timeSlots.stats', requestParams).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch time slot statistics', error);
      
      // Return mock data if service is unavailable
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
    try {
      this.logger.log(`Fetching weekly schedule via NATS for course: ${courseId}`);
      
      const params: any = { courseId };
      if (adminToken) params.token = adminToken;

      const result = await firstValueFrom(
        this.courseClient.send('courses.weeklySchedule.get', params).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch weekly schedule for course: ${courseId}`, error);
      throw error;
    }
  }

  async updateWeeklySchedule(courseId: string, scheduleData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Updating weekly schedule via NATS for course: ${courseId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.weeklySchedule.update', { 
          courseId, 
          data: scheduleData, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update weekly schedule for course: ${courseId}`, error);
      throw error;
    }
  }

  // Hole Management
  async getHoles(courseId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching holes via NATS for course: ${courseId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('holes.findByCourse', { courseId, token: adminToken }).pipe(timeout(5000))
      );
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error(`Failed to fetch holes for course: ${courseId}`, error);
      
      // 에러 시 빈 배열 반환
      return {
        success: true,
        data: []
      };
    }
  }

  async getHoleById(courseId: string, holeId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching hole via NATS: ${holeId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.holes.findById', { courseId, holeId, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch hole: ${holeId}`, error);
      throw error;
    }
  }

  async createHole(courseId: string, holeData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Creating hole via NATS for course: ${courseId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.holes.create', { courseId, data: holeData, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to create hole for course: ${courseId}`, error);
      throw error;
    }
  }

  async updateHole(courseId: string, holeId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Updating hole via NATS: ${holeId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.holes.update', { courseId, holeId, data: updateData, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update hole: ${holeId}`, error);
      throw error;
    }
  }

  async deleteHole(courseId: string, holeId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Deleting hole via NATS: ${holeId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.holes.delete', { courseId, holeId, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete hole: ${holeId}`, error);
      throw error;
    }
  }


  // Course Statistics
  async getCourseStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    try {
      this.logger.log('Fetching course statistics via NATS');
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.stats', { dateRange, token: adminToken }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch course statistics', error);
      throw error;
    }
  }

  // Weekly Schedule Management
  async getWeeklySchedules(courseId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching weekly schedules for course via NATS: ${courseId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.weeklySchedule.list', { courseId, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch weekly schedules for course: ${courseId}`, error);
      throw error;
    }
  }

  async getWeeklyScheduleById(scheduleId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching weekly schedule via NATS: ${scheduleId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.weeklySchedule.findById', { scheduleId, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch weekly schedule: ${scheduleId}`, error);
      throw error;
    }
  }

  async getWeeklyScheduleByDay(courseId: string, dayOfWeek: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching weekly schedule by day via NATS: ${courseId}, day: ${dayOfWeek}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.weeklySchedule.findByCourseAndDay', { 
          courseId, 
          dayOfWeek: Number(dayOfWeek), 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch weekly schedule by day: ${dayOfWeek}`, error);
      throw error;
    }
  }

  async createWeeklySchedule(scheduleData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log('Creating weekly schedule via NATS');
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.weeklySchedule.create', { data: scheduleData, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to create weekly schedule', error);
      throw error;
    }
  }


  async deleteWeeklySchedule(scheduleId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Deleting weekly schedule via NATS: ${scheduleId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.weeklySchedule.delete', { scheduleId, token: adminToken }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete weekly schedule: ${scheduleId}`, error);
      throw error;
    }
  }

  onModuleInit() {
    this.courseClient.connect();
  }

  onModuleDestroy() {
    this.courseClient.close();
  }
}