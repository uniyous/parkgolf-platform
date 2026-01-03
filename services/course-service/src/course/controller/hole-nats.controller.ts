import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { HoleService } from '../service/hole.service';
import { CreateHoleDto, UpdateHoleDto, FindHolesQueryDto, HoleResponseDto } from '../dto/hole.dto';
import { HolePayload, NatsResponse } from '../../common/types/response.types';

@Controller()
export class HoleNatsController {
  private readonly logger = new Logger(HoleNatsController.name);

  constructor(private readonly holeService: HoleService) {}

  @MessagePattern('holes.list')
  async getHoles(@Payload() data: HolePayload) {
    const { courseId, ...query } = data;
    this.logger.log(`NATS: Getting holes for course ${courseId}`);

    const queryDto: FindHolesQueryDto = {
      holeNumber: query.holeNumber,
      par: query.par,
    };

    const holes = await this.holeService.findAllByCourseId(Number(courseId), queryDto);
    return NatsResponse.success(holes.map(HoleResponseDto.fromEntity));
  }

  @MessagePattern('holes.findById')
  async getHoleById(@Payload() data: HolePayload) {
    const { courseId, holeId } = data;
    this.logger.log(`NATS: Getting hole ${holeId} for course ${courseId}`);

    const hole = await this.holeService.findOne(Number(courseId), Number(holeId));
    return NatsResponse.success(HoleResponseDto.fromEntity(hole));
  }

  @MessagePattern('holes.create')
  async createHole(@Payload() data: HolePayload) {
    const { courseId, data: holeData } = data;
    this.logger.log(`NATS: Creating hole for course ${courseId}`);

    const createDto: CreateHoleDto = {
      holeNumber: holeData.holeNumber,
      par: holeData.par,
      distance: holeData.distance,
      handicap: holeData.handicap || holeData.holeNumber,
    };

    const hole = await this.holeService.create(Number(courseId), createDto);
    this.logger.log(`NATS: Created hole with ID ${hole.id} for course ${courseId}`);
    return NatsResponse.success(HoleResponseDto.fromEntity(hole));
  }

  @MessagePattern('holes.update')
  async updateHole(@Payload() data: HolePayload) {
    const { courseId, holeId, data: holeData } = data;
    this.logger.log(`NATS: Updating hole ${holeId} for course ${courseId}`);

    const updateDto: UpdateHoleDto = {
      holeNumber: holeData.holeNumber,
      par: holeData.par,
      distance: holeData.distance,
    };

    const hole = await this.holeService.update(Number(courseId), Number(holeId), updateDto);
    this.logger.log(`NATS: Updated hole ${holeId}`);
    return NatsResponse.success(HoleResponseDto.fromEntity(hole));
  }

  @MessagePattern('holes.delete')
  async deleteHole(@Payload() data: HolePayload) {
    const { courseId, holeId } = data;
    this.logger.log(`NATS: Deleting hole ${holeId} for course ${courseId}`);

    await this.holeService.remove(Number(courseId), Number(holeId));
    this.logger.log(`NATS: Deleted hole ${holeId}`);
    return NatsResponse.deleted();
  }

  @MessagePattern('holes.findByCourse')
  async findHolesByCourse(@Payload() data: HolePayload) {
    const { courseId } = data;
    this.logger.log(`NATS: Finding all holes for course ${courseId}`);

    const holes = await this.holeService.findAllByCourseId(Number(courseId), {});
    this.logger.log(`NATS: Returning ${holes.length} holes for course ${courseId}`);
    return NatsResponse.success(holes.map(HoleResponseDto.fromEntity));
  }
}
