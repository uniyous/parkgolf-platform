import { BookingCompletionService } from './booking-completion.service';
import { ConversationService } from './conversation.service';
import { ToolExecutorService } from './tool-executor.service';
import { UserMemoryService } from './user-memory.service';
import { ConversationContext } from '../dto/chat.dto';

/**
 * UNI-36 — L3(Semantic Memory) 단일화 회귀.
 *
 * 검증:
 *  - finalizeBooking 1회 호출 = L3 merge 정확히 1회 (결제수단 무관)
 *  - 1:1 onsite(멤버 없음)도 L3 기록됨 (기존 누락 케이스)
 *  - recordMemory=false 면 L3 미기록 (dutchpay 정산완료 중복 방지)
 *  - clubId 없으면 L3 skip
 *  - COMPLETED 상태 전이
 */
describe('BookingCompletionService — L3 단일화 (UNI-36)', () => {
  let svc: BookingCompletionService;
  let merge: jest.Mock;
  let broadcast: jest.Mock;
  let conv: ConversationService;

  function makeContext(slots: Partial<ConversationContext['slots']>): ConversationContext {
    return {
      conversationId: 'c1',
      userId: 7,
      state: 'BOOKING',
      messages: [],
      slots: { clubId: '42', clubName: '천안CC', date: '2026-06-01', time: '09:00', ...slots },
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } as ConversationContext;
  }

  beforeEach(() => {
    merge = jest.fn(async () => undefined);
    broadcast = jest.fn();
    // in-memory mutate 만 하므로 no-op 스텁으로 충분
    conv = {
      addAssistantMessage: jest.fn(),
      updateSlots: jest.fn((ctx: ConversationContext, slots: Record<string, unknown>) => {
        ctx.slots = { ...ctx.slots, ...slots };
      }),
      setState: jest.fn((ctx: ConversationContext, state: string) => {
        ctx.state = state as ConversationContext['state'];
      }),
    } as unknown as ConversationService;
    const toolExecutor = { broadcastTeamCompleteCard: broadcast } as unknown as ToolExecutorService;
    const userMemory = { mergeBookingResult: merge } as unknown as UserMemoryService;
    svc = new BookingCompletionService(conv, toolExecutor, userMemory);
  });

  const result = { bookingId: 100, bookingNumber: 'BK-100', details: { totalPrice: 40000 } };

  it('onsite 그룹(4명): L3 정확히 1회 + playerCount=4', () => {
    const ctx = makeContext({
      paymentMethod: 'onsite',
      currentTeamMembers: [
        { userId: 7, userName: 'a', userEmail: 'a@e' },
        { userId: 8, userName: 'b', userEmail: 'b@e' },
        { userId: 9, userName: 'c', userEmail: 'c@e' },
        { userId: 10, userName: 'd', userEmail: 'd@e' },
      ],
    });
    svc.finalizeBooking(ctx, result);
    expect(merge).toHaveBeenCalledTimes(1);
    expect(merge.mock.calls[0][0]).toMatchObject({ userId: 7, clubId: 42, playerCount: 4, paymentMethod: 'onsite' });
  });

  it('onsite 1:1(멤버 없음, 비채팅방): L3 기록됨 — 기존 누락 케이스 회귀', () => {
    const ctx = makeContext({ paymentMethod: 'onsite', playerCount: 1 });
    const res = svc.finalizeBooking(ctx, result);
    expect(merge).toHaveBeenCalledTimes(1);
    expect(merge.mock.calls[0][0]).toMatchObject({ clubId: 42, playerCount: 1 });
    // 비채팅방 → 응답에 TEAM_COMPLETE 액션 포함
    expect(res.actions?.[0]?.type).toBe('TEAM_COMPLETE');
    expect(res.state).toBe('COMPLETED');
  });

  it('card: L3 정확히 1회', () => {
    const ctx = makeContext({ paymentMethod: 'card', playerCount: 2 });
    svc.finalizeBooking(ctx, result);
    expect(merge).toHaveBeenCalledTimes(1);
    expect(merge.mock.calls[0][0]).toMatchObject({ paymentMethod: 'card' });
  });

  it('recordMemory=false: L3 미기록 (dutchpay 정산완료 중복 방지)', () => {
    const ctx = makeContext({ paymentMethod: 'dutchpay', chatRoomId: 'room-1' });
    svc.finalizeBooking(ctx, result, false);
    expect(merge).not.toHaveBeenCalled();
  });

  it('clubId 없으면 L3 skip', () => {
    const ctx = makeContext({ clubId: undefined, paymentMethod: 'onsite', playerCount: 1 });
    svc.finalizeBooking(ctx, result);
    expect(merge).not.toHaveBeenCalled();
  });

  it('채팅방 컨텍스트: 브로드캐스트 + 응답엔 actions 제외', () => {
    const ctx = makeContext({ paymentMethod: 'onsite', chatRoomId: 'room-1', playerCount: 1 });
    const res = svc.finalizeBooking(ctx, result);
    expect(broadcast).toHaveBeenCalledTimes(1);
    expect(res.actions).toBeUndefined();
  });

  it('recordBookingMemory(dutchpay 생성시점): L3 1회', () => {
    const ctx = makeContext({
      paymentMethod: 'dutchpay',
      currentTeamMembers: [
        { userId: 7, userName: 'a', userEmail: 'a@e' },
        { userId: 8, userName: 'b', userEmail: 'b@e' },
      ],
    });
    svc.recordBookingMemory(ctx);
    expect(merge).toHaveBeenCalledTimes(1);
    expect(merge.mock.calls[0][0]).toMatchObject({ paymentMethod: 'dutchpay', playerCount: 2 });
  });
});
