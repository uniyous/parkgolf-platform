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

  // Hole Management
  async getHoles(courseId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching holes via NATS for course: ${courseId}`);
      
      // 임시로 샘플 데이터 반환 (course service가 구현되지 않음)
      if (courseId === '5') {
        // 그린밸리 동코스 9홀 데이터
        const sampleHoles = [
          { id: 1, holeNumber: 1, par: 3, distance: 120, description: "그린밸리 동코스 1번 홀 (Par 3, 120m)", courseId: parseInt(courseId) },
          { id: 2, holeNumber: 2, par: 4, distance: 150, description: "그린밸리 동코스 2번 홀 (Par 4, 150m)", courseId: parseInt(courseId) },
          { id: 3, holeNumber: 3, par: 5, distance: 180, description: "그린밸리 동코스 3번 홀 (Par 5, 180m)", courseId: parseInt(courseId) },
          { id: 4, holeNumber: 4, par: 3, distance: 120, description: "그린밸리 동코스 4번 홀 (Par 3, 120m)", courseId: parseInt(courseId) },
          { id: 5, holeNumber: 5, par: 4, distance: 150, description: "그린밸리 동코스 5번 홀 (Par 4, 150m)", courseId: parseInt(courseId) },
          { id: 6, holeNumber: 6, par: 5, distance: 180, description: "그린밸리 동코스 6번 홀 (Par 5, 180m)", courseId: parseInt(courseId) },
          { id: 7, holeNumber: 7, par: 3, distance: 120, description: "그린밸리 동코스 7번 홀 (Par 3, 120m)", courseId: parseInt(courseId) },
          { id: 8, holeNumber: 8, par: 4, distance: 150, description: "그린밸리 동코스 8번 홀 (Par 4, 150m)", courseId: parseInt(courseId) },
          { id: 9, holeNumber: 9, par: 5, distance: 180, description: "그린밸리 동코스 9번 홀 (Par 5, 180m)", courseId: parseInt(courseId) }
        ];
        
        return {
          success: true,
          data: sampleHoles
        };
      }
      
      // 다른 코스는 빈 배열 반환
      return {
        success: true,
        data: []
      };
    } catch (error) {
      this.logger.error(`Failed to fetch holes for course: ${courseId}`, error);
      throw error;
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

  onModuleInit() {
    this.courseClient.connect();
  }

  onModuleDestroy() {
    this.courseClient.close();
  }
}