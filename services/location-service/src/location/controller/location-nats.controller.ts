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
 */
@Controller()
export class LocationNatsController {
  private readonly logger = new Logger(LocationNatsController.name);

  constructor(private readonly locationService: LocationService) {}

  /**
   * 주소 검색
   * Pattern: location.search.address
   */
  @MessagePattern('location.search.address')
  async searchAddress(@Payload() data: AddressSearchDto) {
    this.logger.debug(`Address search: ${data.query}`);

    try {
      const result = await this.locationService.searchAddress(data);
      return NatsResponse.success(result);
    } catch (error: any) {
      this.logger.error('Address search failed', error);
      return NatsResponse.error(error.code || 'SEARCH_ERROR', error.message);
    }
  }

  /**
   * 키워드 장소 검색
   * Pattern: location.search.keyword
   */
  @MessagePattern('location.search.keyword')
  async searchKeyword(@Payload() data: KeywordSearchDto) {
    this.logger.debug(`Keyword search: ${data.query}`);

    try {
      const result = await this.locationService.searchKeyword(data);
      return NatsResponse.success(result);
    } catch (error: any) {
      this.logger.error('Keyword search failed', error);
      return NatsResponse.error(error.code || 'SEARCH_ERROR', error.message);
    }
  }

  /**
   * 카테고리 장소 검색
   * Pattern: location.search.category
   */
  @MessagePattern('location.search.category')
  async searchCategory(@Payload() data: CategorySearchDto) {
    this.logger.debug(`Category search: ${data.categoryGroupCode}`);

    try {
      const result = await this.locationService.searchCategory(data);
      return NatsResponse.success(result);
    } catch (error: any) {
      this.logger.error('Category search failed', error);
      return NatsResponse.error(error.code || 'SEARCH_ERROR', error.message);
    }
  }

  /**
   * 좌표 → 주소 변환
   * Pattern: location.coord2address
   */
  @MessagePattern('location.coord2address')
  async coordToAddress(@Payload() data: CoordToAddressDto) {
    this.logger.debug(`Coord to address: ${data.x}, ${data.y}`);

    try {
      const result = await this.locationService.coordToAddress(data);
      return NatsResponse.success(result);
    } catch (error: any) {
      this.logger.error('Coord to address failed', error);
      return NatsResponse.error(error.code || 'CONVERSION_ERROR', error.message);
    }
  }

  /**
   * 좌표 → 행정구역 정보
   * Pattern: location.coord2region
   */
  @MessagePattern('location.coord2region')
  async coordToRegion(@Payload() data: { x: number; y: number }) {
    this.logger.debug(`Coord to region: ${data.x}, ${data.y}`);

    try {
      const result = await this.locationService.coordToRegion(data.x, data.y);
      return NatsResponse.success(result);
    } catch (error: any) {
      this.logger.error('Coord to region failed', error);
      return NatsResponse.error(error.code || 'CONVERSION_ERROR', error.message);
    }
  }

  /**
   * 주소 → 좌표 추출
   * Pattern: location.getCoordinates
   */
  @MessagePattern('location.getCoordinates')
  async getCoordinates(@Payload() data: { address: string }) {
    this.logger.debug(`Get coordinates: ${data.address}`);

    try {
      const result = await this.locationService.getCoordinates(data.address);
      return NatsResponse.success(result);
    } catch (error: any) {
      this.logger.error('Get coordinates failed', error);
      return NatsResponse.error(error.code || 'SEARCH_ERROR', error.message);
    }
  }

  /**
   * 근처 파크골프장 검색
   * Pattern: location.nearbyGolf
   */
  @MessagePattern('location.nearbyGolf')
  async searchNearbyGolf(@Payload() data: { x: number; y: number; radius?: number }) {
    this.logger.debug(`Nearby golf search: ${data.x}, ${data.y}`);

    try {
      const result = await this.locationService.searchNearbyGolfCourses(
        data.x,
        data.y,
        data.radius,
      );
      return NatsResponse.success({ places: result, count: result.length });
    } catch (error: any) {
      this.logger.error('Nearby golf search failed', error);
      return NatsResponse.error(error.code || 'SEARCH_ERROR', error.message);
    }
  }

  /**
   * 캐시 통계
   * Pattern: location.stats
   */
  @MessagePattern('location.stats')
  async getStats() {
    try {
      const stats = this.locationService.getCacheStats();
      return NatsResponse.success({
        ...stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      return NatsResponse.error('STATS_ERROR', error.message);
    }
  }
}
