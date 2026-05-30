// 이 spec은 dutch-happy-path.spec.ts 로 대체됨 (Phase 3 적용 후 정공 흐름).
// 옛 위젯 자동화 placeholder는 더 이상 사용하지 않음. 본 파일은 시나리오 인벤토리만 보존.
import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import { createE2EUser, E2EUser } from '../../fixtures/users';

/**
 * 더치페이 (split payment) E2E
 *
 * 흐름 (channel = 채팅방 4명)
 *   1. 4명 user 생성 + 로그인 → 토큰
 *   2. user-1 채팅방 생성 + 다른 3명 멤버 추가
 *   3. user-1 AI 에이전트에게 "더치페이로 예약" 명령 → splitPrepare
 *   4. settlement 카드 broadcast 검증 → 4 orderId 발급
 *   5. 각자 e2e_test_* paymentKey로 confirmSplit (토스 우회 — TOSS_TEST_BYPASS)
 *   6. 마지막 confirm 후 PAYMENT_CONFIRMED saga 트리거
 *   7. booking.status = CONFIRMED 검증
 *
 * 현재 상태
 *   ─ 토스 confirm 우회: payment-service에 TOSS_TEST_BYPASS 분기 적용 ✅
 *     (tests/payment/single-confirm.spec.ts에서 단건 검증)
 *   ─ 더치 트리거(step 3): agent-service의 LLM 응답 기반이라 비결정적
 *     → user-api에 dev-only splitPrepare 노출 엔드포인트 추가 필요 (미구현)
 *
 * 본 spec은 step 5의 confirm 자체는 검증 가능하지만, splitPrepare 트리거 경로
 * (agent 또는 dev 전용 엔드포인트) 미정으로 전체는 skip 유지.
 */
test.describe('Dutch Payment (group of 4) @write @slow', () => {
  const PARTICIPANT_COUNT = 4;
  let users: E2EUser[] = [];

  test.beforeAll(async ({ playwright }) => {
    const baseURL =
      process.env.E2E_BASE_URL || 'https://dev-api.parkgolfmate.com';
    const ctx = await playwright.request.newContext({ baseURL });
    // 4명 user 동시 생성
    users = await Promise.all(
      Array.from({ length: PARTICIPANT_COUNT }, (_, i) =>
        createE2EUser(ctx, `dutch${i + 1}`),
      ),
    );
    await ctx.dispose();
  });

  test.skip('1. 채팅방 생성 + 멤버 추가', async ({ request }) => {
    const [booker, ...others] = users;
    // 채팅방 생성 (booker)
    const create = await request.post('/api/user/chat/rooms', {
      headers: authHeaders(booker.accessToken),
      data: { name: 'E2E 더치페이 채팅방', type: 'GROUP' },
    });
    expect(create.ok(), `room create [${create.status()}]`).toBeTruthy();
    const room = (await create.json())?.data ?? (await create.json());
    const roomId: string = room?.id ?? room?.roomId;
    expect(roomId).toBeTruthy();

    // 멤버 추가
    for (const u of others) {
      const addRes = await request.post(`/api/user/chat/rooms/${roomId}/members`, {
        headers: authHeaders(booker.accessToken),
        data: { userId: u.userId },
      });
      expect(addRes.ok() || addRes.status() === 409).toBeTruthy();
    }
  });

  test.skip('2. AI 에이전트 → 더치페이 트리거 (splitPrepare)', async ({ request }) => {
    // TODO: 위 채팅방 ID를 이전 step에서 전달 — beforeAll에서 셋업 또는 별도 store
    // 1) user-api/chat/rooms/:roomId/agent 호출 ("내일 강남 4명 더치페이로 예약")
    // 2) 응답에서 CONFIRM_BOOKING action 추출 → confirmBooking + paymentMethod=dutchpay 재호출
    // 3) splits 응답 검증 (4 orderId)
    // 4) chat-gateway WebSocket로 settlement 카드 broadcast 수신 확인
  });

  test.skip('3. Plan B — 각자 confirmSplit + saga 검증', async ({ request }) => {
    // 위 step에서 발급된 4 orderId, splits 사용
    // const orderIds: string[] = [...];

    // for (let i = 0; i < users.length; i++) {
    //   const { paymentKey } = await obtainSandboxPaymentKey(
    //     request,
    //     orderIds[i],
    //     amount,
    //   );
    //   const conf = await request.post('/api/user/payments/split/confirm', {
    //     headers: authHeaders(users[i].accessToken),
    //     data: { orderId: orderIds[i], paymentKey, amount },
    //   });
    //   expect(conf.ok()).toBeTruthy();
    // }

    // 4) booking 상태 = CONFIRMED polling (PAYMENT_CONFIRMED saga 완료 대기)
    // const bookingId = ...;
    // await expect.poll(async () => {
    //   const r = await request.get(`/api/user/bookings/${bookingId}`, {
    //     headers: authHeaders(users[0].accessToken),
    //   });
    //   const b = (await r.json())?.data ?? (await r.json());
    //   return b?.status;
    // }, { timeout: 60_000, intervals: [2_000] }).toBe('CONFIRMED');
  });

  test.skip('PAYMENT_TIMEOUT — 1명만 결제 후 5분 경과 자동 환불', async () => {
    // 1~3 셋업 후 1명만 confirmSplit
    // saga-pgboss의 payment-timeout job 즉시 발화 (5분 대기 우회)
    // booking.status = FAILED + refund 발생 검증
  });
});
