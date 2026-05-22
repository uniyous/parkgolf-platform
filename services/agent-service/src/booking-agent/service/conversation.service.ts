import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import type Redis from 'ioredis';
import {
  ConversationContext,
  ConversationState,
  BookingSlots,
} from '../dto/chat.dto';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

/**
 * 대화 컨텍스트 관리 (Redis 기반 Working Memory).
 *
 * 설계: docs/workflow/AGENT_MEMORY.md §3 (Layer 1)
 *
 * 키 패턴:
 *   - agent:conv:{userId}:{convId}   String(JSON), TTL 30분
 *   - lock:conv:{userId}:{convId}    String(token), TTL 8초
 *
 * 사용 패턴 (배치 저장):
 *   1. await withLock(userId, convId, async () => {
 *   2.   const ctx = await loadOrCreate(userId, convId)
 *   3.   ... (in-memory mutate: addUserMessage / setState / updateSlots)
 *   4.   await save(ctx)
 *   5. });
 *
 * - 기존 sync 메서드(updateSlots/setState/addAssistantMessage 등)는 메모리 상 ctx만 변경.
 *   Redis 쓰기는 chat 진입점에서 1회 (save) 처리 → 호출부 변경 최소.
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private readonly ttlSeconds: number;
  private readonly lockTtlMs: number;
  private readonly maxHistoryTurns: number;

  // Lua: token 일치할 때만 DEL — 다른 pod 만료/실수 해제 차단
  private static readonly UNLOCK_LUA = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `.trim();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.ttlSeconds = this.configService.get<number>('CONVERSATION_TTL') ?? 1800;
    this.lockTtlMs = this.configService.get<number>('CONVERSATION_LOCK_TTL_MS') ?? 8000;
    this.maxHistoryTurns = this.configService.get<number>('MAX_HISTORY_TURNS') ?? 10;
    this.logger.log(
      `Redis working memory: conv TTL=${this.ttlSeconds}s, lock TTL=${this.lockTtlMs}ms, max turns=${this.maxHistoryTurns}`,
    );
  }

  // ─── Redis ops (async) ──────────────────────────────────────

  /**
   * 컨텍스트 로드. 없으면 신규 생성 (Redis에는 아직 저장 안 함 — save 호출 시 persist).
   */
  async loadOrCreate(userId: number, conversationId?: string): Promise<ConversationContext> {
    const id = conversationId ?? uuidv4();
    if (conversationId) {
      const existing = await this.load(userId, conversationId);
      if (existing) return existing;
      this.logger.warn(`Conversation not found: ${conversationId}, creating new`);
    }
    return this.createInMemory(userId, id);
  }

  /** Redis에서 컨텍스트 로드 (없으면 null) */
  async load(userId: number, conversationId: string): Promise<ConversationContext | null> {
    const raw = await this.redis.get(this.getKey(userId, conversationId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as ConversationContext;
      // 직렬화/역직렬화 후 Date 필드 복원
      parsed.createdAt = new Date(parsed.createdAt);
      parsed.updatedAt = new Date(parsed.updatedAt);
      for (const m of parsed.messages) m.timestamp = new Date(m.timestamp);
      return parsed;
    } catch (err: unknown) {
      this.logger.error(`Failed to parse context for ${conversationId}: ${err instanceof Error ? err.message : 'unknown'}`);
      return null;
    }
  }

  /** Redis에 컨텍스트 저장 + TTL 갱신 */
  async save(context: ConversationContext): Promise<void> {
    context.updatedAt = new Date();
    await this.redis.set(
      this.getKey(context.userId, context.conversationId),
      JSON.stringify(context),
      'EX',
      this.ttlSeconds,
    );
  }

  /** 단일 대화 삭제 */
  async delete(userId: number, conversationId: string): Promise<boolean> {
    const n = await this.redis.del(this.getKey(userId, conversationId));
    return n > 0;
  }

  /** 사용자의 모든 대화 삭제 (계정 삭제 정책용, SCAN 기반 안전 삭제) */
  async deleteAllByUser(userId: number): Promise<number> {
    const pattern = `agent:conv:${userId}:*`;
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) {
        deleted += await this.redis.del(...keys);
      }
    } while (cursor !== '0');
    return deleted;
  }

  /** 대화 리셋 — 기존 삭제 후 신규 메모리 컨텍스트 반환 (호출자가 save 책임) */
  async reset(userId: number, conversationId?: string): Promise<ConversationContext> {
    if (conversationId) {
      await this.delete(userId, conversationId);
    }
    return this.createInMemory(userId, uuidv4());
  }

  // ─── 분산 락 (per-conversation) ─────────────────────────────

  /**
   * 같은 conversationId 동시 처리 직렬화. multi-pod 안전성 보장.
   *
   * @throws ConversationBusyError — 락 획득 실패 시 (다른 pod가 처리 중)
   */
  async withLock<T>(
    userId: number,
    conversationId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const lockKey = this.getLockKey(userId, conversationId);
    const token = uuidv4();
    const acquired = await this.redis.set(lockKey, token, 'PX', this.lockTtlMs, 'NX');
    if (acquired !== 'OK') {
      throw new ConversationBusyError(userId, conversationId);
    }
    try {
      return await fn();
    } finally {
      try {
        await this.redis.eval(ConversationService.UNLOCK_LUA, 1, lockKey, token);
      } catch (err: unknown) {
        this.logger.warn(
          `Unlock failed for ${lockKey}: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }
  }

  // ─── In-memory mutate (sync, save 시 persist) ────────────────

  addUserMessage(context: ConversationContext, content: string): void {
    context.messages.push({ role: 'user', content, timestamp: new Date() });
    context.updatedAt = new Date();
  }

  addAssistantMessage(context: ConversationContext, content: string): void {
    context.messages.push({ role: 'assistant', content, timestamp: new Date() });
    context.updatedAt = new Date();
  }

  setState(context: ConversationContext, state: ConversationState): void {
    context.state = state;
    context.updatedAt = new Date();
  }

  updateSlots(context: ConversationContext, slots: Partial<BookingSlots>): void {
    context.slots = { ...context.slots, ...slots };
    context.updatedAt = new Date();
  }

  clearSlots(context: ConversationContext): void {
    context.slots = {};
    context.updatedAt = new Date();
  }

  /** 최근 메시지 조회 (LLM 컨텍스트용) */
  getRecentMessages(
    context: ConversationContext,
    limit?: number,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const max = limit ?? this.maxHistoryTurns * 2;
    return context.messages.slice(-max).map((m) => ({ role: m.role, content: m.content }));
  }

  // ─── 통계 (디버깅) ────────────────────────────────────────

  /** Redis 키 수 / 메모리 사용량 (간이) */
  async getStats(): Promise<{ keys: number; pattern: string }> {
    const pattern = 'agent:conv:*';
    let cursor = '0';
    let count = 0;
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
      cursor = next;
      count += keys.length;
    } while (cursor !== '0');
    return { keys: count, pattern };
  }

  // ─── 내부 ─────────────────────────────────────────────────

  private getKey(userId: number, conversationId: string): string {
    return `agent:conv:${userId}:${conversationId}`;
  }

  private getLockKey(userId: number, conversationId: string): string {
    return `lock:conv:${userId}:${conversationId}`;
  }

  private createInMemory(userId: number, conversationId: string): ConversationContext {
    return {
      conversationId,
      userId,
      state: 'IDLE',
      messages: [],
      slots: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * 같은 conversationId가 다른 pod 또는 다른 요청에서 처리 중일 때 발생.
 * user-api는 4xx 또는 짧은 retry로 처리 권장.
 */
export class ConversationBusyError extends Error {
  constructor(public readonly userId: number, public readonly conversationId: string) {
    super(`Conversation ${conversationId} for user ${userId} is busy (another request is processing)`);
    this.name = 'ConversationBusyError';
  }
}
