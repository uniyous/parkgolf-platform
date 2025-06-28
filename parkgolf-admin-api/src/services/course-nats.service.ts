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
  async getTimeSlots(courseId: string, date?: string, adminToken?: string): Promise<any> {
    try {
      this.logger.log(`Fetching time slots via NATS for course: ${courseId}`);
      
      const params: any = { courseId };
      if (date) params.date = date;
      if (adminToken) params.token = adminToken;

      const result = await firstValueFrom(
        this.courseClient.send('courses.timeSlots.list', params).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch time slots for course: ${courseId}`, error);
      throw error;
    }
  }

  async createTimeSlot(courseId: string, timeSlotData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Creating time slot via NATS for course: ${courseId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.timeSlots.create', { 
          courseId, 
          data: timeSlotData, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to create time slot for course: ${courseId}`, error);
      throw error;
    }
  }

  async updateTimeSlot(courseId: string, timeSlotId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Updating time slot via NATS: ${timeSlotId}`);
      
      const result = await firstValueFrom(
        this.courseClient.send('courses.timeSlots.update', { 
          courseId, 
          timeSlotId, 
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
        this.courseClient.send('courses.timeSlots.delete', { 
          courseId, 
          timeSlotId, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete time slot: ${timeSlotId}`, error);
      throw error;
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

  onModuleInit() {
    this.courseClient.connect();
  }

  onModuleDestroy() {
    this.courseClient.close();
  }
}