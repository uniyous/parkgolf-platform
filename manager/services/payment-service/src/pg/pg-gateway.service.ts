import { Injectable, Inject, Logger } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import { NatsResponse } from '@uniyous/nats-common';
import { PgCredentials, PgProviderPort, PgProviderName } from '@uniyous/pg-provider';
import { DrizzleService } from '../db/drizzle.service';
import { pgConfigs } from '../db/schema';
import { AppException, Errors } from '../common/exceptions';
import { PgConfigResolver } from './pg-config.resolver';
import { PgProviderRegistry } from './pg-provider.registry';
import { PG_SECRET_PROVIDER, PgSecretProvider } from './pg-secret.provider';

interface UpsertConfigInput {
  scopeLevel: 'PLATFORM' | 'COMPANY' | 'CLUB';
  companyId?: number;
  clubId?: number;
  provider: PgProviderName;
  secretRef: string;
  baseUrl?: string;
  active?: boolean;
}

/**
 * PG 게이트웨이 — 클럽별 PG 설정 해석 + 자격증명 조립 + 설정 관리(CRUD).
 * 실제 PG 결제 경로(confirm/cancel → payments 기록)는 [3c-ii]에서 이 게이트웨이를 사용.
 */
@Injectable()
export class PgGatewayService {
  private readonly logger = new Logger(PgGatewayService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly resolver: PgConfigResolver,
    private readonly registry: PgProviderRegistry,
    @Inject(PG_SECRET_PROVIDER) private readonly secret: PgSecretProvider,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  /**
   * 클럽 PG 자격증명 + 어댑터 resolve — PG 결제 경로([3c-ii])에서 사용.
   * 시크릿 키는 여기서만 메모리에 존재(저장·로깅·응답 금지).
   */
  async resolveGateway(clubId?: number, companyId?: number): Promise<{ creds: PgCredentials; port: PgProviderPort }> {
    const cfg = await this.resolver.resolve(clubId, companyId);
    if (!cfg) {
      throw new AppException(Errors.Payment.PG_CONFIG_NOT_FOUND, `clubId=${clubId} companyId=${companyId}`);
    }
    const secretKey = await this.secret.getSecret(cfg.secretRef);
    const port = this.registry.get(cfg.provider);
    const testBypass =
      (process.env.TOSS_TEST_BYPASS ?? '').toLowerCase() === 'true' && process.env.NODE_ENV !== 'production';
    return {
      creds: { provider: cfg.provider, secretKey, baseUrl: cfg.baseUrl ?? undefined, testBypass },
      port,
    };
  }

  // ===== pg_configs 관리 (manager-bff) — secretRef(이름)만 노출, 실제 키는 절대 노출 X =====

  async resolveConfig(clubId?: number, companyId?: number) {
    const cfg = await this.resolver.resolve(clubId, companyId);
    if (!cfg) return NatsResponse.success({ error: 'PG config not found' });
    return NatsResponse.success(cfg);
  }

  async listConfigs() {
    const rows = await this.db.select().from(pgConfigs).orderBy(desc(pgConfigs.updatedAt));
    return NatsResponse.success(rows);
  }

  async upsertConfig(input: UpsertConfigInput) {
    const [row] = await this.db
      .insert(pgConfigs)
      .values({
        scopeLevel: input.scopeLevel,
        companyId: input.companyId,
        clubId: input.clubId,
        provider: input.provider,
        secretRef: input.secretRef,
        baseUrl: input.baseUrl,
        active: input.active ?? true,
      })
      .onConflictDoUpdate({
        target: [pgConfigs.scopeLevel, pgConfigs.companyId, pgConfigs.clubId],
        set: {
          provider: input.provider,
          secretRef: input.secretRef,
          baseUrl: input.baseUrl,
          active: input.active ?? true,
          updatedAt: new Date(),
        },
      })
      .returning();
    this.logger.log(`[PgConfig] upserted: scope=${input.scopeLevel} club=${input.clubId} provider=${input.provider}`);
    return NatsResponse.success(row);
  }
}
