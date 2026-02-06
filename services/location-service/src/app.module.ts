import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CommonModule } from './common/common.module';
import { LocationModule } from './location/location.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    CommonModule,
    LocationModule,
  ],
})
export class AppModule {}
