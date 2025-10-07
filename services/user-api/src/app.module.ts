import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { CoursesModule } from './courses/courses.module';
import { NotifyModule } from './notify/notify.module';

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
    }),
    ...natsImports,
    AuthModule,
    BookingModule,
    CoursesModule,
    NotifyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: natsExports,
})
export class AppModule {}
