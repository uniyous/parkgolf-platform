import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LocationService } from '../service/location.service';
import {
  AddressSearchDto,
  KeywordSearchDto,
  CoordToAddressDto,
  CategorySearchDto,
} from '../dto/location.dto';
import { NatsResponse } from '../../common/types/response.types';

/**
 * 위치 서비스 NATS 컨트롤러
 * 에러 처리는 UnifiedExceptionFilter에 위임
 */
@Controller()
export class LocationNatsController {
  private readonly logger = new Logger(LocationNatsController.name);

  constructor(private readonly locationService: LocationService) {}

  @MessagePattern('location.search.address')
  async searchAddress(@Payload() data: AddressSearchDto) {
    this.logger.debug(`Address search: ${data.query}`);
    const result = await this.locationService.searchAddress(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('location.search.keyword')
  async searchKeyword(@Payload() data: KeywordSearchDto) {
    this.logger.debug(`Keyword search: ${data.query}`);
    const result = await this.locationService.searchKeyword(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('location.search.category')
  async searchCategory(@Payload() data: CategorySearchDto) {
    this.logger.debug(`Category search: ${data.categoryGroupCode}`);
    const result = await this.locationService.searchCategory(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('location.coord2address')
  async coordToAddress(@Payload() data: CoordToAddressDto) {
    this.logger.debug(`Coord to address: ${data.x}, ${data.y}`);
    const result = await this.locationService.coordToAddress(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('location.coord2region')
  async coordToRegion(@Payload() data: { x: number; y: number }) {
    this.logger.debug(`Coord to region: ${data.x}, ${data.y}`);
    const result = await this.locationService.coordToRegion(data.x, data.y);
    return NatsResponse.success(result);
  }

  @MessagePattern('location.getCoordinates')
  async getCoordinates(@Payload() data: { address: string }) {
    this.logger.debug(`Get coordinates: ${data.address}`);
    const result = await this.locationService.getCoordinates(data.address);
    return NatsResponse.success(result);
  }

  @MessagePattern('location.nearbyGolf')
  async searchNearbyGolf(@Payload() data: { x: number; y: number; radius?: number }) {
    this.logger.debug(`Nearby golf search: ${data.x}, ${data.y}`);
    const result = await this.locationService.searchNearbyGolfCourses(
      data.x,
      data.y,
      data.radius,
    );
    return NatsResponse.success({ places: result, count: result.length });
  }

  @MessagePattern('location.stats')
  async getStats() {
    const stats = this.locationService.getCacheStats();
    return NatsResponse.success({
      ...stats,
      timestamp: new Date().toISOString(),
    });
  }
}
