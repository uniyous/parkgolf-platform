import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    @Inject('COURSE_SERVICE') private readonly courseClient: ClientProxy,
  ) {}

  async searchCourses(filters: {
    keyword?: string;
    location?: string;
    priceRange?: [number, number];
    rating?: number;
  }) {
    try {
      this.logger.log(
        `Searching courses with filters: ${JSON.stringify(filters)}`,
      );

      const result = await firstValueFrom(
        this.courseClient.send('course.search', filters).pipe(timeout(5000)),
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to search courses: ${error.message}`,
        error.stack,
      );

      // Return empty array instead of throwing to allow fallback to mock data
      return [];
    }
  }

  async getAllCourses() {
    try {
      this.logger.log('Getting all courses');

      const result = await firstValueFrom(
        this.courseClient.send('course.getAll', {}).pipe(timeout(5000)),
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get all courses: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  async getCourseById(id: number) {
    try {
      this.logger.log(`Getting course by id: ${id}`);

      const result = await firstValueFrom(
        this.courseClient.send('course.getById', { id }).pipe(timeout(5000)),
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get course ${id}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }
}
