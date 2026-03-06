import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { StepDefinition } from '../definitions/saga-definition.interface';

export interface StepResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  elapsedMs: number;
}

@Injectable()
export class StepExecutorService {
  private readonly logger = new Logger(StepExecutorService.name);

  constructor(
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('COURSE_SERVICE') private readonly courseClient: ClientProxy,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    @Inject('IAM_SERVICE') private readonly iamClient: ClientProxy,
  ) {}

  /**
   * Saga Step 실행 (NATS Request-Reply)
   */
  async executeStep(step: StepDefinition, requestPayload: Record<string, unknown>): Promise<StepResult> {
    const startTime = Date.now();
    const client = this.getClient(step.targetService);

    this.logger.log(`[StepExecutor] Executing ${step.name} → ${step.action}`);

    try {
      if (step.optional) {
        // optional step: fire-and-forget (emit)
        client.emit(step.action, requestPayload);
        const elapsed = Date.now() - startTime;
        this.logger.log(`[StepExecutor] ${step.name} emitted in ${elapsed}ms (optional)`);
        return { success: true, data: {}, elapsedMs: elapsed };
      }

      // Required step: request-reply (send)
      const response = await firstValueFrom(
        client.send(step.action, requestPayload).pipe(
          timeout(step.timeout),
          catchError((err) => {
            this.logger.error(`[StepExecutor] ${step.name} NATS error: ${err.message}`);
            return of({ success: false, error: err.message });
          }),
        ),
      );

      const elapsed = Date.now() - startTime;

      if (response?.success) {
        this.logger.log(`[StepExecutor] ${step.name} SUCCESS in ${elapsed}ms`);
        return { success: true, data: response.data || response, elapsedMs: elapsed };
      }

      const errorMsg = response?.error?.message || response?.error || 'Step execution failed';
      this.logger.warn(`[StepExecutor] ${step.name} FAILED in ${elapsed}ms: ${errorMsg}`);
      return { success: false, error: String(errorMsg), elapsedMs: elapsed };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error(`[StepExecutor] ${step.name} ERROR in ${elapsed}ms: ${error.message}`);
      return { success: false, error: error.message, elapsedMs: elapsed };
    }
  }

  /**
   * 보상 Step 실행
   */
  async executeCompensation(
    compensatePattern: string,
    targetService: string,
    payload: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<StepResult> {
    const startTime = Date.now();
    const client = this.getClient(targetService);

    this.logger.log(`[StepExecutor] Compensating → ${compensatePattern}`);

    try {
      const response = await firstValueFrom(
        client.send(compensatePattern, payload).pipe(
          timeout(timeoutMs),
          catchError((err) => {
            this.logger.error(`[StepExecutor] Compensation ${compensatePattern} error: ${err.message}`);
            return of({ success: false, error: err.message });
          }),
        ),
      );

      const elapsed = Date.now() - startTime;

      if (response?.success) {
        this.logger.log(`[StepExecutor] Compensation ${compensatePattern} SUCCESS in ${elapsed}ms`);
        return { success: true, elapsedMs: elapsed };
      }

      this.logger.warn(`[StepExecutor] Compensation ${compensatePattern} FAILED in ${elapsed}ms`);
      return { success: false, error: response?.error || 'Compensation failed', elapsedMs: elapsed };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error(`[StepExecutor] Compensation ${compensatePattern} ERROR in ${elapsed}ms: ${error.message}`);
      return { success: false, error: error.message, elapsedMs: elapsed };
    }
  }

  private getClient(targetService: string): ClientProxy {
    switch (targetService) {
      case 'BOOKING_SERVICE': return this.bookingClient;
      case 'COURSE_SERVICE': return this.courseClient;
      case 'PAYMENT_SERVICE': return this.paymentClient;
      case 'NOTIFICATION_SERVICE': return this.notificationClient;
      case 'IAM_SERVICE': return this.iamClient;
      default:
        this.logger.warn(`Unknown target service: ${targetService}, falling back to BOOKING_SERVICE`);
        return this.bookingClient;
    }
  }
}
