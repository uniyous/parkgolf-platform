import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CourseService } from '../service/course.service';
import { CreateCourseDto, UpdateCourseDto, CourseResponseDto } from '../dto/course.dto';
import {
  successResponse,
  errorResponse,
  paginationMeta,
} from '../../common/utils/response.util';
import { CoursePayload } from '../../common/types/response.types';

@Controller()
export class CourseNatsController {
  private readonly logger = new Logger(CourseNatsController.name);

  constructor(
    private readonly courseService: CourseService,
  ) {}

  // Course NATS Message Handlers
  @MessagePattern('courses.list')
  async getCourses(@Payload() data: CoursePayload) {
    try {
      const { companyId, clubId, page = 1, limit = 20 } = data;
      this.logger.log(`NATS: Getting courses list - companyId: ${companyId}, clubId: ${clubId}, page: ${page}, limit: ${limit}`);

      // Build query filters
      const query: any = {
        page: Number(page),
        limit: Number(limit),
      };

      if (companyId) {
        query.companyId = Number(companyId);
        this.logger.debug(`NATS: Filtering by companyId: ${query.companyId}`);
      }

      if (clubId) {
        query.clubId = Number(clubId);
        this.logger.debug(`NATS: Filtering by clubId: ${query.clubId}`);
      }

      // Use actual database query
      const result = await this.courseService.findAll(query);
      const courses = result.data.map(CourseResponseDto.fromEntity);

      this.logger.log(`NATS: Returning ${courses.length} courses from database query`);
      return successResponse({ courses }, paginationMeta(result.total, result.page, result.limit));
    } catch (error) {
      this.logger.error('NATS: Failed to get courses', error);
      return errorResponse('COURSES_LIST_FAILED', error.message || 'Failed to get courses');
    }
  }

  @MessagePattern('courses.findById')
  async getCourseById(@Payload() data: CoursePayload) {
    try {
      this.logger.log(`NATS: Getting course ${data.courseId}`);
      const course = await this.courseService.findOne(Number(data.courseId));
      this.logger.log(`NATS: Returning course ${course.id}`);
      return successResponse(CourseResponseDto.fromEntity(course));
    } catch (error) {
      this.logger.error('NATS: Failed to get course', error);
      return errorResponse('COURSE_NOT_FOUND', error.message || 'Course not found');
    }
  }

  @MessagePattern('courses.findByClub')
  async getCoursesByClub(@Payload() data: CoursePayload) {
    try {
      const { clubId } = data;
      this.logger.log(`NATS: Getting courses for club ${clubId}`);
      const result = await this.courseService.findAll({ clubId: Number(clubId), page: 1, limit: 100 });
      const courses = result.data.map(CourseResponseDto.fromEntity);
      this.logger.log(`NATS: Returning ${courses.length} courses for club ${clubId}`);
      return successResponse({ courses });
    } catch (error) {
      this.logger.error('NATS: Failed to get courses by club', error);
      return errorResponse('COURSES_LIST_FAILED', error.message || 'Failed to get courses');
    }
  }

  @MessagePattern('courses.create')
  async createCourse(@Payload() data: CoursePayload) {
    try {
      this.logger.log('NATS: Creating course');
      const course = await this.courseService.create(data.data as CreateCourseDto);
      this.logger.log(`NATS: Created course with ID ${course.id}`);
      return successResponse(CourseResponseDto.fromEntity(course));
    } catch (error) {
      this.logger.error('NATS: Failed to create course', error);
      return errorResponse('COURSE_CREATE_FAILED', error.message || 'Failed to create course');
    }
  }

  @MessagePattern('courses.update')
  async updateCourse(@Payload() data: CoursePayload) {
    try {
      this.logger.log(`NATS: Updating course ${data.courseId}`);
      const course = await this.courseService.update(Number(data.courseId), data.data as UpdateCourseDto);
      this.logger.log(`NATS: Updated course ${course.id}`);
      return successResponse(CourseResponseDto.fromEntity(course));
    } catch (error) {
      this.logger.error('NATS: Failed to update course', error);
      return errorResponse('COURSE_UPDATE_FAILED', error.message || 'Failed to update course');
    }
  }

  @MessagePattern('courses.delete')
  async deleteCourse(@Payload() data: CoursePayload) {
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
}
