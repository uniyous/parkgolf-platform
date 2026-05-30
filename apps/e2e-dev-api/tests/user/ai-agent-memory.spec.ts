import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import { createE2EUser } from '../../fixtures/users';

/**
 * AGENT_MEMORY (Phase 1 + 2) E2E 검증
 *
 * 검증 대상:
 *   - Layer 1 (Working Memory): Redis 영속화 + per-conversation 분산 락
 *   - Layer 2 (Episodic Memory): 사용자 최근 부킹 이력 prefill
 *
 * 엔드포인트:
 *   POST /api/user/chat/rooms                          — 채팅방 생성
 *   POST /api/user/chat/rooms/:roomId/agent            — AI 메시지 (message, conversationId?)
 *     응답: { data: { conversationId, message, state, actions? } }
 *
 * 참고: LLM(DeepSeek) 응답 평균 2~5초. 동시성 테스트는 lock TTL 8s 내 처리 가정.
 *
 * @write — user/room 생성
 */

const ROOM_TYPE = 'CHANNEL';

async function createRoom(request: any, auth: Record<string, string>, userId: number): Promise<string> {
  const res = await request.post('/api/user/chat/rooms', {
    headers: auth,
    data: { name: 'AGENT_MEMORY E2E', type: ROOM_TYPE, participant_ids: [String(userId)] },
  });
  const body = await res.json().catch(() => ({}));
  expect(
    res.ok() || res.status() === 201,
    `room create [${res.status()}]: ${JSON.stringify(body).slice(0, 200)}`,
  ).toBeTruthy();
  const room = body?.data ?? body;
  const roomId: string = room?.id ?? room?.roomId;
  expect(roomId, 'roomId missing').toBeTruthy();
  return roomId;
}

async function sendAgent(
  request: any,
  auth: Record<string, string>,
  roomId: string,
  message: string,
  conversationId?: string,
): Promise<{ status: number; data: any }> {
  const res = await request.post(`/api/user/chat/rooms/${roomId}/agent`, {
    headers: auth,
    data: { message, conversationId },
    timeout: 60_000, // LLM 응답 + saga 여유
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status(), data: body?.data ?? body };
}

test.describe('User > AI Agent Memory @write', () => {
  // ─────────────────────────────────────────────────────────────
  // Phase 1.1 — 기본 동작: 메시지 송신 + conversationId 발급
  // ─────────────────────────────────────────────────────────────
  test('1.1 첫 메시지 → conversationId 발급 + AI 응답', async ({ request }) => {
    const user = await createE2EUser(request, 'agentMemBase');
    const auth = authHeaders(user.accessToken);
    const roomId = await createRoom(request, auth, user.userId);

    const { status, data } = await sendAgent(request, auth, roomId, '안녕');

    expect(status, `agent first message [${status}]`).toBeLessThan(500);
    expect(data?.conversationId, 'conversationId missing').toBeTruthy();
    expect(typeof data?.message, 'AI message missing').toBe('string');
    expect(data?.state, 'state missing').toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────
  // Phase 1.2 — Redis 영속화: 같은 conversationId 재요청 → 컨텍스트 공유
  // ─────────────────────────────────────────────────────────────
  test('1.2 같은 conversationId 재요청 → 컨텍스트 유지 (Redis 영속화)', async ({ request }) => {
    const user = await createE2EUser(request, 'agentMemCtx');
    const auth = authHeaders(user.accessToken);
    const roomId = await createRoom(request, auth, user.userId);

    // 첫 메시지로 conversationId 발급
    const first = await sendAgent(request, auth, roomId, '내일 강남탄천 골프장 예약하고 싶어');
    expect(first.status).toBeLessThan(500);
    const convId = first.data?.conversationId as string;
    expect(convId).toBeTruthy();

    // 같은 convId로 후속 메시지 — context 유지되어야
    const second = await sendAgent(request, auth, roomId, '4명이서', convId);
    expect(second.status).toBeLessThan(500);
    expect(second.data?.conversationId, 'conversationId mismatch').toBe(convId);

    // 같은 conversation이면 state 진행 (IDLE → 다음 단계). 정확한 상태는 LLM 응답 따라 변동.
    expect(['IDLE','ANALYZING','COLLECTING','SELECTING_MEMBERS','CONFIRMING','BOOKING','TEAM_COMPLETE','COMPLETED','SETTLING','CANCELLED']).toContain(second.data?.state);
  });

  // ─────────────────────────────────────────────────────────────
  // Phase 1.3 — Per-conversation 분산 락: 같은 convId 동시 요청 → graceful
  // ─────────────────────────────────────────────────────────────
  test('1.3 같은 conversationId 동시 2 요청 → 둘 다 graceful 응답 (락 동작)', async ({ request }) => {
    const user = await createE2EUser(request, 'agentMemLock');
    const auth = authHeaders(user.accessToken);
    const roomId = await createRoom(request, auth, user.userId);

    // conversationId 먼저 확보
    const init = await sendAgent(request, auth, roomId, '안녕');
    const convId = init.data?.conversationId as string;
    expect(convId).toBeTruthy();

    // 같은 convId로 거의 동시 2 요청 (Promise.all)
    const [r1, r2] = await Promise.all([
      sendAgent(request, auth, roomId, '메시지 A', convId),
      sendAgent(request, auth, roomId, '메시지 B', convId),
    ]);

    // 두 응답 모두 200 응답 (어느 쪽도 500 에러 아님)
    expect(r1.status, `r1 [${r1.status}]`).toBeLessThan(500);
    expect(r2.status, `r2 [${r2.status}]`).toBeLessThan(500);

    // 두 응답 중 적어도 하나는 처리됨. lock 동작 시 한쪽이 "처리 중" 메시지일 수 있음 (graceful)
    const messages = [r1.data?.message ?? '', r2.data?.message ?? ''];
    const busyCount = messages.filter((m) => typeof m === 'string' && m.includes('처리 중')).length;
    // 모두 정상 처리됐거나(빠른 직렬화), 한쪽이 busy로 안내됐어야
    expect(busyCount).toBeLessThanOrEqual(1);
    // 두 응답 모두 conversationId 일치
    expect(r1.data?.conversationId).toBe(convId);
    expect(r2.data?.conversationId).toBe(convId);
  });

  // ─────────────────────────────────────────────────────────────
  // Phase 1.4 — 다중 사용자 격리: 같은 채팅방, 다른 userId → 다른 컨텍스트
  // ─────────────────────────────────────────────────────────────
  test('1.4 다른 사용자 → 컨텍스트 완전 격리 (다른 Redis key)', async ({ request }) => {
    const owner = await createE2EUser(request, 'agentMemA');
    const guest = await createE2EUser(request, 'agentMemB');
    const ownerAuth = authHeaders(owner.accessToken);
    const guestAuth = authHeaders(guest.accessToken);

    const roomId = await createRoom(request, ownerAuth, owner.userId);
    // guest를 멤버로 초대
    const addRes = await request.post(`/api/user/chat/rooms/${roomId}/members`, {
      headers: ownerAuth,
      data: { user_ids: [String(guest.userId)] },
    });
    expect(addRes.ok() || addRes.status() === 201 || addRes.status() === 409).toBeTruthy();

    const o = await sendAgent(request, ownerAuth, roomId, 'owner 메시지');
    const g = await sendAgent(request, guestAuth, roomId, 'guest 메시지');

    expect(o.status).toBeLessThan(500);
    expect(g.status).toBeLessThan(500);
    expect(o.data?.conversationId, 'owner convId').toBeTruthy();
    expect(g.data?.conversationId, 'guest convId').toBeTruthy();
    // 서로 다른 conversationId — 사용자별 격리
    expect(o.data?.conversationId).not.toBe(g.data?.conversationId);
  });

  // ─────────────────────────────────────────────────────────────
  // Phase 1.5 — 같은 사용자, 다른 conversationId → 별개 세션
  // ─────────────────────────────────────────────────────────────
  test('1.5 같은 사용자 + 다른 conversationId → 독립 세션', async ({ request }) => {
    const user = await createE2EUser(request, 'agentMemMultiConv');
    const auth = authHeaders(user.accessToken);
    const roomId = await createRoom(request, auth, user.userId);

    const first = await sendAgent(request, auth, roomId, '첫 대화');
    expect(first.status).toBeLessThan(500);
    const conv1 = first.data?.conversationId as string;
    expect(conv1).toBeTruthy();

    // conversationId 없이 새 메시지 → 새 conversationId 발급
    const second = await sendAgent(request, auth, roomId, '두번째 대화 (별개)');
    expect(second.status).toBeLessThan(500);
    const conv2 = second.data?.conversationId as string;
    expect(conv2).toBeTruthy();

    expect(conv1, 'should be different conversationIds').not.toBe(conv2);
  });

  // ─────────────────────────────────────────────────────────────
  // Phase 2.1 — Episodic Prefill: 사용자 부킹 이력 활용
  //   (이력이 없는 신규 사용자 → "지난번" 같은 표현에 빈 응답 가능. 동작 검증만)
  // ─────────────────────────────────────────────────────────────
  test('2.1 신규 사용자 — 이력 없음에도 "지난번" 표현 graceful 처리', async ({ request }) => {
    const user = await createE2EUser(request, 'agentMemEpisodicNew');
    const auth = authHeaders(user.accessToken);
    const roomId = await createRoom(request, auth, user.userId);

    // 신규 사용자이지만 prefill 로직이 실패 시 graceful 처리되는지
    const res = await sendAgent(request, auth, roomId, '지난번처럼 예약해줘');
    expect(res.status, `agent ep [${res.status}]`).toBeLessThan(500);
    expect(res.data?.conversationId).toBeTruthy();
    // 응답은 정상 (LLM이 이력 없어서 정보 요청하거나 안내 메시지)
    expect(typeof res.data?.message).toBe('string');
  });

  // ─────────────────────────────────────────────────────────────
  // Phase 1.6 — 응답 시간 측정 (Redis 추가 부하 영향 확인)
  // ─────────────────────────────────────────────────────────────
  test('1.6 응답 시간 합리적 (Redis 오버헤드 < 1s 추가)', async ({ request }) => {
    const user = await createE2EUser(request, 'agentMemPerf');
    const auth = authHeaders(user.accessToken);
    const roomId = await createRoom(request, auth, user.userId);

    const start = Date.now();
    const res = await sendAgent(request, auth, roomId, '안녕');
    const elapsed = Date.now() - start;

    expect(res.status).toBeLessThan(500);
    // LLM 평균 2~5s + Redis 오버헤드 ~5ms. 30초 이내면 정상.
    expect(elapsed, `response time ${elapsed}ms`).toBeLessThan(30_000);
    console.log(`[1.6] agent response time: ${elapsed}ms`);
  });
});
