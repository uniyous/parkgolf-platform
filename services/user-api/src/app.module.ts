import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { CoursesModule } from './courses/courses.module';
import { NotifyModule } from './notify/notify.module';
import { NatsModule } from './shared/nats';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    NatsModule,
    AuthModule,
    BookingModule,
    CoursesModule,
    NotifyModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
