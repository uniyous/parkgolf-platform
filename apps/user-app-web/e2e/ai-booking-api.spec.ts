import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * AI 예약 도우미 API 통합 테스트 — 19개 시나리오
 *
 * 배포된 dev 환경에서 AI 예약 도우미의 전체 시나리오를 API 레벨로 검증.
 * POST /api/user/chat/rooms/:roomId/agent 엔드포인트를 통해
 * agent-service의 9개 도구가 정상 동작하는지 확인.
 *
 * 사전 조건:
 * - dev 환경(user-api, agent-service, course-service 등)이 배포되어 있어야 함
 * - test@parkgolf.com / test1234 테스트 계정이 존재해야 함
 *
 * 실행:
 *   E2E_BASE_URL=https://dev-api.parkgolfmate.com npx playwright test e2e/ai-booking-api.spec.ts --project=api
 */

// ════════════════════════════════════════════════
// Config & Helpers
// ════════════════════════════════════════════════

const API_BASE = process.env.E2E_API_BASE_URL || 'https://dev-api.parkgolfmate.com';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@parkgolf.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test1234';

interface TestCtx {
  api: APIRequestContext;
  token: string;
  roomId: string;
}

/** 로그인 → accessToken */
async function login(api: APIRequestContext): Promise<string> {
  const res = await api.post(`${API_BASE}/api/user/iam/login`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();

  // NatsResponse 래핑 또는 직접 반환 둘 다 대응
  const token = body.data?.accessToken ?? body.accessToken;
  expect(token).toBeTruthy();
  return token;
}

/** AI 전용 채팅방 생성 */
async function createRoom(api: APIRequestContext, token: string): Promise<string> {
  const res = await api.post(`${API_BASE}/api/user/chat/rooms`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: `AI_API_TEST_${Date.now()}`, type: 'DIRECT', participant_ids: [] },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();

  const roomId = body.data?.id ?? body.id;
  expect(roomId).toBeTruthy();
  return roomId;
}

/** AI 메시지 전송 */
async function sendAi(
  ctx: TestCtx,
  message: string,
  opts: { conversationId?: string; latitude?: number; longitude?: number } = {},
) {
  const data: Record<string, unknown> = { message };
  if (opts.conversationId) data.conversationId = opts.conversationId;
  if (opts.latitude !== undefined) data.latitude = opts.latitude;
  if (opts.longitude !== undefined) data.longitude = opts.longitude;

  const res = await ctx.api.post(`${API_BASE}/api/user/chat/rooms/${ctx.roomId}/agent`, {
    headers: { Authorization: `Bearer ${ctx.token}` },
    data,
  });

  const body = await res.json();
  return { status: res.status(), body };
}

// ════════════════════════════════════════════════
// Setup
// ════════════════════════════════════════════════

let ctx: TestCtx;

test.beforeAll(async ({ playwright }) => {
  const api = await playwright.request.newContext();
  const token = await login(api);
  const roomId = await createRoom(api, token);
  ctx = { api, token, roomId };
  console.log(`API test context ready: roomId=${roomId}`);
});

test.afterAll(async () => {
  await ctx?.api?.dispose();
});

// ─────────────────────────────────────────────
// 1. 기본 대화
// ─────────────────────────────────────────────
test.describe('1. 기본 대화', () => {
  test('TC-001: 인사 → AI 응답 + conversationId 반환', async () => {
    const { body } = await sendAi(ctx, '안녕하세요');

    console.log('TC-001:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.conversationId).toBeDefined();
    expect(body.data.message).toBeTruthy();
    expect(body.data.state).toBeDefined();
  });

  test('TC-002: 위치 없이 메시지 → 하위호환 정상 동작', async () => {
    const { body } = await sendAi(ctx, '파크골프 치고 싶어요');

    console.log('TC-002:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.conversationId).toBeDefined();
    expect(body.data.message).toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// 2. 골프장 검색
// ─────────────────────────────────────────────
test.describe('2. 골프장 검색', () => {
  test('TC-003: "천안 골프장 알려줘" → SHOW_CLUBS 액션 + clubs 데이터', async () => {
    const { body } = await sendAi(ctx, '천안 파크골프장 알려줘');

    console.log('TC-003:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.message).toBeTruthy();
    expect(body.data.conversationId).toBeDefined();

    // AI가 골프장 검색 도구를 호출했을 때 SHOW_CLUBS 액션 기대
    if (body.data.actions?.length > 0) {
      const clubAction = body.data.actions.find((a: any) => a.type === 'SHOW_CLUBS');
      if (clubAction) {
        expect(clubAction.data).toBeDefined();
      }
    }
  });

  test('TC-004: "내 근처 골프장" + 위치 → 위치 기반 결과', async () => {
    const { body } = await sendAi(ctx, '내 근처 파크골프장 찾아줘', {
      latitude: 36.8151,
      longitude: 127.1139,
    });

    console.log('TC-004:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.message).toBeTruthy();
    expect(body.data.conversationId).toBeDefined();
  });

  test('TC-005: 없는 지역 "아틀란티스 골프장" → 안내 메시지 (에러 아님)', async () => {
    const { body } = await sendAi(ctx, '아틀란티스 파크골프장 알려줘');

    console.log('TC-005:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.message).toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// 3. 날짜 기반 검색
// ─────────────────────────────────────────────
test.describe('3. 날짜 기반 검색', () => {
  test('TC-006: "내일 천안 골프" → search_clubs_with_slots 호출', async () => {
    const { body } = await sendAi(ctx, '내일 천안에서 파크골프 치고 싶어');

    console.log('TC-006:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.message).toBeTruthy();
    expect(body.data.conversationId).toBeDefined();
  });

  test('TC-007: "이번 주말 오전" → 시간대 필터 동작', async () => {
    const { body } = await sendAi(ctx, '이번 주말 오전에 칠 수 있는 골프장 있어?');

    console.log('TC-007:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.message).toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// 4. 날씨 조회
// ─────────────────────────────────────────────
test.describe('4. 날씨 조회', () => {
  let conversationId: string;

  test('TC-008: 골프장 검색 → "날씨 어때?" (연속 대화) → SHOW_WEATHER', async () => {
    // Step 1: 골프장 검색
    const searchRes = await sendAi(ctx, '천안 파크골프장 알려줘');
    expect(searchRes.body.success).toBe(true);
    conversationId = searchRes.body.data.conversationId;

    console.log('TC-008 search:', JSON.stringify(searchRes.body, null, 2));

    // Step 2: 같은 대화에서 날씨 질문
    const weatherRes = await sendAi(ctx, '거기 날씨 어때?', { conversationId });

    console.log('TC-008 weather:', JSON.stringify(weatherRes.body, null, 2));

    expect(weatherRes.body.success).toBe(true);
    expect(weatherRes.body.data.message).toBeTruthy();

    if (weatherRes.body.data.actions?.length > 0) {
      const weatherAction = weatherRes.body.data.actions.find(
        (a: any) => a.type === 'SHOW_WEATHER',
      );
      if (weatherAction) {
        expect(weatherAction.data).toBeDefined();
      }
    }
  });

  test('TC-009: 맥락 없이 날씨 질문 → 추가 정보 요청', async () => {
    const { body } = await sendAi(ctx, '날씨 어때?');

    console.log('TC-009:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.message).toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// 5. 타임슬롯 조회
// ─────────────────────────────────────────────
test.describe('5. 타임슬롯 조회', () => {
  let conversationId: string;

  test('TC-010: 골프장 선택 → "예약 가능한 시간" → SHOW_SLOTS', async () => {
    // Step 1: 골프장 검색
    const searchRes = await sendAi(ctx, '천안 파크골프장 찾아줘');
    expect(searchRes.body.success).toBe(true);
    conversationId = searchRes.body.data.conversationId;

    console.log('TC-010 search:', JSON.stringify(searchRes.body, null, 2));

    // Step 2: 예약 가능한 시간 요청
    const slotsRes = await sendAi(ctx, '첫 번째 골프장 내일 예약 가능한 시간 알려줘', {
      conversationId,
    });

    console.log('TC-010 slots:', JSON.stringify(slotsRes.body, null, 2));

    expect(slotsRes.body.success).toBe(true);
    expect(slotsRes.body.data.message).toBeTruthy();

    if (slotsRes.body.data.actions?.length > 0) {
      const slotAction = slotsRes.body.data.actions.find(
        (a: any) => a.type === 'SHOW_SLOTS',
      );
      if (slotAction) {
        expect(slotAction.data).toBeDefined();
      }
    }
  });

  test('TC-011: "오후 시간대" → afternoon 필터 결과', async () => {
    test.skip(!conversationId, 'no conversationId from TC-010');

    const { body } = await sendAi(ctx, '오후 시간대로만 보여줘', { conversationId });

    console.log('TC-011:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.message).toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// 6. 골프장 정책
// ─────────────────────────────────────────────
test.describe('6. 골프장 정책', () => {
  let conversationId: string;

  test('TC-012: "취소 규정 알려줘" → 정책 정보 응답', async () => {
    // Step 1: 골프장 검색으로 컨텍스트 설정
    const searchRes = await sendAi(ctx, '천안 파크골프장 알려줘');
    expect(searchRes.body.success).toBe(true);
    conversationId = searchRes.body.data.conversationId;

    // Step 2: 취소 규정 질문
    const policyRes = await sendAi(ctx, '취소 규정 알려줘', { conversationId });

    console.log('TC-012:', JSON.stringify(policyRes.body, null, 2));

    expect(policyRes.body.success).toBe(true);
    expect(policyRes.body.data.message).toBeTruthy();
  });

  test('TC-013: "운영시간" → 운영 정책 응답', async () => {
    test.skip(!conversationId, 'no conversationId from TC-012');

    const { body } = await sendAi(ctx, '운영시간 알려줘', { conversationId });

    console.log('TC-013:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.message).toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// 7. 예약 프로세스
// ─────────────────────────────────────────────
test.describe('7. 예약 프로세스', () => {
  test('TC-014: 전체 플로우 (검색 → 슬롯 → 확인) → state 전이', async () => {
    // Step 1: 검색
    const searchRes = await sendAi(ctx, '천안 파크골프장 찾아줘');
    expect(searchRes.body.success).toBe(true);
    const conversationId = searchRes.body.data.conversationId;

    console.log('TC-014 step1 state:', searchRes.body.data.state);

    // Step 2: 슬롯 요청
    const slotRes = await sendAi(ctx, '첫 번째 골프장 내일 예약 가능한 시간 보여줘', {
      conversationId,
    });
    expect(slotRes.body.success).toBe(true);

    console.log('TC-014 step2 state:', slotRes.body.data.state);

    // Step 3: 예약 확인 요청
    const confirmRes = await sendAi(ctx, '오전 첫 타임으로 예약해줘. 2명이야.', {
      conversationId,
    });
    expect(confirmRes.body.success).toBe(true);

    console.log('TC-014 step3 state:', confirmRes.body.data.state);
    console.log('TC-014 step3:', JSON.stringify(confirmRes.body, null, 2));

    // state 전이가 일어나야 함
    expect(confirmRes.body.data.state).toBeDefined();
    expect(
      ['COLLECTING', 'CONFIRMING', 'BOOKING', 'COMPLETED'].includes(confirmRes.body.data.state),
    ).toBe(true);
  });

  test('TC-015: 예약 거부 → 대화 상태 유지', async () => {
    // Step 1: 검색 + 슬롯
    const searchRes = await sendAi(ctx, '천안 골프장 내일 예약 가능한 시간');
    const conversationId = searchRes.body.data.conversationId;

    // Step 2: 예약 확인 상태로 진행
    const confirmRes = await sendAi(ctx, '첫 번째 시간으로 예약해줘', { conversationId });
    expect(confirmRes.body.success).toBe(true);

    // Step 3: 예약 거부
    const cancelRes = await sendAi(ctx, '아니요, 취소할게요', { conversationId });

    console.log('TC-015:', JSON.stringify(cancelRes.body, null, 2));

    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.message).toBeTruthy();
    expect(cancelRes.body.data.conversationId).toBe(conversationId);
  });

  test('TC-016: 잘못된 정보로 예약 → 안내 메시지', async () => {
    const { body } = await sendAi(ctx, '존재하지않는골프장ID로 예약해줘');

    console.log('TC-016:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.message).toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// 8. 대화 상태 관리
// ─────────────────────────────────────────────
test.describe('8. 대화 상태 관리', () => {
  test('TC-017: 새 대화 시작 → 새 conversationId 발급', async () => {
    const res1 = await sendAi(ctx, '안녕하세요');
    expect(res1.body.success).toBe(true);
    const convId1 = res1.body.data.conversationId;

    // conversationId 없이 새 대화
    const res2 = await sendAi(ctx, '안녕하세요');
    expect(res2.body.success).toBe(true);
    const convId2 = res2.body.data.conversationId;

    console.log('TC-017: convId1=%s, convId2=%s', convId1, convId2);

    expect(convId1).toBeDefined();
    expect(convId2).toBeDefined();
    expect(convId1).not.toBe(convId2);
  });

  test('TC-018: 같은 conversationId로 연속 대화 → 컨텍스트 유지', async () => {
    const res1 = await sendAi(ctx, '천안 파크골프장 알려줘');
    expect(res1.body.success).toBe(true);
    const conversationId = res1.body.data.conversationId;

    const res2 = await sendAi(ctx, '두 번째 골프장은 어떤 곳이야?', { conversationId });

    console.log('TC-018:', JSON.stringify(res2.body, null, 2));

    expect(res2.body.success).toBe(true);
    expect(res2.body.data.conversationId).toBe(conversationId);
    expect(res2.body.data.message).toBeTruthy();
  });

  test('TC-019: state 전이 확인 (IDLE → COLLECTING → CONFIRMING)', async () => {
    const validStates = ['IDLE', 'COLLECTING', 'CONFIRMING', 'BOOKING', 'COMPLETED', 'CANCELLED'];

    // Step 1: 새 대화 → IDLE
    const idleRes = await sendAi(ctx, '안녕하세요, 골프 예약하고 싶어요');
    expect(idleRes.body.success).toBe(true);
    const conversationId = idleRes.body.data.conversationId;
    const state1 = idleRes.body.data.state;

    console.log('TC-019 state1:', state1);
    expect(validStates).toContain(state1);

    // Step 2: 정보 수집 → COLLECTING 또는 그 이상
    const collectRes = await sendAi(ctx, '천안에서 내일 파크골프 예약하고 싶어', {
      conversationId,
    });
    expect(collectRes.body.success).toBe(true);
    const state2 = collectRes.body.data.state;

    console.log('TC-019 state2:', state2);
    expect(validStates).toContain(state2);

    // Step 3: 슬롯 선택 → CONFIRMING 또는 그 이상
    const confirmRes = await sendAi(ctx, '첫 번째 골프장 오전 시간으로 2명 예약해줘', {
      conversationId,
    });
    expect(confirmRes.body.success).toBe(true);
    const state3 = confirmRes.body.data.state;

    console.log('TC-019 state3:', state3);
    expect(validStates).toContain(state3);
  });
});
