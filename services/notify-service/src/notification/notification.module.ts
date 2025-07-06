import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationController } from './controller/notification.controller';
import { TemplateController } from './controller/template.controller';
import { NotificationService } from './service/notification.service';
import { TemplateService } from './service/template.service';
import { PreferencesService } from './service/preferences.service';
import { SchedulerService } from './service/scheduler.service';
import { 
  DeliveryService, 
  EmailDeliveryChannel, 
  SmsDeliveryChannel, 
  PushDeliveryChannel 
} from './service/delivery.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [NotificationController, TemplateController],
  providers: [
    NotificationService,
    TemplateService,
    PreferencesService,
    SchedulerService,
    DeliveryService,
    EmailDeliveryChannel,
    SmsDeliveryChannel,
    PushDeliveryChannel,
  ],
  exports: [
    NotificationService,
    TemplateService,
    PreferencesService,
    DeliveryService,
  ],
})
export class NotificationModule {}