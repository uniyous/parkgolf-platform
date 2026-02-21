import { Injectable, Logger } from '@nestjs/common';
import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';
import {
  ConversationContext,
  ConversationMessage,
  ConversationState,
  BookingSlots,
} from '../dto/chat.dto';

/**
 * 대화 관리 서비스
 * 메모리 캐시 기반 세션 관리
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private readonly cache: NodeCache;

  // 캐시 설정
  private readonly TTL_SECONDS = 30 * 60; // 30분
  private readonly CHECK_PERIOD = 60; // 1분마다 만료 체크

  constructor() {
    this.cache = new NodeCache({
      stdTTL: this.TTL_SECONDS,
      checkperiod: this.CHECK_PERIOD,
      useClones: true,
    });

    this.cache.on('expired', (key: string) => {
      this.logger.debug(`Conversation expired: ${key}`);
    });
  }

  /**
   * 새 대화 생성
   */
  create(userId: number): ConversationContext {
    const conversationId = uuidv4();
    const context: ConversationContext = {
      conversationId,
      userId,
      state: 'IDLE',
      messages: [],
      slots: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.cache.set(this.getKey(userId, conversationId), context);
    this.logger.log(`Created conversation: ${conversationId} for user: ${userId}`);

    return context;
  }

  /**
   * 대화 조회
   */
  get(userId: number, conversationId: string): ConversationContext | null {
    const context = this.cache.get<ConversationContext>(this.getKey(userId, conversationId));
    return context || null;
  }

  /**
   * 대화 조회 또는 생성
   */
  getOrCreate(userId: number, conversationId?: string): ConversationContext {
    if (conversationId) {
      const existing = this.get(userId, conversationId);
      if (existing) {
        return existing;
      }
      this.logger.warn(`Conversation not found: ${conversationId}, creating new`);
    }

    return this.create(userId);
  }

  /**
   * 대화 업데이트
   */
  update(context: ConversationContext): void {
    context.updatedAt = new Date();
    this.cache.set(this.getKey(context.userId, context.conversationId), context);
  }

  /**
   * 사용자 메시지 추가
   */
  addUserMessage(context: ConversationContext, content: string): void {
    context.messages.push({
      role: 'user',
      content,
      timestamp: new Date(),
    });
    this.update(context);
  }

  /**
   * 어시스턴트 메시지 추가
   */
  addAssistantMessage(context: ConversationContext, content: string): void {
    context.messages.push({
      role: 'assistant',
      content,
      timestamp: new Date(),
    });
    this.update(context);
  }

  /**
   * 상태 변경
   */
  setState(context: ConversationContext, state: ConversationState): void {
    context.state = state;
    this.update(context);
  }

  /**
   * 슬롯 업데이트
   */
  updateSlots(context: ConversationContext, slots: Partial<BookingSlots>): void {
    context.slots = { ...context.slots, ...slots };
    this.update(context);
  }

  /**
   * 슬롯 초기화
   */
  clearSlots(context: ConversationContext): void {
    context.slots = {};
    this.update(context);
  }

  /**
   * 대화 리셋
   */
  reset(userId: number, conversationId: string): ConversationContext {
    this.cache.del(this.getKey(userId, conversationId));
    return this.create(userId);
  }

  /**
   * 대화 삭제
   */
  delete(userId: number, conversationId: string): boolean {
    return this.cache.del(this.getKey(userId, conversationId)) > 0;
  }

  /**
   * 최근 메시지 조회 (LLM 컨텍스트용)
   */
  getRecentMessages(
    context: ConversationContext,
    limit: number = 20,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    return context.messages.slice(-limit).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * 캐시 키 생성
   */
  private getKey(userId: number, conversationId: string): string {
    return `conv:${userId}:${conversationId}`;
  }

  /**
   * 통계 조회 (디버깅용)
   */
  getStats(): { keys: number; hits: number; misses: number } {
    const stats = this.cache.getStats();
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
    };
  }
}
