import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import { createE2EUser } from '../../fixtures/users';

/**
 * AI Booking Flow — UNI-21: 클럽 → 멤버 → 슬롯 → 확정 흐름 검증
 *
 * 검증 대상:
 *   - 채팅방 그룹 진입: selectedClubId 전송 시 SHOW_SLOTS 대신 SELECT_MEMBERS 카드 우선
 *   - 멤버 확정 후 teamMembers 전송 시 SHOW_SLOTS (또는 슬롯 없음 안내)로 진행
 *
 * 엔드포인트:
 *   POST /api/user/chat/rooms                          — 채팅방 생성
 *   POST /api/user/chat/rooms/:roomId/agent            — AI 메시지 + UI 액션
 *
 * @write
 */

const ROOM_TYPE = 'CHANNEL';

async function createRoom(request: any, auth: Record<string, string>, userId: number): Promise<string> {
  const res = await request.post('/api/user/chat/rooms', {
    headers: auth,
    data: { name: 'UNI-21 flow E2E', type: ROOM_TYPE, participant_ids: [String(userId)] },
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
  payload: Record<string, unknown>,
): Promise<{ status: number; data: any }> {
  const res = await request.post(`/api/user/chat/rooms/${roomId}/agent`, {
    headers: auth,
    data: payload,
    timeout: 60_000,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status(), data: body?.data ?? body };
}

test.describe('User > AI Booking Flow (UNI-21) @write', () => {
  // ─────────────────────────────────────────────────────────────
  // 4.1 — 채팅방 그룹 진입: 클럽 선택 → SELECT_MEMBERS 카드 우선
  // ─────────────────────────────────────────────────────────────
  test('4.1 채팅방에서 selectedClubId 전송 → SELECT_MEMBERS 카드 응답 (SHOW_SLOTS 아님)', async ({ request }) => {
    const user = await createE2EUser(request, 'bookFlowClub');
    const auth = authHeaders(user.accessToken);
    const roomId = await createRoom(request, auth, user.userId);

    // conversationId 발급 (자연어 1회)
    const init = await sendAgent(request, auth, roomId, { message: '안녕' });
    expect(init.status).toBeLessThan(500);
    const convId = init.data?.conversationId as string;
    expect(convId, 'conversationId').toBeTruthy();

    // 클럽 선택 — 채팅방 + 멤버 미선택 상태 → SELECT_MEMBERS 우선
    const res = await sendAgent(request, auth, roomId, {
      message: '',
      conversationId: convId,
      selectedClubId: '1',
      selectedClubName: '테스트 클럽',
    });

    expect(res.status, `agent club select [${res.status}]`).toBeLessThan(500);
    expect(res.data?.conversationId).toBe(convId);

    const actions = res.data?.actions ?? [];
    const firstAction = actions[0];
    console.log(`[4.1] first action: ${firstAction?.type}, state: ${res.data?.state}`);

    // 핵심 검증: SELECT_MEMBERS 카드가 SHOW_SLOTS보다 먼저
    expect(firstAction, 'actions[0] missing').toBeTruthy();
    expect(firstAction.type, 'should be SELECT_MEMBERS not SHOW_SLOTS').toBe('SELECT_MEMBERS');

    // SELECT_MEMBERS 카드의 페이로드 sanity
    const data = firstAction.data ?? {};
    expect(data.clubName, 'card.clubName').toBe('테스트 클럽');
    expect(Array.isArray(data.availableMembers) || Array.isArray(data.currentTeam?.members)).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────
  // 4.2 — 멤버 확정 후 teamMembers 전송 → SHOW_SLOTS 또는 슬롯 없음 안내
  // ─────────────────────────────────────────────────────────────
  test('4.2 SELECT_MEMBERS 받은 후 teamMembers 전송 → 슬롯 조회 단계로 진행', async ({ request }) => {
    const user = await createE2EUser(request, 'bookFlowMember');
    const auth = authHeaders(user.accessToken);
    const roomId = await createRoom(request, auth, user.userId);

    const init = await sendAgent(request, auth, roomId, { message: '안녕' });
    const convId = init.data?.conversationId as string;
    expect(convId).toBeTruthy();

    // 클럽 선택 → SELECT_MEMBERS 카드
    const clubRes = await sendAgent(request, auth, roomId, {
      message: '',
      conversationId: convId,
      selectedClubId: '1',
      selectedClubName: '테스트 클럽',
    });
    expect(clubRes.status).toBeLessThan(500);
    expect(clubRes.data?.actions?.[0]?.type).toBe('SELECT_MEMBERS');

    // 멤버 선택 — 본인만 1인 (채팅방 owner)
    const memberRes = await sendAgent(request, auth, roomId, {
      message: '',
      conversationId: convId,
      teamMembers: [
        { userId: user.userId, userName: 'owner', userEmail: user.email ?? 'owner@e2e.test' },
      ],
    });

    expect(memberRes.status, `agent member select [${memberRes.status}]`).toBeLessThan(500);
    expect(memberRes.data?.conversationId).toBe(convId);

    const firstAction = memberRes.data?.actions?.[0];
    const state = memberRes.data?.state;
    console.log(`[4.2] action: ${firstAction?.type ?? 'none'}, state: ${state}`);

    // 클럽 ID=1이 dev에 있고 슬롯도 있으면 SHOW_SLOTS,
    // 없으면 텍스트 안내(actions 없음). 둘 다 정상 흐름.
    if (firstAction) {
      expect(firstAction.type, 'should be SHOW_SLOTS not SELECT_MEMBERS').toBe('SHOW_SLOTS');
    }
    // SELECT_MEMBERS 카드가 두 번 뜨면 안 됨 — 핵심 회귀 방지
    expect(firstAction?.type).not.toBe('SELECT_MEMBERS');
  });
});
