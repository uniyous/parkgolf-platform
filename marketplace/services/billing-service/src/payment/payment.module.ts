import { Module } from '@nestjs/common';
import { PaymentService } from './service/payment.service';
import { PaymentSplitService } from './service/payment-split.service';
import { TossApiService } from './service/toss-api.service';
import { OutboxProcessorService } from './service/outbox-processor.service';
import { PaymentReconcileService } from './service/payment-reconcile.service';
import { PaymentNatsController } from './controller/payment-nats.controller';
import { WebhookController } from './controller/webhook.controller';

// TossApiService는 @uniyous/pg-provider(global fetch)로 위임 — HttpModule 불필요 (UNI-130 [3b])
@Module({
  controllers: [PaymentNatsController, WebhookController],
  providers: [
    PaymentService,
    PaymentSplitService,
    TossApiService,
    OutboxProcessorService,
    PaymentReconcileService,
  ],
  exports: [PaymentService, PaymentSplitService],
})
export class PaymentModule {}
