import { EffectExecutorService } from './effect-executor.service';
import { ToolExecutorService, ToolResult } from './tool-executor.service';
import { TurnJournalService, JournalEntry } from './turn-journal.service';

/**
 * UNI-34 (P3) — effect-executor saga 게이트 + journal resume 멱등 검증.
 */
describe('EffectExecutorService — saga 게이트 + journal resume (UNI-34)', () => {
  let effect: EffectExecutorService;
  let toolExecutor: { execute: jest.Mock };
  let journalStore: Map<string, JournalEntry>;
  let journal: jest.Mocked<Pick<TurnJournalService, 'get' | 'put'>>;

  const baseParams = {
    conversationId: 'conv-1',
    userId: 7,
    slotId: 42,
    playerCount: 4,
    paymentMethod: 'onsite',
  };

  const okResult: ToolResult = {
    name: 'create_booking',
    success: true,
    result: { success: true, status: 'CONFIRMED', bookingId: 100 },
  };

  beforeEach(() => {
    journalStore = new Map();
    toolExecutor = {
      execute: jest.fn(async () => okResult),
    };
    journal = {
      get: jest.fn(async (runId: string, stepId: string) => journalStore.get(`${runId}:${stepId}`) ?? null),
      put: jest.fn(async (runId: string, stepId: string, entry: Omit<JournalEntry, 'updatedAt'>) => {
        journalStore.set(`${runId}:${stepId}`, { ...entry, updatedAt: 'now' });
      }),
    };
    effect = new EffectExecutorService(
      toolExecutor as unknown as ToolExecutorService,
      journal as unknown as TurnJournalService,
    );
  });

  it('정상 예약: saga 1회 호출 + COMMITTED 기록', async () => {
    const r = await effect.commitBooking({ ...baseParams });
    expect(r).toEqual(okResult);
    expect(toolExecutor.execute).toHaveBeenCalledTimes(1);
    // PENDING → COMMITTED 두 번 기록
    expect(journal.put).toHaveBeenCalledTimes(2);
    const committed = [...journalStore.values()].find((e) => e.status === 'COMMITTED');
    expect(committed).toBeTruthy();
  });

  it('resume: 동일 의도 재진입 시 saga 재호출 없이 캐시 반환 (멱등)', async () => {
    await effect.commitBooking({ ...baseParams }); // 1st: COMMITTED 기록
    toolExecutor.execute.mockClear();

    const r2 = await effect.commitBooking({ ...baseParams }); // 2nd: 캐시 hit
    expect(r2).toEqual(okResult);
    expect(toolExecutor.execute).not.toHaveBeenCalled(); // saga 재호출 없음
  });

  it('saga 실패: COMMITTED 기록 안 함 → 재시도 시 다시 호출', async () => {
    toolExecutor.execute.mockResolvedValueOnce({
      name: 'create_booking',
      success: true,
      result: { success: false, message: '슬롯 마감' },
    } as ToolResult);

    await effect.commitBooking({ ...baseParams });
    const committed = [...journalStore.values()].find((e) => e.status === 'COMMITTED');
    expect(committed).toBeUndefined(); // 실패는 PENDING 유지

    // 재시도 → saga 다시 호출됨
    toolExecutor.execute.mockClear();
    await effect.commitBooking({ ...baseParams });
    expect(toolExecutor.execute).toHaveBeenCalledTimes(1);
  });

  it('다른 예약 의도는 다른 stepId → 독립 처리', async () => {
    await effect.commitBooking({ ...baseParams, slotId: 42 });
    await effect.commitBooking({ ...baseParams, slotId: 99 });
    expect(toolExecutor.execute).toHaveBeenCalledTimes(2);
    expect(journalStore.size).toBe(2);
  });
});
