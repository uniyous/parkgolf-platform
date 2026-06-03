import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type DrizzleDb = PostgresJsDatabase<typeof schema>;
/** db.transaction 콜백의 tx 타입 */
export type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DrizzleService.name);
  private readonly client: postgres.Sql;
  readonly db: DrizzleDb;

  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL') ?? process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    this.client = postgres(url, { max: 10 });
    this.db = drizzle(this.client, { schema });
  }

  async onModuleInit(): Promise<void> {
    await this.client`SELECT 1`;
    this.logger.log('booking_db connected (drizzle/postgres-js)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.end();
  }

  async ping(): Promise<void> {
    await this.client`SELECT 1`;
  }
}
