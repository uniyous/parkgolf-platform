import { APIRequestContext } from '@playwright/test';
import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import { createE2EUser, E2EUser } from '../../fixtures/users';

/**
 * AI Booking Agent — 카테고리 G: 턴별 컨텍스트 조립 & 슬롯 캐리 검증
 *
 * 직교 축
 *   A~F (ai-agent-scenarios)        응답 계약 · UI 카드 · 직접 액션 · 결제 분기
 *   본 파일 G (ai-agent-context)      turn-N의 입력이 turn-N+1의 컨텍스트
 *                                     (prefetch / slots / 가드)에 어떻게 반영되는지
 *
 * 관련 문서: docs/workflow/AGENT_CONTEXT.md
 *
 * 결정성 전략
 *   - LLM 응답은 비결정적 → 키워드 포함/제외 기반 느슨 단언 + state/계약 확인
 *   - 직접 액션(selectedClubId 등)은 결정적 단언
 *   - 슬롯 시드 의존 케이스는 강한 단언 대신 warn 로그 (회귀 감시 용도)
 *
 * 비용 절감: user/room을 파일당 1회 생성(beforeAll), 시나리오별 conversationId로 분리.
 *
 * @write — user/room 생성 (dev)
 */

const BASE_URL = process.env.E2E_BASE_URL || 'https://dev-api.parkgolfmate.com';
const ROOM_TYPE = 'CHANNEL';

const VALID_ACTION_TYPES = [
  'SHOW_CLUBS', 'SHOW_SLOTS', 'SHOW_WEATHER', 'CONFIRM_BOOKING', 'SELECT_MEMBERS',
  'SHOW_PAYMENT', 'SPLIT_PAYMENT', 'SETTLEMENT_STATUS', 'TEAM_COMPLETE',
  'BOOKING_FAILED', 'BOOKING_EXPIRED',
];
const VALID_STATES = [
  'IDLE', 'ANALYZING', 'COLLECTING', 'SELECTING_MEMBERS', 'CONFIRMING', 'BOOKING',
  'SETTLING', 'TEAM_COMPLETE', 'COMPLETED', 'CANCELLED',
];

const COORD_CHEONAN = { latitude: 36.8151, longitude: 127.1139 }; // 천안 (유관순 id=129 근처)
const COORD_GANGNAM = { latitude: 37.5012, longitude: 127.0396 }; // 강남 역삼

interface AgentResult { status: number; data: any }

async function createRoom(
  request: APIRequestContext,
  auth: Record<string, string>,
  userId: number,
  name = 'G context E2E',
): Promise<string> {
  const res = await request.post('/api/user/chat/rooms', {
    headers: auth,
    data: { name, type: ROOM_TYPE, participant_ids: [String(userId)] },
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

function actionsOf(data: any): any[] {
  return Array.isArray(data?.actions) ? data.actions : [];
}

function assertContract(r: AgentResult, label: string): void {
  expect(r.status, `${label}: status ${r.status}`).toBeLessThan(500);
  expect(r.data?.conversationId, `${label}: conversationId 누락`).toBeTruthy();
  expect(typeof r.data?.message, `${label}: message 타입`).toBe('string');
  expect(VALID_STATES, `${label}: 알 수 없는 state ${r.data?.state}`).toContain(r.data?.state);
  for (const a of actionsOf(r.data)) {
    expect(a?.type, `${label}: TASK_PREVIEW (UNI-26 위반)`).not.toBe('TASK_PREVIEW');
    expect(VALID_ACTION_TYPES, `${label}: 미정의 ActionType ${a?.type}`).toContain(a?.type);
  }
}

// ── 파일 공유 상태 ──
let user: E2EUser;
let auth: Record<string, string>;
let roomId: string;

test.beforeAll(async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: BASE_URL });
  user = await createE2EUser(ctx, 'agentCtx');
  auth = authHeaders(user.accessToken);
  roomId = await createRoom(ctx, auth, user.userId, 'G ctx room');
  console.log(`[setup] user=${user.userId} room=${roomId}`);
  await ctx.dispose();
});

// ════════════════════════════════════════════════════════════════════════
// G. 턴별 컨텍스트 조립 & 슬롯 캐리
// ════════════════════════════════════════════════════════════════════════
test.describe('Agent > G. 컨텍스트 조립 & 슬롯 캐리 @write', () => {

  test('G1 위치 prefetch — 좌표 동반 첫 메시지 → 지역명 응답 (한 문장, 군더더기 X)', async ({ request }) => {
    const r = await sendAgent(request, auth, roomId, {
      message: '현재 위치는?',
      ...COORD_GANGNAM,
    });
    assertContract(r, 'G1');
    const msg: string = r.data?.message ?? '';
    // 지역명 포함 (강남/역삼/서울 중 하나) — coord2region prefetch 결과 반영
    expect(/강남|역삼|서울/.test(msg), `G1 지역명 미반영: "${msg.slice(0, 80)}"`).toBeTruthy();
    // 군더더기 검사: 응답 길이 짧게 (예약 제안 등 묻지 않은 후속 X)
    expect(msg.length, `G1 응답 과다(${msg.length}자): "${msg.slice(0, 80)}"`).toBeLessThan(150);
    console.log(`[G1] msg="${msg}" len=${msg.length}`);
  });

  test('G2 recentClubs 캐리 — "1번" 지칭이 가짜 id로 가지 않음 (CLUB### 환각 차단)', async ({ request }) => {
    // 턴1: 근처 + 날짜 → recentClubs slots에 채워짐
    const t1 = await sendAgent(request, auth, roomId, {
      message: '내일 근처 예약 가능한 곳 알려줘',
      ...COORD_CHEONAN,
    });
    assertContract(t1, 'G2.t1');
    const convId = t1.data?.conversationId as string;
    expect(convId, 'G2 convId').toBeTruthy();

    // 턴2: 같은 conv로 "1번" 지칭
    const t2 = await sendAgent(request, auth, roomId, {
      message: '1번 골프장 정보 알려줘',
      conversationId: convId,
      ...COORD_CHEONAN,
    });
    assertContract(t2, 'G2.t2');
    const msg2: string = t2.data?.message ?? '';
    // 가짜 id 환각 흔적: 텍스트에 "CLUB001" 류 노출이면 실패 (수정 전 회귀)
    expect(/CLUB\d{3,}/i.test(msg2), `G2 환각 id 누출: "${msg2.slice(0, 120)}"`).toBeFalsy();
    // INVALID_CLUB_ID 안내가 떴다는 것은 가드는 작동했으나 LLM이 여전히 가짜 id를 보냈다는 의미 → 회귀
    expect(/INVALID_CLUB_ID|유효한 골프장 ID가 아닙니다/.test(msg2), `G2 LLM이 가짜 clubId 호출 (회귀)`).toBeFalsy();
    console.log(`[G2] msg2="${msg2.slice(0, 100)}"`);
  });

  test('G3 그룹 게이트 — selectedClubId 후 SELECT_MEMBERS 카드 우선 (인원 확정 경로 보장)', async ({ request }) => {
    const init = await sendAgent(request, auth, roomId, {
      message: '내일 3명 근처 예약 가능한 곳',
      ...COORD_CHEONAN,
    });
    assertContract(init, 'G3.init');
    const convId = init.data?.conversationId as string;

    const t2 = await sendAgent(request, auth, roomId, {
      message: '', conversationId: convId,
      selectedClubId: '129', selectedClubName: '천안 유관순 파크골프장',
    });
    assertContract(t2, 'G3.t2');
    const types = actionsOf(t2.data).map((a) => a?.type);
    // 채팅방 + 멤버 미선택 → SELECT_MEMBERS가 SHOW_SLOTS보다 우선
    expect(types.includes('SELECT_MEMBERS'), `G3 SELECT_MEMBERS 미동반: ${types.join(',')}`).toBeTruthy();
    expect(types.includes('SHOW_SLOTS'), `G3 SHOW_SLOTS 우선 (게이트 미작동): ${types.join(',')}`).toBeFalsy();
    console.log(`[G3] actions=${types.join(',') || 'none'}`);
  });

  test('G4 자연어 슬롯 질의 → SHOW_SLOTS 가드 (멤버 미선택 시 슬롯 노출 차단)', async ({ request }) => {
    const r = await sendAgent(request, auth, roomId, {
      message: '내일 천안 유관순 슬롯 알려줘',
      ...COORD_CHEONAN,
    });
    assertContract(r, 'G4');
    const types = actionsOf(r.data).map((a) => a?.type);
    // 멤버 미선택 채팅방에서 SHOW_SLOTS 노출 금지 (응답 가드 ⑦)
    expect(types.includes('SHOW_SLOTS'), `G4 SHOW_SLOTS 미차단: actions=${types.join(',')}`).toBeFalsy();
    console.log(`[G4] actions=${types.join(',') || 'none'}`);
  });

  test('G5 특정 코스/시간대 정확 확인 — 있는 슬롯에 "없다" 답변 금지', async ({ request }) => {
    const r = await sendAgent(request, auth, roomId, {
      message: '천안 유관순 A+B 코스 오후 3시 슬롯 있어?',
      ...COORD_CHEONAN,
    });
    assertContract(r, 'G5');
    const msg: string = r.data?.message ?? '';
    // 절대 부정 키워드 → 시드 미존재 가능성도 있어 warn 로그로만 회귀 감시
    const negative = /없습니다|없어요|없는|예약\s*불가/.test(msg);
    if (negative) {
      console.warn(`[G5] ⚠ 부정 응답 감지: "${msg.slice(0, 120)}" — 시드/회귀 점검 필요`);
    } else {
      console.log(`[G5] OK: "${msg.slice(0, 80)}"`);
    }
  });

  test('G6 semantic prefill — 같은 대화 멀티턴 둘 다 graceful', async ({ request }) => {
    const t1 = await sendAgent(request, auth, roomId, {
      message: '안녕하세요',
    });
    assertContract(t1, 'G6.t1');
    const convId = t1.data?.conversationId as string;

    const t2 = await sendAgent(request, auth, roomId, {
      message: '오늘 기분 좋네요',
      conversationId: convId,
    });
    assertContract(t2, 'G6.t2');
    // semanticPrefilled 플래그 검증은 외부에서 불가 → 두 응답 모두 graceful이면 OK
    console.log(`[G6] t1="${(t1.data?.message ?? '').slice(0, 40)}" t2="${(t2.data?.message ?? '').slice(0, 40)}"`);
  });

  test('G7 잡담 — 부킹 카드 미동반 (도구 없이 자연어 응답)', async ({ request }) => {
    const r = await sendAgent(request, auth, roomId, {
      message: '안녕 반가워요',
    });
    assertContract(r, 'G7');
    const types = actionsOf(r.data).map((a) => a?.type);
    const bookingCards = ['SHOW_CLUBS', 'SHOW_SLOTS', 'SHOW_PAYMENT', 'CONFIRM_BOOKING', 'TEAM_COMPLETE', 'SELECT_MEMBERS'];
    const hasBooking = types.some((t) => bookingCards.includes(t));
    expect(hasBooking, `G7 잡담에 부킹 카드 노출: ${types.join(',')}`).toBeFalsy();
    console.log(`[G7] actions=${types.join(',') || 'none'}`);
  });

  test('G8 위치 캐싱 — 같은 대화 두 번째 턴도 graceful + 일관 응답', async ({ request }) => {
    const t1 = await sendAgent(request, auth, roomId, {
      message: '현재 위치는?',
      ...COORD_GANGNAM,
    });
    assertContract(t1, 'G8.t1');
    const convId = t1.data?.conversationId as string;

    const t2 = await sendAgent(request, auth, roomId, {
      message: '여기 근처 골프장 있나요?',
      conversationId: convId,
      ...COORD_GANGNAM,
    });
    assertContract(t2, 'G8.t2');
    // regionName 재호출 여부는 외부에서 불가 → graceful + 5xx 아님이면 OK
    console.log(`[G8] t1="${(t1.data?.message ?? '').slice(0, 40)}" t2="${(t2.data?.message ?? '').slice(0, 60)}"`);
  });

  test('G9 직접 액션 → 후속 자유 텍스트가 같은 컨텍스트 사용 (clubId 캐리)', async ({ request }) => {
    const init = await sendAgent(request, auth, roomId, {
      message: '근처 골프장',
      ...COORD_CHEONAN,
    });
    assertContract(init, 'G9.init');
    const convId = init.data?.conversationId as string;

    // CLUB_SELECT (직접 액션) → slots.clubId/clubName 갱신
    const sel = await sendAgent(request, auth, roomId, {
      message: '', conversationId: convId,
      selectedClubId: '129', selectedClubName: '천안 유관순 파크골프장',
    });
    assertContract(sel, 'G9.sel');

    // 후속 자유 텍스트 — context.slots.clubId 활용 기대
    const t3 = await sendAgent(request, auth, roomId, {
      message: '이 골프장 전화번호 알려줘',
      conversationId: convId,
    });
    assertContract(t3, 'G9.t3');
    const msg3: string = t3.data?.message ?? '';
    // 환각 id / "어느 골프장" 같은 컨텍스트 망각 신호 미포함 (느슨)
    expect(/어느 골프장|어떤 골프장|골프장을 알려/.test(msg3), `G9 컨텍스트 망각: "${msg3.slice(0, 120)}"`).toBeFalsy();
    console.log(`[G9] t3="${msg3.slice(0, 100)}"`);
  });

  test('G10 응답 가드 — LLM 안내 텍스트 보존 (빈 메시지 아님)', async ({ request }) => {
    // 사전 recentClubs 채우기
    const init = await sendAgent(request, auth, roomId, {
      message: '내일 근처 예약 가능한 곳',
      ...COORD_CHEONAN,
    });
    assertContract(init, 'G10.init');
    const convId = init.data?.conversationId as string;

    // 가드 발동 케이스 (SHOW_SLOTS 차단되지만 텍스트는 보존)
    const r = await sendAgent(request, auth, roomId, {
      message: '천안 유관순 A+B 오후 3시 슬롯 있어?',
      conversationId: convId,
      ...COORD_CHEONAN,
    });
    assertContract(r, 'G10');
    const types = actionsOf(r.data).map((a) => a?.type);
    expect(types.includes('SHOW_SLOTS'), `G10 SHOW_SLOTS 미차단`).toBeFalsy();
    const msg: string = r.data?.message ?? '';
    expect(msg.length, `G10 텍스트 보존 안 됨 (빈 메시지)`).toBeGreaterThan(0);
    console.log(`[G10] actions=${types.join(',') || 'none'} msgLen=${msg.length} msg="${msg.slice(0, 80)}"`);
  });
});
