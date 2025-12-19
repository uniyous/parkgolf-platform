import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService } from '../shared/nats';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async searchCourses(filters: {
    keyword?: string;
    location?: string;
    priceRange?: [number, number];
    rating?: number;
  }) {
    try {
      this.logger.log(`Searching courses with filters: ${JSON.stringify(filters)}`);
      return await this.natsClient.send('courses.list', filters, 5000);
    } catch (error) {
      this.logger.error(`Failed to search courses: ${error.message}`);
      return [];
    }
  }

  async getAllCourses() {
    try {
      this.logger.log('Getting all courses');
      return await this.natsClient.send('courses.list', {}, 5000);
    } catch (error) {
      this.logger.error(`Failed to get all courses: ${error.message}`);
      return [];
    }
  }

  async getCourseById(id: number) {
    try {
      this.logger.log(`Getting course by id: ${id}`);
      return await this.natsClient.send('course.getById', { id }, 5000);
    } catch (error) {
      this.logger.error(`Failed to get course ${id}: ${error.message}`);
      return null;
    }
  }
}
