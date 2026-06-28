import { Injectable, Inject, Logger } from '@nestjs/common';
import { and, eq, isNull, desc } from 'drizzle-orm';
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

export interface ResolvedGateway {
  creds: PgCredentials;
  port: PgProviderPort;
  configId: number;
}

/**
 * PG 게이트웨이 — 클럽별 PG 설정 해석 + 자격증명 조립 + 설정 관리(CRUD).
 * 실제 PG 결제 경로(confirm/cancel → payments 기록)는 PgPaymentService가 이 게이트웨이를 사용.
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

  private testBypassEnabled(): boolean {
    return (process.env.TOSS_TEST_BYPASS ?? '').toLowerCase() === 'true' && process.env.NODE_ENV !== 'production';
  }

  /** 시크릿 키는 여기서만 메모리에 존재(저장·로깅·응답 금지). */
  private async buildGateway(cfg: {
    id: number;
    provider: PgProviderName;
    secretRef: string;
    baseUrl: string | null;
  }): Promise<ResolvedGateway> {
    const secretKey = await this.secret.getSecret(cfg.secretRef);
    const port = this.registry.get(cfg.provider);
    return {
      creds: { provider: cfg.provider, secretKey, baseUrl: cfg.baseUrl ?? undefined, testBypass: this.testBypassEnabled() },
      port,
      configId: cfg.id,
    };
  }

  /** 클럽 PG 해석(confirm 시) — Club→Company→Platform fallback */
  async resolveGateway(clubId?: number, companyId?: number): Promise<ResolvedGateway> {
    const cfg = await this.resolver.resolve(clubId, companyId);
    if (!cfg) {
      throw new AppException(Errors.Payment.PG_CONFIG_NOT_FOUND, `clubId=${clubId} companyId=${companyId}`);
    }
    return this.buildGateway(cfg);
  }

  /** 결제 시 사용한 config 그대로(cancel 시) — active 무관, 동일 PG 계정 고정 */
  async gatewayForConfig(configId: number): Promise<ResolvedGateway> {
    const [cfg] = await this.db.select().from(pgConfigs).where(eq(pgConfigs.id, configId)).limit(1);
    if (!cfg) {
      throw new AppException(Errors.Payment.PG_CONFIG_NOT_FOUND, `configId=${configId}`);
    }
    return this.buildGateway(cfg);
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

  /** find-then-update/insert — ON CONFLICT는 NULL 스코프(PLATFORM)에서 미작동하므로 명시 분기 */
  async upsertConfig(input: UpsertConfigInput) {
    const existing = await this.findExact(input.scopeLevel, input.companyId, input.clubId);
    if (existing) {
      const [row] = await this.db
        .update(pgConfigs)
        .set({
          provider: input.provider,
          secretRef: input.secretRef,
          baseUrl: input.baseUrl,
          active: input.active ?? true,
          updatedAt: new Date(),
        })
        .where(eq(pgConfigs.id, existing.id))
        .returning();
      this.logger.log(`[PgConfig] updated: scope=${input.scopeLevel} club=${input.clubId} provider=${input.provider}`);
      return NatsResponse.success(row);
    }
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
      .returning();
    this.logger.log(`[PgConfig] inserted: scope=${input.scopeLevel} club=${input.clubId} provider=${input.provider}`);
    return NatsResponse.success(row);
  }

  private async findExact(scopeLevel: 'PLATFORM' | 'COMPANY' | 'CLUB', companyId?: number, clubId?: number) {
    const [row] = await this.db
      .select()
      .from(pgConfigs)
      .where(
        and(
          eq(pgConfigs.scopeLevel, scopeLevel),
          companyId != null ? eq(pgConfigs.companyId, companyId) : isNull(pgConfigs.companyId),
          clubId != null ? eq(pgConfigs.clubId, clubId) : isNull(pgConfigs.clubId),
        ),
      )
      .limit(1);
    return row;
  }
}
