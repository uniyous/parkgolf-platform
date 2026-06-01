import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ToolExecutorService, ToolResult } from './tool-executor.service';
import { TurnJournalService } from './turn-journal.service';

/**
 * Effect Executor — 부수효과(saga 시작)의 **유일한 진입점** (UNI-34).
 *
 * 설계: docs/workflow/AGENT.md §14 (재개/Resume), UNI-29 Phase 3
 *
 * 책임:
 *  1. create_booking saga 호출을 한 곳으로 수렴 (direct-action-handler만 호출)
 *  2. Turn Journal 기록 → 재진입 시 멱등 (COMMITTED 캐시 반환, saga 재호출 생략)
 *
 * read-only(query) 도구는 여기를 거치지 않는다(tool-executor 직접).
 *
 * L3(Semantic Memory) 기록은 booking-completion.finalizeBooking 단 1곳으로 단일화됨 (UNI-36).
 * effect-executor 는 saga 시작/멱등만 담당하고 L3 는 관여하지 않는다.
 */

export interface CommitBookingParams {
  conversationId: string;
  userId: number;
  userName?: string;
  userEmail?: string;
  slotId: number;
  playerCount: number;
  paymentMethod: string;
  teamMembers?: Array<{ userId: number; userName?: string; userEmail?: string }>;
  chatRoomId?: string;
}

@Injectable()
export class EffectExecutorService {
  private readonly logger = new Logger(EffectExecutorService.name);

  constructor(
    private readonly toolExecutor: ToolExecutorService,
    private readonly journal: TurnJournalService,
  ) {}

  /**
   * 예약 생성(saga) — 멱등 + 저널 기록.
   * 같은 (conversation, 예약 의도) 재진입은 COMMITTED 캐시를 반환해 saga를 재호출하지 않는다.
   */
  async commitBooking(params: CommitBookingParams): Promise<ToolResult> {
    const runId = params.conversationId;
    const stepId = this.stepId(params);

    // 1) resume — 이미 확정된 동일 예약이면 saga 재호출 없이 캐시 반환
    const existing = await this.journal.get(runId, stepId);
    if (existing?.status === 'COMMITTED') {
      this.logger.log(`[journal] hit ${runId}/${stepId} — saga 재호출 생략 (멱등)`);
      return existing.result as ToolResult;
    }

    // 2) 진입 표시 (PENDING) — 크래시 후 재진입 시 같은 idemKey로 재시도(saga가 dedup)
    await this.journal.put(runId, stepId, { status: 'PENDING', idemKey: stepId });

    // 3) saga 호출 (create_booking 은 내부에서 결정적 idempotencyKey 생성 — P1)
    const toolResult = await this.toolExecutor.execute({
      name: 'create_booking',
      args: {
        userId: params.userId,
        userName: params.userName,
        userEmail: params.userEmail,
        gameTimeSlotId: params.slotId,
        playerCount: params.playerCount,
        paymentMethod: params.paymentMethod,
        teamMembers: params.teamMembers,
        chatRoomId: params.chatRoomId,
      },
    });

    const result = toolResult.result as { success?: boolean } | null;

    // 4) 성공 시에만 COMMITTED 기록 (실패는 PENDING 유지 → 재시도 허용)
    if (toolResult.success && result?.success) {
      await this.journal.put(runId, stepId, {
        status: 'COMMITTED',
        idemKey: stepId,
        result: toolResult,
      });
    }

    return toolResult;
  }

  /**
   * 예약 의도의 결정적 식별자 — 같은 의도면 같은 stepId.
   * booking.tools 의 idempotencyKey 와 동일 입력(슬롯·사용자·인원·결제수단)을 사용해
   * journal 식별과 saga dedup 의도가 일치하도록 한다.
   */
  private stepId(params: CommitBookingParams): string {
    const raw = `booking:${params.userId}:${params.slotId}:${params.playerCount}:${params.paymentMethod}`;
    return createHash('sha256').update(raw).digest('hex').slice(0, 32);
  }
}
