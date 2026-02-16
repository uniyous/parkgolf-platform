import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { WeatherService } from './weather.service';

@ApiTags('Weather')
@Controller('api/user/weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  @ApiOperation({ summary: '현재 날씨 조회' })
  @ApiQuery({ name: 'lat', required: true, type: Number, description: '위도' })
  @ApiQuery({ name: 'lon', required: true, type: Number, description: '경도' })
  @ApiResponse({ status: 200, description: '현재 날씨 정보' })
  async getCurrentWeather(@Query('lat') lat: string, @Query('lon') lon: string) {
    return this.weatherService.getCurrentWeather(parseFloat(lat), parseFloat(lon));
  }

  @Get('hourly')
  @ApiOperation({ summary: '시간별 예보 조회' })
  @ApiQuery({ name: 'lat', required: true, type: Number, description: '위도' })
  @ApiQuery({ name: 'lon', required: true, type: Number, description: '경도' })
  @ApiResponse({ status: 200, description: '24시간 시간별 예보' })
  async getHourlyForecast(@Query('lat') lat: string, @Query('lon') lon: string) {
    return this.weatherService.getHourlyForecast(parseFloat(lat), parseFloat(lon));
  }

  @Get('forecast')
  @ApiOperation({ summary: '일별 예보 조회' })
  @ApiQuery({ name: 'lat', required: true, type: Number, description: '위도' })
  @ApiQuery({ name: 'lon', required: true, type: Number, description: '경도' })
  @ApiResponse({ status: 200, description: '3일간 일별 예보' })
  async getDailyForecast(@Query('lat') lat: string, @Query('lon') lon: string) {
    return this.weatherService.getDailyForecast(parseFloat(lat), parseFloat(lon));
  }
}
