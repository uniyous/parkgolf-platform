import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Drizzle + postgres-js DB 제공자. PrismaService 대체 (UNI-82).
 * `this.db`로 쿼리. 전 서비스 전환의 DI 레퍼런스.
 */
@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DrizzleService.name);
  private readonly client: postgres.Sql;
  readonly db: PostgresJsDatabase<typeof schema>;

  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL') ?? process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    this.client = postgres(url, { max: 10 });
    this.db = drizzle(this.client, { schema });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureSchema();
    this.logger.log('agent_db connected (drizzle/postgres-js)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.end();
  }

  /**
   * 임시 schema 부트스트랩 — drizzle-kit 정식 도입 전까지.
   * IF NOT EXISTS로 idempotent. 다중 pod 동시 실행 안전.
   */
  private async ensureSchema(): Promise<void> {
    try {
      await this.client.unsafe(`
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
      await this.client.unsafe(
        `CREATE INDEX IF NOT EXISTS "user_memory_updated_at_idx" ON "user_memory"("updated_at");`,
      );
      this.logger.log('Schema ensured: user_memory');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.warn(`ensureSchema warning: ${msg}`);
    }
  }
}
