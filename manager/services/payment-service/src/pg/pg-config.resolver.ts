import { Injectable } from '@nestjs/common';
import { and, eq, asc } from 'drizzle-orm';
import type { PgProviderName } from '@uniyous/pg-provider';
import { DrizzleService } from '../db/drizzle.service';
import { pgConfigs } from '../db/schema';

export type PgScope = 'PLATFORM' | 'COMPANY' | 'CLUB';

export interface PgConfigResolved {
  id: number;
  scopeLevel: PgScope;
  provider: PgProviderName;
  secretRef: string;
  baseUrl: string | null;
  inherited: boolean;
  inheritedFrom: PgScope | null;
}

/**
 * 골프장별 PG 설정 해석 — 정책 resolve 동형(Club → Company → Platform fallback).
 * active=true 인 가장 구체적 스코프 1건을 반환.
 */
@Injectable()
export class PgConfigResolver {
  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async resolve(clubId?: number, companyId?: number): Promise<PgConfigResolved | null> {
    if (clubId) {
      const [row] = await this.db
        .select()
        .from(pgConfigs)
        .where(and(eq(pgConfigs.scopeLevel, 'CLUB'), eq(pgConfigs.clubId, clubId), eq(pgConfigs.active, true)))
        .orderBy(asc(pgConfigs.id))
        .limit(1);
      if (row) return this.toResolved(row, false, null);
    }
    if (companyId) {
      const [row] = await this.db
        .select()
        .from(pgConfigs)
        .where(and(eq(pgConfigs.scopeLevel, 'COMPANY'), eq(pgConfigs.companyId, companyId), eq(pgConfigs.active, true)))
        .orderBy(asc(pgConfigs.id))
        .limit(1);
      if (row) return this.toResolved(row, !!clubId, 'COMPANY');
    }
    const [platform] = await this.db
      .select()
      .from(pgConfigs)
      .where(and(eq(pgConfigs.scopeLevel, 'PLATFORM'), eq(pgConfigs.active, true)))
      .orderBy(asc(pgConfigs.id))
      .limit(1);
    if (platform) return this.toResolved(platform, !!(clubId || companyId), 'PLATFORM');

    return null;
  }

  private toResolved(
    row: typeof pgConfigs.$inferSelect,
    inherited: boolean,
    from: PgScope | null,
  ): PgConfigResolved {
    return {
      id: row.id,
      scopeLevel: row.scopeLevel,
      provider: row.provider,
      secretRef: row.secretRef,
      baseUrl: row.baseUrl,
      inherited,
      inheritedFrom: inherited ? from : null,
    };
  }
}
