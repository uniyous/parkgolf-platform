import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AuthNatsService } from './auth-nats.service';
import { AdminNatsService } from './admin-nats.service';
import { CourseNatsService } from './course-nats.service';
import { BookingNatsService } from './booking-nats.service';
import { NotificationNatsService } from './notification-nats.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [configService.get<string>('NATS_URL') || 'nats://localhost:4222'],
            queue: 'auth-service',
            reconnect: true,
            maxReconnectAttempts: 5,
            reconnectTimeWait: 1000,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'COURSE_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [configService.get<string>('NATS_URL') || 'nats://localhost:4222'],
            queue: 'course-service',
            reconnect: true,
            maxReconnectAttempts: 5,
            reconnectTimeWait: 1000,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'BOOKING_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [configService.get<string>('NATS_URL') || 'nats://localhost:4222'],
            queue: 'booking-service',
            reconnect: true,
            maxReconnectAttempts: 5,
            reconnectTimeWait: 1000,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'NOTIFY_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [configService.get<string>('NATS_URL') || 'nats://localhost:4222'],
            queue: 'notify-service',
            reconnect: true,
            maxReconnectAttempts: 5,
            reconnectTimeWait: 1000,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [
    AuthNatsService,
    AdminNatsService,
    CourseNatsService,
    BookingNatsService,
    NotificationNatsService,
  ],
  exports: [
    AuthNatsService,
    AdminNatsService,
    CourseNatsService,
    BookingNatsService,
    NotificationNatsService,
  ],
})
export class NatsServicesModule {}