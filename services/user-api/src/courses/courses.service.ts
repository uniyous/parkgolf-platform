import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

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
    this.logger.log(`Searching courses with filters: ${JSON.stringify(filters)}`);
    return this.natsClient.send('courses.list', filters, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getAllCourses() {
    this.logger.log('Getting all courses');
    return this.natsClient.send('courses.list', {}, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getCourseById(id: number) {
    this.logger.log(`Getting course by id: ${id}`);
    return this.natsClient.send('courses.findById', { courseId: id }, NATS_TIMEOUTS.QUICK);
  }
}
