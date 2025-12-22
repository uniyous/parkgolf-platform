import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CourseService } from '../service/course.service';
import { CourseWeeklyScheduleService } from '../service/course-weekly-schedule.service';
import { CreateCourseWeeklyScheduleDto, UpdateCourseWeeklyScheduleDto } from '../dto/course-weekly-schedule.dto';
import {
  successResponse,
  errorResponse,
  paginationMeta,
  mapCourseToResponse,
  mapWeeklyScheduleToResponse,
} from '../../common/utils/response.util';

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
        limit: Number(limit),
      };

      if (companyId) {
        query.companyId = Number(companyId);
        this.logger.debug(`NATS: Filtering by companyId: ${query.companyId}`);
      }

      // Use actual database query
      const result = await this.courseService.findAll(query);
      const courses = result.data.map(mapCourseToResponse);

      this.logger.log(`NATS: Returning ${courses.length} courses from database query`);
      return successResponse({ courses }, paginationMeta(result.total, result.page, result.limit));
    } catch (error) {
      this.logger.error('NATS: Failed to get courses', error);
      return errorResponse('COURSES_LIST_FAILED', error.message || 'Failed to get courses');
    }
  }

  @MessagePattern('courses.findById')
  async getCourseById(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting course ${data.courseId}`);
      const course = await this.courseService.findOne(Number(data.courseId));
      this.logger.log(`NATS: Returning course ${course.id}`);
      return successResponse(mapCourseToResponse(course));
    } catch (error) {
      this.logger.error('NATS: Failed to get course', error);
      return errorResponse('COURSE_NOT_FOUND', error.message || 'Course not found');
    }
  }

  @MessagePattern('courses.create')
  async createCourse(@Payload() data: any) {
    try {
      this.logger.log('NATS: Creating course');
      const course = await this.courseService.create(data.data);
      this.logger.log(`NATS: Created course with ID ${course.id}`);
      return successResponse(mapCourseToResponse(course));
    } catch (error) {
      this.logger.error('NATS: Failed to create course', error);
      return errorResponse('COURSE_CREATE_FAILED', error.message || 'Failed to create course');
    }
  }

  @MessagePattern('courses.update')
  async updateCourse(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Updating course ${data.courseId}`);
      const course = await this.courseService.update(Number(data.courseId), data.data);
      this.logger.log(`NATS: Updated course ${course.id}`);
      return successResponse(mapCourseToResponse(course));
    } catch (error) {
      this.logger.error('NATS: Failed to update course', error);
      return errorResponse('COURSE_UPDATE_FAILED', error.message || 'Failed to update course');
    }
  }

  @MessagePattern('courses.delete')
  async deleteCourse(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Deleting course ${data.courseId}`);
      await this.courseService.remove(Number(data.courseId));
      this.logger.log(`NATS: Deleted course ${data.courseId}`);
      return successResponse({ deleted: true });
    } catch (error) {
      this.logger.error('NATS: Failed to delete course', error);
      return errorResponse('COURSE_DELETE_FAILED', error.message || 'Failed to delete course');
    }
  }

  // Weekly Schedule NATS Message Handlers
  @MessagePattern('courses.weeklySchedule.list')
  async getWeeklySchedules(@Payload() data: any) {
    try {
      const { courseId } = data;
      this.logger.log(`NATS: Getting weekly schedules for course ${courseId}`);
      const schedules = await this.weeklyScheduleService.findAllByCourseId(Number(courseId));
      const result = schedules.map(mapWeeklyScheduleToResponse);
      this.logger.log(`NATS: Returning ${result.length} weekly schedules for course ${courseId}`);
      return successResponse(result);
    } catch (error) {
      this.logger.error('NATS: Failed to get weekly schedules', error);
      return errorResponse('WEEKLY_SCHEDULE_LIST_FAILED', error.message || 'Failed to get weekly schedules');
    }
  }

  @MessagePattern('courses.weeklySchedule.findById')
  async getWeeklyScheduleById(@Payload() data: any) {
    try {
      const { scheduleId } = data;
      this.logger.log(`NATS: Getting weekly schedule ${scheduleId}`);
      const schedule = await this.weeklyScheduleService.findOne(Number(scheduleId));
      this.logger.log(`NATS: Returning weekly schedule ${scheduleId}`);
      return successResponse(mapWeeklyScheduleToResponse(schedule));
    } catch (error) {
      this.logger.error('NATS: Failed to get weekly schedule', error);
      return errorResponse('WEEKLY_SCHEDULE_NOT_FOUND', error.message || 'Weekly schedule not found');
    }
  }

  @MessagePattern('courses.weeklySchedule.findByCourseAndDay')
  async getWeeklyScheduleByCourseAndDay(@Payload() data: any) {
    try {
      const { courseId, dayOfWeek } = data;
      this.logger.log(`NATS: Getting weekly schedule for course ${courseId}, day ${dayOfWeek}`);
      const schedule = await this.weeklyScheduleService.findByCourseAndDay(Number(courseId), Number(dayOfWeek));
      this.logger.log(`NATS: Returning weekly schedule for course ${courseId}, day ${dayOfWeek}`);
      return successResponse(mapWeeklyScheduleToResponse(schedule));
    } catch (error) {
      this.logger.error('NATS: Failed to get weekly schedule by course and day', error);
      return errorResponse('WEEKLY_SCHEDULE_NOT_FOUND', error.message || 'Weekly schedule not found');
    }
  }

  @MessagePattern('courses.weeklySchedule.create')
  async createWeeklySchedule(@Payload() data: any) {
    try {
      this.logger.log('NATS: Creating weekly schedule');

      const createDto: CreateCourseWeeklyScheduleDto = {
        courseId: data.data.courseId,
        dayOfWeek: data.data.dayOfWeek,
        openTime: data.data.openTime,
        closeTime: data.data.closeTime,
        isActive: data.data.isActive,
      };

      const schedule = await this.weeklyScheduleService.create(createDto);
      this.logger.log(`NATS: Created weekly schedule with ID ${schedule.id}`);
      return successResponse(mapWeeklyScheduleToResponse(schedule));
    } catch (error) {
      this.logger.error('NATS: Failed to create weekly schedule', error);
      return errorResponse('WEEKLY_SCHEDULE_CREATE_FAILED', error.message || 'Failed to create weekly schedule');
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
        isActive: updateData.isActive,
      };

      const schedule = await this.weeklyScheduleService.update(Number(scheduleId), updateDto);
      this.logger.log(`NATS: Updated weekly schedule ${scheduleId}`);
      return successResponse(mapWeeklyScheduleToResponse(schedule));
    } catch (error) {
      this.logger.error('NATS: Failed to update weekly schedule', error);
      return errorResponse('WEEKLY_SCHEDULE_UPDATE_FAILED', error.message || 'Failed to update weekly schedule');
    }
  }

  @MessagePattern('courses.weeklySchedule.delete')
  async deleteWeeklySchedule(@Payload() data: any) {
    try {
      const { scheduleId } = data;
      this.logger.log(`NATS: Deleting weekly schedule ${scheduleId}`);
      await this.weeklyScheduleService.remove(Number(scheduleId));
      this.logger.log(`NATS: Deleted weekly schedule ${scheduleId}`);
      return successResponse({ deleted: true });
    } catch (error) {
      this.logger.error('NATS: Failed to delete weekly schedule', error);
      return errorResponse('WEEKLY_SCHEDULE_DELETE_FAILED', error.message || 'Failed to delete weekly schedule');
    }
  }
}