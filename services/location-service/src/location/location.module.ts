import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { KakaoApiService } from './service/kakao-api.service';
import { LocationCacheService } from './service/location-cache.service';
import { LocationService } from './service/location.service';
import { LocationNatsController } from './controller/location-nats.controller';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  controllers: [LocationNatsController],
  providers: [KakaoApiService, LocationCacheService, LocationService],
  exports: [LocationService],
})
export class LocationModule {}
