import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  timeout: number;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

@Injectable()
export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);
  private failures = 0;
  private lastFailureTime?: Date;
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;

  constructor(
    private readonly options: CircuitBreakerOptions = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      timeout: 5000, // 5 seconds
    },
  ) {}

  async execute<T>(fn: () => Promise<T>, serviceName?: string): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.logger.log(`Circuit breaker attempting reset for ${serviceName || 'service'}`);
        this.state = CircuitBreakerState.HALF_OPEN;
      } else {
        this.logger.warn(`Circuit breaker is OPEN for ${serviceName || 'service'}`);
        throw new ServiceUnavailableException({
          code: 'SYS_004',
          message: `Service ${serviceName || 'external service'} is temporarily unavailable`,
          details: {
            state: this.state,
            failures: this.failures,
            lastFailureTime: this.lastFailureTime,
          },
        });
      }
    }

    try {
      // Execute with timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Circuit breaker timeout')), this.options.timeout)
        ),
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(serviceName);
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime.getTime() >= this.options.resetTimeout;
  }

  private onSuccess(): void {
    this.failures = 0;
    this.lastFailureTime = undefined;
    this.state = CircuitBreakerState.CLOSED;
  }

  private onFailure(serviceName?: string): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.failures >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.logger.error(
        `Circuit breaker opened for ${serviceName || 'service'} after ${this.failures} failures`
      );
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = undefined;
    this.state = CircuitBreakerState.CLOSED;
  }
}