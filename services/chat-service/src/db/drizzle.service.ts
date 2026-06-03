import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Drizzle + postgres-js DB 제공자 (UNI-83). PrismaService 대체.
 * chat_db는 마이그레이션 보유 → ensureSchema 없이 연결만 (DB 무변경).
 * `this.db`로 쿼리, 관계 조회는 `this.db.query.*` (with).
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
    await this.client`SELECT 1`;
    this.logger.log('chat_db connected (drizzle/postgres-js)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.end();
  }

  /** health/ready용 연결성 체크 */
  async ping(): Promise<void> {
    await this.client`SELECT 1`;
  }
}
