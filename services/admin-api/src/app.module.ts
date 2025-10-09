import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CommonModule } from './common/common.module';
import { SharedModule } from './postal/shared.module';
import { AuthModule } from './auth/auth.module';
import { AdminsModule } from './admins/admins.module';
import { CoursesModule } from './courses/courses.module';
import { BookingsModule } from './bookings/bookings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ClubModule } from './club/club.module';

const natsImports = process.env.NATS_URL && process.env.NATS_URL !== 'disabled'
  ? [ClientsModule.register([
      {
        name: 'NATS_CLIENT',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL || 'nats://localhost:4222'],
        },
      },
    ])]
  : [];

const natsExports = process.env.NATS_URL && process.env.NATS_URL !== 'disabled' ? [ClientsModule] : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ...natsImports,
    CommonModule,
    SharedModule,
    AuthModule,
    AdminsModule,
    CoursesModule,
    BookingsModule,
    NotificationsModule,
    UsersModule,
    DashboardModule,
    ClubModule,
  ],
  controllers: [],
  providers: [],
  exports: natsExports,
})
export class AppModule {}