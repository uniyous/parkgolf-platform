import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CourseService } from '../service/course.service';
import { CourseWeeklyScheduleService } from '../service/course-weekly-schedule.service';
import { CreateCourseWeeklyScheduleDto, UpdateCourseWeeklyScheduleDto } from '../dto/course-weekly-schedule.dto';

@Controller()
export class CourseNatsController {
  private readonly logger = new Logger(CourseNatsController.name);

  constructor(
    private readonly courseService: CourseService,
    private readonly weeklyScheduleService: CourseWeeklyScheduleService,
  ) {}

  // Course NATS Message Handlers
  @MessagePattern('courses.list')
  async getCourses(@Payload() data: any) {
    try {
      const { companyId, page = 1, limit = 20 } = data;
      this.logger.log(`NATS: Getting courses list - companyId: ${companyId}, page: ${page}, limit: ${limit}`);
      
      // Build query filters
      const query: any = { 
        page: Number(page), 
        limit: Number(limit) 
      };
      
      if (companyId) {
        query.companyId = Number(companyId);
        this.logger.log(`NATS: Filtering by companyId: ${query.companyId}`);
      }
      
      // Use actual database query
      const result = await this.courseService.findAll(query);
      
      const courses = result.data.map((course: any) => ({
        id: course.id,
        name: course.name,
        code: course.code,
        subtitle: course.subtitle,
        description: course.description,
        companyId: course.companyId,
        clubId: course.clubId,
        holeCount: course.holeCount,
        par: course.par,
        totalDistance: course.totalDistance,
        difficulty: course.difficulty,
        scenicRating: course.scenicRating,
        courseRating: course.courseRating,
        slopeRating: course.slopeRating,
        imageUrl: course.imageUrl,
        status: course.status,
        isActive: course.isActive,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
      }));

      const responseData = {
        courses,
        totalCount: result.total,
        totalPages: Math.ceil(result.total / result.limit),
        page: result.page
      };

      this.logger.log(`NATS: Returning ${courses.length} courses from database query`);
      return responseData;
    } catch (error) {
      this.logger.error('NATS: Failed to get courses', error);
      throw error;
    }
  }

  @MessagePattern('courses.findById')
  async getCourseById(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting course ${data.courseId}`);
      
      const course = await this.courseService.findOne(Number(data.courseId));
      
      const result = {
        id: course.id,
        name: course.name,
        code: course.code,
        subtitle: course.subtitle,
        description: course.description,
        companyId: course.companyId,
        clubId: course.clubId,
        holeCount: course.holeCount,
        par: course.par,
        totalDistance: course.totalDistance,
        difficulty: course.difficulty,
        scenicRating: course.scenicRating,
        courseRating: course.courseRating,
        slopeRating: course.slopeRating,
        imageUrl: course.imageUrl,
        status: course.status,
        isActive: course.isActive,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Returning course ${course.id}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to get course', error);
      throw error;
    }
  }

  @MessagePattern('courses.create')
  async createCourse(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Creating course`);
      
      const course = await this.courseService.create(data.data);
      
      const result = {
        id: course.id,
        name: course.name,
        code: course.code,
        subtitle: course.subtitle,
        description: course.description,
        companyId: course.companyId,
        clubId: course.clubId,
        holeCount: course.holeCount,
        par: course.par,
        totalDistance: course.totalDistance,
        difficulty: course.difficulty,
        scenicRating: course.scenicRating,
        courseRating: course.courseRating,
        slopeRating: course.slopeRating,
        imageUrl: course.imageUrl,
        status: course.status,
        isActive: course.isActive,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Created course with ID ${course.id}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to create course', error);
      throw error;
    }
  }

  @MessagePattern('courses.update')
  async updateCourse(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Updating course ${data.courseId}`);
      
      const course = await this.courseService.update(Number(data.courseId), data.data);
      
      const result = {
        id: course.id,
        name: course.name,
        code: course.code,
        subtitle: course.subtitle,
        description: course.description,
        companyId: course.companyId,
        clubId: course.clubId,
        holeCount: course.holeCount,
        par: course.par,
        totalDistance: course.totalDistance,
        difficulty: course.difficulty,
        scenicRating: course.scenicRating,
        courseRating: course.courseRating,
        slopeRating: course.slopeRating,
        imageUrl: course.imageUrl,
        status: course.status,
        isActive: course.isActive,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Updated course ${course.id}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to update course', error);
      throw error;
    }
  }

  @MessagePattern('courses.delete')
  async deleteCourse(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Deleting course ${data.courseId}`);
      
      await this.courseService.remove(Number(data.courseId));
      
      this.logger.log(`NATS: Deleted course ${data.courseId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('NATS: Failed to delete course', error);
      throw error;
    }
  }

  // Weekly Schedule NATS Message Handlers
  @MessagePattern('courses.weeklySchedule.list')
  async getWeeklySchedules(@Payload() data: any) {
    try {
      const { courseId } = data;
      this.logger.log(`NATS: Getting weekly schedules for course ${courseId}`);
      
      const schedules = await this.weeklyScheduleService.findAllByCourseId(Number(courseId));
      
      const result = schedules.map(schedule => ({
        id: schedule.id,
        courseId: schedule.courseId,
        dayOfWeek: schedule.dayOfWeek,
        openTime: schedule.openTime,
        closeTime: schedule.closeTime,
        isActive: schedule.isActive,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString()
      }));

      this.logger.log(`NATS: Returning ${result.length} weekly schedules for course ${courseId}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to get weekly schedules', error);
      throw error;
    }
  }

  @MessagePattern('courses.weeklySchedule.findById')
  async getWeeklyScheduleById(@Payload() data: any) {
    try {
      const { scheduleId } = data;
      this.logger.log(`NATS: Getting weekly schedule ${scheduleId}`);
      
      const schedule = await this.weeklyScheduleService.findOne(Number(scheduleId));
      
      const result = {
        id: schedule.id,
        courseId: schedule.courseId,
        dayOfWeek: schedule.dayOfWeek,
        openTime: schedule.openTime,
        closeTime: schedule.closeTime,
        isActive: schedule.isActive,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Returning weekly schedule ${scheduleId}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to get weekly schedule', error);
      throw error;
    }
  }

  @MessagePattern('courses.weeklySchedule.findByCourseAndDay')
  async getWeeklyScheduleByCourseAndDay(@Payload() data: any) {
    try {
      const { courseId, dayOfWeek } = data;
      this.logger.log(`NATS: Getting weekly schedule for course ${courseId}, day ${dayOfWeek}`);
      
      const schedule = await this.weeklyScheduleService.findByCourseAndDay(Number(courseId), Number(dayOfWeek));
      
      const result = {
        id: schedule.id,
        courseId: schedule.courseId,
        dayOfWeek: schedule.dayOfWeek,
        openTime: schedule.openTime,
        closeTime: schedule.closeTime,
        isActive: schedule.isActive,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Returning weekly schedule for course ${courseId}, day ${dayOfWeek}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to get weekly schedule by course and day', error);
      throw error;
    }
  }

  @MessagePattern('courses.weeklySchedule.create')
  async createWeeklySchedule(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Creating weekly schedule`);
      
      const createDto: CreateCourseWeeklyScheduleDto = {
        courseId: data.data.courseId,
        dayOfWeek: data.data.dayOfWeek,
        openTime: data.data.openTime,
        closeTime: data.data.closeTime,
        isActive: data.data.isActive
      };

      const schedule = await this.weeklyScheduleService.create(createDto);
      
      const result = {
        id: schedule.id,
        courseId: schedule.courseId,
        dayOfWeek: schedule.dayOfWeek,
        openTime: schedule.openTime,
        closeTime: schedule.closeTime,
        isActive: schedule.isActive,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Created weekly schedule with ID ${schedule.id}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to create weekly schedule', error);
      throw error;
    }
  }

  @MessagePattern('courses.weeklySchedule.update')
  async updateWeeklySchedule(@Payload() data: any) {
    try {
      const { scheduleId, data: updateData } = data;
      this.logger.log(`NATS: Updating weekly schedule ${scheduleId}`);
      
      const updateDto: UpdateCourseWeeklyScheduleDto = {
        openTime: updateData.openTime,
        closeTime: updateData.closeTime,
        isActive: updateData.isActive
      };

      const schedule = await this.weeklyScheduleService.update(Number(scheduleId), updateDto);
      
      const result = {
        id: schedule.id,
        courseId: schedule.courseId,
        dayOfWeek: schedule.dayOfWeek,
        openTime: schedule.openTime,
        closeTime: schedule.closeTime,
        isActive: schedule.isActive,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Updated weekly schedule ${scheduleId}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to update weekly schedule', error);
      throw error;
    }
  }

  @MessagePattern('courses.weeklySchedule.delete')
  async deleteWeeklySchedule(@Payload() data: any) {
    try {
      const { scheduleId } = data;
      this.logger.log(`NATS: Deleting weekly schedule ${scheduleId}`);
      
      await this.weeklyScheduleService.remove(Number(scheduleId));
      
      this.logger.log(`NATS: Deleted weekly schedule ${scheduleId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('NATS: Failed to delete weekly schedule', error);
      throw error;
    }
  }
}