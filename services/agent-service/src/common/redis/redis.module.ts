import { Global, Module, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * Global Redis module — agent-service Working Memory (ConversationContext + per-conv lock)용.
 * 설계: docs/workflow/AGENT_MEMORY.md §3
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const logger = new Logger('RedisClient');
        const url = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
        const client = new Redis(url, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: false,
          retryStrategy: (times) => Math.min(times * 200, 2000),
        });
        client.on('connect', () => logger.log(`Connected: ${url}`));
        client.on('error', (err: Error) => logger.error(`Redis error: ${err.message}`));
        client.on('reconnecting', (ms: number) => logger.warn(`Reconnecting in ${ms}ms`));
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor() {}
  async onApplicationShutdown() {
    // ioredis는 process exit 시 자동 cleanup. 별도 처리 불필요.
  }
}
