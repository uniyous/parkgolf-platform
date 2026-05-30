import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.connectWithRetry(3, 2000);
    await this.ensureSchema();
  }

  /**
   * 임시 schema 초기화 — prisma migration 시스템 정식 도입 전까지.
   * IF NOT EXISTS로 idempotent. 다중 pod 동시 실행해도 안전 (PostgreSQL이 처리).
   * 추후 prisma migrate deploy entrypoint로 전환 권장.
   */
  private async ensureSchema(): Promise<void> {
    try {
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "user_memory" (
          "user_id"            INTEGER     NOT NULL PRIMARY KEY,
          "preferences"        JSONB,
          "favoriteClubs"      JSONB,
          "frequentTeammates"  JSONB,
          "recentSummary"      TEXT,
          "enabled"            BOOLEAN     NOT NULL DEFAULT true,
          "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "user_memory_updated_at_idx" ON "user_memory"("updated_at");`,
      );
      this.logger.log('Schema ensured: user_memory');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.warn(`ensureSchema warning: ${msg}`);
      // 부팅 흐름엔 영향 주지 않음 (실제 사용 시 에러 발생할 것)
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async connectWithRetry(maxRetries: number, delayMs: number) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const connectPromise = this.$connect();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database connection timeout (15s)')), 15000),
        );
        await Promise.race([connectPromise, timeoutPromise]);
        this.logger.log('agent_db connected');
        return;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'unknown';
        this.logger.warn(`DB connection attempt ${attempt}/${maxRetries} failed: ${msg}`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          throw error;
        }
      }
    }
  }
}
