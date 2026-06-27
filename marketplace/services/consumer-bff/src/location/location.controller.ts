import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { LocationService } from './location.service';

@ApiTags('Location')
@Controller('api/user/location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('reverse-geo')
  @ApiOperation({ summary: '좌표 → 행정동 변환' })
  @ApiQuery({ name: 'lat', required: true, type: Number, description: '위도' })
  @ApiQuery({ name: 'lon', required: true, type: Number, description: '경도' })
  @ApiResponse({ status: 200, description: '행정동 정보 반환' })
  async reverseGeo(@Query('lat') lat: string, @Query('lon') lon: string) {
    return this.locationService.reverseGeo(parseFloat(lat), parseFloat(lon));
  }

  @Get('nearby-clubs')
  @ApiOperation({ summary: '주변 골프장 검색' })
  @ApiQuery({ name: 'lat', required: true, type: Number, description: '위도' })
  @ApiQuery({ name: 'lon', required: true, type: Number, description: '경도' })
  @ApiQuery({ name: 'radius', required: false, type: Number, description: '반경(km), 기본 30' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '최대 결과 수, 기본 20' })
  @ApiResponse({ status: 200, description: '주변 골프장 목록' })
  async nearbyClubs(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
  ) {
    return this.locationService.nearbyClubs(
      parseFloat(lat),
      parseFloat(lon),
      radius ? parseFloat(radius) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}
