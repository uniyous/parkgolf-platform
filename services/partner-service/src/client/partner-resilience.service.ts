import { Injectable, Logger } from '@nestjs/common';
import * as CircuitBreaker from 'opossum';
import pRetry from 'p-retry';

@Injectable()
export class PartnerResilienceService {
  private readonly logger = new Logger(PartnerResilienceService.name);
  private breakers = new Map<number, CircuitBreaker>();

  /**
   * 서킷 브레이커 + 재시도가 적용된 API 호출
   */
  async call<T>(
    partnerId: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const breaker = this.getBreaker(partnerId);

    return breaker.fire(async () => {
      return pRetry(fn, {
        retries: 2,
        minTimeout: 1000,
        maxTimeout: 5000,
        onFailedAttempt: (error) => {
          this.logger.warn(
            `Partner ${partnerId} API 재시도 ${error.attemptNumber}/${error.retriesLeft + error.attemptNumber}: ${error.message}`,
          );
        },
      });
    }) as Promise<T>;
  }

  /**
   * 특정 파트너의 서킷 상태 조회
   */
  getStatus(partnerId: number): { state: string; stats: Record<string, unknown> } | null {
    const breaker = this.breakers.get(partnerId);
    if (!breaker) return null;

    return {
      state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: {
        successes: breaker.stats.successes,
        failures: breaker.stats.failures,
        rejects: breaker.stats.rejects,
        timeouts: breaker.stats.timeouts,
      },
    };
  }

  private getBreaker(partnerId: number): CircuitBreaker {
    if (!this.breakers.has(partnerId)) {
      const breaker = new CircuitBreaker(async (fn: () => Promise<unknown>) => fn(), {
        timeout: 15_000,
        errorThresholdPercentage: 50,
        resetTimeout: 60_000,
        volumeThreshold: 5,
      });

      breaker.on('open', () => {
        this.logger.error(`Partner ${partnerId} circuit OPEN`);
      });
      breaker.on('halfOpen', () => {
        this.logger.warn(`Partner ${partnerId} circuit HALF-OPEN`);
      });
      breaker.on('close', () => {
        this.logger.log(`Partner ${partnerId} circuit CLOSED`);
      });

      this.breakers.set(partnerId, breaker);
    }

    return this.breakers.get(partnerId)!;
  }
}
