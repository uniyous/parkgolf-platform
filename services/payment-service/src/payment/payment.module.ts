import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentService } from './service/payment.service';
import { TossApiService } from './service/toss-api.service';
import { OutboxProcessorService } from './service/outbox-processor.service';
import { PaymentNatsController } from './controller/payment-nats.controller';
import { WebhookController } from './controller/webhook.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [PaymentNatsController, WebhookController],
  providers: [PaymentService, TossApiService, OutboxProcessorService],
  exports: [PaymentService],
})
export class PaymentModule {}
