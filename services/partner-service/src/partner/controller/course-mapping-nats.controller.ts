import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CourseMappingService } from '../service/course-mapping.service';
import { CreateCourseMappingDto } from '../dto/create-course-mapping.dto';
import { UpdateCourseMappingDto } from '../dto/update-course-mapping.dto';
import { NatsResponse } from '../../common/types/response.types';

@Controller()
export class CourseMappingNatsController {
  constructor(private readonly courseMappingService: CourseMappingService) {}

  @MessagePattern('partner.courseMapping.create')
  async create(@Payload() data: CreateCourseMappingDto) {
    const result = await this.courseMappingService.create(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('partner.courseMapping.list')
  async findByPartnerId(@Payload() data: { partnerId: number }) {
    const result = await this.courseMappingService.findByPartnerId(data.partnerId);
    return NatsResponse.success(result);
  }

  @MessagePattern('partner.courseMapping.update')
  async update(@Payload() data: UpdateCourseMappingDto) {
    const result = await this.courseMappingService.update(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('partner.courseMapping.delete')
  async delete(@Payload() data: { id: number }) {
    await this.courseMappingService.delete(data.id);
    return NatsResponse.deleted();
  }
}
