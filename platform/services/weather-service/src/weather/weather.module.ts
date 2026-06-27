import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WeatherService } from './service/weather.service';
import { KmaApiService } from './service/kma-api.service';
import { CoordinateConverter } from './service/coordinate-converter';
import { WeatherCacheService } from './service/weather-cache.service';
import { WeatherNatsController } from './controller/weather-nats.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  controllers: [WeatherNatsController],
  providers: [
    WeatherService,
    KmaApiService,
    CoordinateConverter,
    WeatherCacheService,
  ],
  exports: [WeatherService],
})
export class WeatherModule {}
