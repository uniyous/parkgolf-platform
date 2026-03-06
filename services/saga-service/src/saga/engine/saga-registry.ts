import { Injectable, Logger } from '@nestjs/common';
import { SagaDefinition } from '../definitions/saga-definition.interface';
import { CreateBookingSaga } from '../definitions/create-booking.saga';
import { CancelBookingSaga } from '../definitions/cancel-booking.saga';
import { AdminRefundSaga } from '../definitions/admin-refund.saga';
import { PaymentConfirmedSaga } from '../definitions/payment-confirmed.saga';
import { PaymentTimeoutSaga } from '../definitions/payment-timeout.saga';

@Injectable()
export class SagaRegistry {
  private readonly logger = new Logger(SagaRegistry.name);
  private readonly registry = new Map<string, SagaDefinition>();

  constructor() {
    this.register(CreateBookingSaga);
    this.register(CancelBookingSaga);
    this.register(AdminRefundSaga);
    this.register(PaymentConfirmedSaga);
    this.register(PaymentTimeoutSaga);

    this.logger.log(`Registered ${this.registry.size} saga definitions: ${[...this.registry.keys()].join(', ')}`);
  }

  private register(definition: SagaDefinition): void {
    this.registry.set(definition.name, definition);
  }

  get(sagaType: string): SagaDefinition | undefined {
    return this.registry.get(sagaType);
  }

  has(sagaType: string): boolean {
    return this.registry.has(sagaType);
  }

  getAll(): SagaDefinition[] {
    return [...this.registry.values()];
  }
}
