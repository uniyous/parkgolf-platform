import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CourseService } from '../service/course.service';
import { CreateCourseDto, UpdateCourseDto, CourseResponseDto } from '../dto/course.dto';
import { CoursePayload } from '../../common/types/response.types';

@Controller()
export class CourseNatsController {
  private readonly logger = new Logger(CourseNatsController.name);

  constructor(
    private readonly courseService: CourseService,
  ) {}

  @MessagePattern('courses.list')
  async getCourses(@Payload() data: CoursePayload) {
    const { companyId, clubId, page = 1, limit = 20 } = data;
    this.logger.log(`NATS: Getting courses list - companyId: ${companyId}, clubId: ${clubId}, page: ${page}, limit: ${limit}`);

    const query: any = {
      page: Number(page),
      limit: Number(limit),
    };

    if (companyId) {
      query.companyId = Number(companyId);
    }

    if (clubId) {
      query.clubId = Number(clubId);
    }

    const result = await this.courseService.findAll(query);
    const courses = result.data.map(CourseResponseDto.fromEntity);

    this.logger.log(`NATS: Returning ${courses.length} courses from database query`);
    return {
      success: true,
      data: courses,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  @MessagePattern('courses.findById')
  async getCourseById(@Payload() data: CoursePayload) {
    this.logger.log(`NATS: Getting course ${data.courseId}`);
    const course = await this.courseService.findOne(Number(data.courseId));
    this.logger.log(`NATS: Returning course ${course.id}`);
    return { success: true, data: CourseResponseDto.fromEntity(course) };
  }

  @MessagePattern('courses.findByClub')
  async getCoursesByClub(@Payload() data: CoursePayload) {
    const { clubId } = data;
    this.logger.log(`NATS: Getting courses for club ${clubId}`);
    const result = await this.courseService.findAll({ clubId: Number(clubId), page: 1, limit: 100, includeHoles: true });
    const courses = result.data.map(CourseResponseDto.fromEntity);
    this.logger.log(`NATS: Returning ${courses.length} courses for club ${clubId} with holes`);
    return { success: true, data: courses };
  }

  @MessagePattern('courses.create')
  async createCourse(@Payload() data: CoursePayload) {
    this.logger.log('NATS: Creating course');
    const course = await this.courseService.create(data.data as CreateCourseDto);
    this.logger.log(`NATS: Created course with ID ${course.id}`);
    return { success: true, data: CourseResponseDto.fromEntity(course) };
  }

  @MessagePattern('courses.update')
  async updateCourse(@Payload() data: CoursePayload) {
    this.logger.log(`NATS: Updating course ${data.courseId}`);
    const course = await this.courseService.update(Number(data.courseId), data.data as UpdateCourseDto);
    this.logger.log(`NATS: Updated course ${course.id}`);
    return { success: true, data: CourseResponseDto.fromEntity(course) };
  }

  @MessagePattern('courses.delete')
  async deleteCourse(@Payload() data: CoursePayload) {
    this.logger.log(`NATS: Deleting course ${data.courseId}`);
    await this.courseService.remove(Number(data.courseId));
    this.logger.log(`NATS: Deleted course ${data.courseId}`);
    return { success: true, data: { deleted: true } };
  }
}
