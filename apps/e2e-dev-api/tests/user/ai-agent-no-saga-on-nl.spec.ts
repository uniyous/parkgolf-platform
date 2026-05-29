import { APIRequestContext } from '@playwright/test';
import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import { createE2EUser } from '../../fixtures/users';

/**
 * AI Agent — 결정/비결정 경계 회귀 (UNI-29)
 *
 * 불변식: **자연어(message)로는 예약(saga)이 시작되지 않는다.**
 *   예약 확정(create_booking saga)은 UI 확정 플래그(confirmBooking) → direct-action-handler
 *   → effect-executor 경유만 허용된다.
 *
 *   - P2(UNI-33): create_booking 이 LLM tools[] 에서 제거 + guardLlmToolCall 이중 방어
 *   - P3(UNI-34): saga 시작이 effect-executor 단일 게이트로 수렴
 *
 * 판정: 자연어 턴 응답에 예약 "생성" 신호가 없어야 한다.
 *   - state ≠ COMPLETED / BOOKING / SETTLING / TEAM_COMPLETE
 *   - actions 에 TEAM_COMPLETE / SHOW_PAYMENT / SETTLEMENT_STATUS 없음
 *
 * @write — user/room 생성 (dev)
 */

const ROOM_TYPE = 'CHANNEL';

// 예약이 "생성/진행"된 것으로 간주하는 신호 (자연어 턴에서 나오면 안 됨)
const BOOKING_COMMITTED_ACTIONS = ['TEAM_COMPLETE', 'SHOW_PAYMENT', 'SETTLEMENT_STATUS', 'SPLIT_PAYMENT'];
const BOOKING_COMMITTED_STATES = ['BOOKING', 'SETTLING', 'TEAM_COMPLETE', 'COMPLETED'];

interface AgentResult { status: number; data: any }

async function createRoom(
  request: APIRequestContext,
  auth: Record<string, string>,
  userId: number,
): Promise<string> {
  const res = await request.post('/api/user/chat/rooms', {
    headers: auth,
    data: { name: 'UNI-29 no-saga-on-nl E2E', type: ROOM_TYPE, participant_ids: [String(userId)] },
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
  request: APIRequestContext,
  auth: Record<string, string>,
  roomId: string,
  payload: Record<string, unknown>,
): Promise<AgentResult> {
  const res = await request.post(`/api/user/chat/rooms/${roomId}/agent`, {
    headers: auth,
    data: payload,
    timeout: 60_000,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status(), data: body?.data ?? body };
}

function assertNoBookingCommitted(label: string, data: any): void {
  const state: string = data?.state ?? '';
  const actions: Array<{ type: string }> = data?.actions ?? [];
  const committedAction = actions.find((a) => BOOKING_COMMITTED_ACTIONS.includes(a.type));

  expect(
    committedAction,
    `[${label}] 자연어로 예약 생성 신호 발생: action=${committedAction?.type}`,
  ).toBeFalsy();
  expect(
    BOOKING_COMMITTED_STATES.includes(state),
    `[${label}] 자연어로 예약 진행 상태 전이: state=${state}`,
  ).toBe(false);
}

test.describe('User > AI Agent 자연어 saga-차단 (UNI-29) @write', () => {
  test('자연어 "예약해줘" 한 마디로 예약이 생성되지 않는다', async ({ request }) => {
    const user = await createE2EUser(request, 'nlNoSagaA');
    const auth = authHeaders(user.accessToken);
    const roomId = await createRoom(request, auth, user.userId);

    const res = await sendAgent(request, auth, roomId, {
      message: '내일 오전 천안 파크골프장 4명 예약해줘',
    });

    expect(res.status, `agent [${res.status}]`).toBeLessThan(500);
    assertNoBookingCommitted('예약해줘', res.data);
  });

  test('슬롯 안내 후 자연어 "네 좋아요" 동의에도 예약이 생성되지 않는다', async ({ request }) => {
    const user = await createE2EUser(request, 'nlNoSagaB');
    const auth = authHeaders(user.accessToken);
    const roomId = await createRoom(request, auth, user.userId);

    // 1) conversationId 발급 + 슬롯 탐색 유도 (read-only)
    const init = await sendAgent(request, auth, roomId, {
      message: '내일 오전 천안 파크골프장 보여줘',
    });
    expect(init.status).toBeLessThan(500);
    const convId = init.data?.conversationId as string;
    expect(convId, 'conversationId').toBeTruthy();
    assertNoBookingCommitted('슬롯안내', init.data);

    // 2) 자연어 동의 — 확정 카드 클릭이 아니므로 saga 가 시작되면 안 됨
    const res2 = await sendAgent(request, auth, roomId, {
      message: '네 좋아요 그걸로 예약해주세요',
      conversationId: convId,
    });

    expect(res2.status, `agent consent [${res2.status}]`).toBeLessThan(500);
    assertNoBookingCommitted('네좋아요', res2.data);
  });
});
