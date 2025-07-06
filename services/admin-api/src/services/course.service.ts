import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);
  private readonly courseServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.courseServiceUrl = this.configService.get<string>('COURSE_SERVICE_URL') || 'http://localhost:3012';
  }

  // Golf Company Management
  async getCompanies(page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.courseServiceUrl}/companies`, {
          params: { page, limit }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch golf companies', error);
      throw error;
    }
  }

  async getCompanyById(companyId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.courseServiceUrl}/api/golf-companies/${companyId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch company: ${companyId}`, error);
      throw error;
    }
  }

  async createCompany(companyData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.courseServiceUrl}/api/golf-companies`, companyData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create golf company', error);
      throw error;
    }
  }

  async updateCompany(companyId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.courseServiceUrl}/api/golf-companies/${companyId}`, updateData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update company: ${companyId}`, error);
      throw error;
    }
  }

  async deleteCompany(companyId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.courseServiceUrl}/api/golf-companies/${companyId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to delete company: ${companyId}`, error);
      throw error;
    }
  }

  // Golf Course Management
  async getCourses(companyId?: string, page = 1, limit = 20, adminToken?: string): Promise<any> {
    try {
      const params: any = { page, limit };
      if (companyId) params.companyId = companyId;

      const response = await firstValueFrom(
        this.httpService.get(`${this.courseServiceUrl}/api/golf-courses`, {
          headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
          params
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch golf courses', error);
      throw error;
    }
  }

  async getCourseById(courseId: string, adminToken?: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.courseServiceUrl}/api/golf-courses/${courseId}`, {
          headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {}
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch course: ${courseId}`, error);
      throw error;
    }
  }

  async createCourse(courseData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.courseServiceUrl}/api/golf-courses`, courseData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create golf course', error);
      throw error;
    }
  }

  async updateCourse(courseId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.courseServiceUrl}/api/golf-courses/${courseId}`, updateData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update course: ${courseId}`, error);
      throw error;
    }
  }

  async deleteCourse(courseId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.courseServiceUrl}/api/golf-courses/${courseId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to delete course: ${courseId}`, error);
      throw error;
    }
  }

  // Time Slot Management
  async getTimeSlots(courseId: string, date?: string, adminToken?: string): Promise<any> {
    try {
      const params: any = {};
      if (date) params.date = date;

      const response = await firstValueFrom(
        this.httpService.get(`${this.courseServiceUrl}/api/golf-courses/${courseId}/time-slots`, {
          headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
          params
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch time slots for course: ${courseId}`, error);
      throw error;
    }
  }

  async createTimeSlot(courseId: string, timeSlotData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.courseServiceUrl}/api/golf-courses/${courseId}/time-slots`, timeSlotData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create time slot for course: ${courseId}`, error);
      throw error;
    }
  }

  async updateTimeSlot(courseId: string, timeSlotId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.courseServiceUrl}/api/golf-courses/${courseId}/time-slots/${timeSlotId}`, updateData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update time slot: ${timeSlotId}`, error);
      throw error;
    }
  }

  async deleteTimeSlot(courseId: string, timeSlotId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.courseServiceUrl}/api/golf-courses/${courseId}/time-slots/${timeSlotId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to delete time slot: ${timeSlotId}`, error);
      throw error;
    }
  }

  // Weekly Schedule Management
  async getWeeklySchedule(courseId: string, adminToken?: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.courseServiceUrl}/api/golf-courses/${courseId}/weekly-schedule`, {
          headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {}
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch weekly schedule for course: ${courseId}`, error);
      throw error;
    }
  }

  async updateWeeklySchedule(courseId: string, scheduleData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.courseServiceUrl}/api/golf-courses/${courseId}/weekly-schedule`, scheduleData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update weekly schedule for course: ${courseId}`, error);
      throw error;
    }
  }
}