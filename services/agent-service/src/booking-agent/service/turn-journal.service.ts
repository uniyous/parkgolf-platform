import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

/**
 * Turn Journal — 부수효과(Effect) 스텝의 append-only 기록 + resume (UNI-34).
 *
 * 설계: docs/architecture/agent-orchestration.md, UNI-29 Tier 1
 *
 * - 키: `agent:journal:{runId}` (Redis Hash, field = stepId)
 * - 값: JournalEntry(JSON) — status(PENDING|COMMITTED) + idemKey + result
 * - TTL: conversation 스냅샷과 동일(기본 1800s) — 미완 턴이 영구 잔류하지 않도록
 *
 * 용도(Tier 1): create_booking 같은 비가역 작업만 기록.
 *   - COMMITTED: 결과 캐시 → 재진입 시 saga 재호출 없이 캐시 반환
 *   - PENDING  : 진입했으나 미완 → 같은 idemKey로 재시도(saga-service가 dedup)
 *
 * read-only(query) 스텝은 기록하지 않는다(재실행 안전).
 */

export type JournalStatus = 'PENDING' | 'COMMITTED';

export interface JournalEntry {
  status: JournalStatus;
  idemKey: string;
  result?: unknown;
  updatedAt: string;
}

@Injectable()
export class TurnJournalService {
  private readonly logger = new Logger(TurnJournalService.name);
  private readonly ttlSeconds: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    // conversation 스냅샷과 동일 TTL 재사용 (별도 인프라 없음)
    this.ttlSeconds = this.configService.get<number>('CONVERSATION_TTL') ?? 1800;
  }

  /** Effect 스텝 조회. 없으면 null. */
  async get(runId: string, stepId: string): Promise<JournalEntry | null> {
    const raw = await this.redis.hget(this.key(runId), stepId);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as JournalEntry;
    } catch (err: unknown) {
      // 파싱 실패는 캐시 없음으로 강등(정상 실행 경로로 폴백) — 단 가시화.
      this.logger.warn(
        `Journal entry parse failed (${runId}/${stepId}): ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return null;
    }
  }

  /** Effect 스텝 기록 + TTL 갱신. */
  async put(
    runId: string,
    stepId: string,
    entry: Omit<JournalEntry, 'updatedAt'>,
  ): Promise<void> {
    const key = this.key(runId);
    const value: JournalEntry = { ...entry, updatedAt: new Date().toISOString() };
    await this.redis.hset(key, stepId, JSON.stringify(value));
    // 매 기록마다 TTL 재설정 — 활성 턴은 살아있고, 방치된 저널은 자연 만료.
    await this.redis.expire(key, this.ttlSeconds);
  }

  /** 턴 저널 전체 삭제 (필요 시). */
  async clear(runId: string): Promise<void> {
    await this.redis.del(this.key(runId));
  }

  private key(runId: string): string {
    return `agent:journal:${runId}`;
  }
}
