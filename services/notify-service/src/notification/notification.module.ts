import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationService } from './service/notification.service';
import { TemplateService } from './service/template.service';
import { PreferencesService } from './service/preferences.service';
import { SchedulerService } from './service/scheduler.service';
import { DeliveryService } from './service/delivery.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [],
  providers: [
    NotificationService,
    TemplateService,
    PreferencesService,
    SchedulerService,
    DeliveryService,
  ],
  exports: [
    NotificationService,
    TemplateService,
    PreferencesService,
    DeliveryService,
  ],
})
export class NotificationModule {}
