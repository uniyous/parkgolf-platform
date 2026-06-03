import { Module } from '@nestjs/common';
import { NotificationService } from './service/notification.service';
import { TemplateService } from './service/template.service';
import { PreferencesService } from './service/preferences.service';
import { SchedulerService } from './service/scheduler.service';
import { DeliveryService } from './service/delivery.service';
import { PushService } from './service/push.service';
import { DeadLetterService } from './service/dead-letter.service';

@Module({
  imports: [],
  controllers: [],
  providers: [
    NotificationService,
    TemplateService,
    PreferencesService,
    SchedulerService,
    DeliveryService,
    PushService,
    DeadLetterService,
  ],
  exports: [
    NotificationService,
    TemplateService,
    PreferencesService,
    DeliveryService,
    PushService,
    DeadLetterService,
  ],
})
export class NotificationModule {}
