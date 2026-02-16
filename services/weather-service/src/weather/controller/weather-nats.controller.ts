import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WeatherService } from '../service/weather.service';
import { NatsResponse } from '../../common/types/response.types';
import { WeatherRequestDto } from '../dto/weather.dto';

/**
 * 날씨 NATS 컨트롤러
 */
@Controller()
export class WeatherNatsController {
  private readonly logger = new Logger(WeatherNatsController.name);

  constructor(private readonly weatherService: WeatherService) {}

  /**
   * 현재 날씨 조회
   * @pattern weather.current
   */
  @MessagePattern('weather.current')
  async getCurrentWeather(@Payload() data: WeatherRequestDto) {
    this.logger.log(`Getting current weather: ${JSON.stringify(data)}`);
    const result = await this.weatherService.getCurrentWeather(data);
    return NatsResponse.success(result);
  }

  /**
   * 시간별 예보 조회 (24시간)
   * @pattern weather.hourly
   */
  @MessagePattern('weather.hourly')
  async getHourlyForecast(@Payload() data: WeatherRequestDto) {
    this.logger.log(`Getting hourly forecast: ${JSON.stringify(data)}`);
    const result = await this.weatherService.getHourlyForecast(data);
    return NatsResponse.success(result);
  }

  /**
   * 일별 예보 조회 (3일)
   * @pattern weather.forecast
   */
  @MessagePattern('weather.forecast')
  async getDailyForecast(@Payload() data: WeatherRequestDto) {
    this.logger.log(`Getting daily forecast: ${JSON.stringify(data)}`);
    const result = await this.weatherService.getDailyForecast(data);
    return NatsResponse.success(result);
  }

  /**
   * 캐시 통계 조회
   * @pattern weather.stats
   */
  @MessagePattern('weather.stats')
  async getCacheStats() {
    this.logger.log('Getting cache stats');
    const stats = this.weatherService.getCacheStats();
    const hitRate = stats.hits + stats.misses > 0
      ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)
      : '0';

    return NatsResponse.success({
      hits: stats.hits,
      misses: stats.misses,
      keys: stats.keys,
      hitRate: `${hitRate}%`,
    });
  }
}
