import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { HoleService } from '../service/hole.service';
import { CreateHoleDto, UpdateHoleDto, FindHolesQueryDto } from '../dto/hole.dto';

@Controller()
export class HoleNatsController {
  private readonly logger = new Logger(HoleNatsController.name);

  constructor(
    private readonly holeService: HoleService,
  ) {}

  // Hole NATS Message Handlers
  @MessagePattern('holes.list')
  async getHoles(@Payload() data: any) {
    try {
      const { courseId, ...query } = data;
      this.logger.log(`NATS: Getting holes for course ${courseId}`);
      
      const queryDto: FindHolesQueryDto = {
        holeNumber: query.holeNumber,
        par: query.par,
      };

      const holes = await this.holeService.findAllByCourseId(Number(courseId), queryDto);
      
      const result = holes.map(hole => ({
        id: hole.id,
        courseId: hole.courseId,
        holeNumber: hole.holeNumber,
        par: hole.par,
        distance: hole.distance,
        createdAt: hole.createdAt.toISOString(),
        updatedAt: hole.updatedAt.toISOString()
      }));

      this.logger.log(`NATS: Returning ${result.length} holes for course ${courseId}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to get holes', error);
      throw error;
    }
  }

  @MessagePattern('holes.findById')
  async getHoleById(@Payload() data: any) {
    try {
      const { courseId, holeId } = data;
      this.logger.log(`NATS: Getting hole ${holeId} for course ${courseId}`);
      
      const hole = await this.holeService.findOne(Number(courseId), Number(holeId));
      
      const result = {
        id: hole.id,
        courseId: hole.courseId,
        holeNumber: hole.holeNumber,
        par: hole.par,
        distance: hole.distance,
        createdAt: hole.createdAt.toISOString(),
        updatedAt: hole.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Returning hole ${holeId}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to get hole', error);
      throw error;
    }
  }

  @MessagePattern('holes.create')
  async createHole(@Payload() data: any) {
    try {
      const { courseId, data: holeData } = data;
      this.logger.log(`NATS: Creating hole for course ${courseId}`);
      
      const createDto: CreateHoleDto = {
        holeNumber: holeData.holeNumber,
        par: holeData.par,
        distance: holeData.distance,
        handicap: holeData.handicap || holeData.holeNumber, // Default to hole number if not provided
      };

      const hole = await this.holeService.create(Number(courseId), createDto);
      
      const result = {
        id: hole.id,
        courseId: hole.courseId,
        holeNumber: hole.holeNumber,
        par: hole.par,
        distance: hole.distance,
        createdAt: hole.createdAt.toISOString(),
        updatedAt: hole.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Created hole with ID ${hole.id} for course ${courseId}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to create hole', error);
      throw error;
    }
  }

  @MessagePattern('holes.update')
  async updateHole(@Payload() data: any) {
    try {
      const { courseId, holeId, data: holeData } = data;
      this.logger.log(`NATS: Updating hole ${holeId} for course ${courseId}`);
      
      const updateDto: UpdateHoleDto = {
        holeNumber: holeData.holeNumber,
        par: holeData.par,
        distance: holeData.distance,
      };

      const hole = await this.holeService.update(Number(courseId), Number(holeId), updateDto);
      
      const result = {
        id: hole.id,
        courseId: hole.courseId,
        holeNumber: hole.holeNumber,
        par: hole.par,
        distance: hole.distance,
        createdAt: hole.createdAt.toISOString(),
        updatedAt: hole.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Updated hole ${holeId}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to update hole', error);
      throw error;
    }
  }

  @MessagePattern('holes.delete')
  async deleteHole(@Payload() data: any) {
    try {
      const { courseId, holeId } = data;
      this.logger.log(`NATS: Deleting hole ${holeId} for course ${courseId}`);
      
      await this.holeService.remove(Number(courseId), Number(holeId));
      
      this.logger.log(`NATS: Deleted hole ${holeId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('NATS: Failed to delete hole', error);
      throw error;
    }
  }

  @MessagePattern('holes.findByCourse')
  async findHolesByCourse(@Payload() data: any) {
    try {
      const { courseId } = data;
      this.logger.log(`NATS: Finding all holes for course ${courseId}`);
      
      const holes = await this.holeService.findAllByCourseId(Number(courseId), {});
      
      const result = holes.map(hole => ({
        id: hole.id,
        courseId: hole.courseId,
        holeNumber: hole.holeNumber,
        par: hole.par,
        distance: hole.distance,
        createdAt: hole.createdAt.toISOString(),
        updatedAt: hole.updatedAt.toISOString()
      }));

      this.logger.log(`NATS: Returning ${result.length} holes for course ${courseId}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to find holes by course', error);
      throw error;
    }
  }
}