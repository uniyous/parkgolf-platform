import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { HoleService } from '../service/hole.service';
import { CreateHoleDto, UpdateHoleDto, FindHolesQueryDto, HoleResponseDto } from '../dto/hole.dto';
import {
  successResponse,
  errorResponse,
} from '../../common/utils/response.util';
import { HolePayload } from '../../common/types/response.types';

@Controller()
export class HoleNatsController {
  private readonly logger = new Logger(HoleNatsController.name);

  constructor(private readonly holeService: HoleService) {}

  @MessagePattern('holes.list')
  async getHoles(@Payload() data: HolePayload) {
    try {
      const { courseId, ...query } = data;
      this.logger.log(`NATS: Getting holes for course ${courseId}`);

      const queryDto: FindHolesQueryDto = {
        holeNumber: query.holeNumber,
        par: query.par,
      };

      const holes = await this.holeService.findAllByCourseId(Number(courseId), queryDto);
      return successResponse(holes.map(HoleResponseDto.fromEntity));
    } catch (error) {
      this.logger.error('NATS: Failed to get holes', error);
      return errorResponse('HOLES_LIST_FAILED', error.message || 'Failed to get holes');
    }
  }

  @MessagePattern('holes.findById')
  async getHoleById(@Payload() data: HolePayload) {
    try {
      const { courseId, holeId } = data;
      this.logger.log(`NATS: Getting hole ${holeId} for course ${courseId}`);

      const hole = await this.holeService.findOne(Number(courseId), Number(holeId));
      return successResponse(HoleResponseDto.fromEntity(hole));
    } catch (error) {
      this.logger.error('NATS: Failed to get hole', error);
      return errorResponse('HOLE_NOT_FOUND', error.message || 'Hole not found');
    }
  }

  @MessagePattern('holes.create')
  async createHole(@Payload() data: HolePayload) {
    try {
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
      return successResponse(HoleResponseDto.fromEntity(hole));
    } catch (error) {
      this.logger.error('NATS: Failed to create hole', error);
      return errorResponse('HOLE_CREATE_FAILED', error.message || 'Failed to create hole');
    }
  }

  @MessagePattern('holes.update')
  async updateHole(@Payload() data: HolePayload) {
    try {
      const { courseId, holeId, data: holeData } = data;
      this.logger.log(`NATS: Updating hole ${holeId} for course ${courseId}`);

      const updateDto: UpdateHoleDto = {
        holeNumber: holeData.holeNumber,
        par: holeData.par,
        distance: holeData.distance,
      };

      const hole = await this.holeService.update(Number(courseId), Number(holeId), updateDto);
      this.logger.log(`NATS: Updated hole ${holeId}`);
      return successResponse(HoleResponseDto.fromEntity(hole));
    } catch (error) {
      this.logger.error('NATS: Failed to update hole', error);
      return errorResponse('HOLE_UPDATE_FAILED', error.message || 'Failed to update hole');
    }
  }

  @MessagePattern('holes.delete')
  async deleteHole(@Payload() data: HolePayload) {
    try {
      const { courseId, holeId } = data;
      this.logger.log(`NATS: Deleting hole ${holeId} for course ${courseId}`);

      await this.holeService.remove(Number(courseId), Number(holeId));
      this.logger.log(`NATS: Deleted hole ${holeId}`);
      return successResponse({ deleted: true });
    } catch (error) {
      this.logger.error('NATS: Failed to delete hole', error);
      return errorResponse('HOLE_DELETE_FAILED', error.message || 'Failed to delete hole');
    }
  }

  @MessagePattern('holes.findByCourse')
  async findHolesByCourse(@Payload() data: HolePayload) {
    try {
      const { courseId } = data;
      this.logger.log(`NATS: Finding all holes for course ${courseId}`);

      const holes = await this.holeService.findAllByCourseId(Number(courseId), {});
      this.logger.log(`NATS: Returning ${holes.length} holes for course ${courseId}`);
      return successResponse(holes.map(HoleResponseDto.fromEntity));
    } catch (error) {
      this.logger.error('NATS: Failed to find holes by course', error);
      return errorResponse('HOLES_BY_COURSE_FAILED', error.message || 'Failed to find holes by course');
    }
  }
}
