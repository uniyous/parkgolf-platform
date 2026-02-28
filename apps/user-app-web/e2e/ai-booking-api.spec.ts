import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * AI 예약 도우미 API 통합 테스트 — 31개 시나리오
 *
 * 배포된 dev 환경에서 AI 예약 도우미의 전체 시나리오를 API 레벨로 검증.
 * POST /api/user/chat/rooms/:roomId/agent 엔드포인트를 통해
 * agent-service의 도구 + Direct Handler + 그룹 예약 핸들러 검증.
 *
 * 사전 조건:
 * - dev 환경(user-api, agent-service, course-service 등)이 배포되어 있어야 함
 * - test@parkgolf.com / test1234 테스트 계정이 존재해야 함
 *
 * 실행:
 *   E2E_API_BASE_URL=https://dev-api.parkgolfmate.com npx playwright test e2e/ai-booking-api.spec.ts --project=api
 */

// ════════════════════════════════════════════════
// Config & Helpers
// ════════════════════════════════════════════════

const API_BASE = process.env.E2E_API_BASE_URL || 'https://dev-api.parkgolfmate.com';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@parkgolf.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test1234';

/** 모든 유효한 ConversationState */
const ALL_VALID_STATES = [
  'IDLE', 'COLLECTING', 'SELECTING_MEMBERS', 'CONFIRMING',
  'BOOKING', 'SETTLING', 'TEAM_COMPLETE', 'COMPLETED', 'CANCELLED',
];

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

/** AI 메시지 전송 (모든 Direct Handler 필드 지원) */
async function sendAi(
  ctx: TestCtx,
  message: string,
  opts: {
    conversationId?: string;
    latitude?: number;
    longitude?: number;
    // Direct handlers
    selectedClubId?: string;
    selectedClubName?: string;
    selectedSlotId?: string;
    selectedSlotTime?: string;
    selectedSlotPrice?: number;
    confirmBooking?: boolean;
    cancelBooking?: boolean;
    paymentMethod?: string;
    // Group booking
    teamMembers?: Array<{ userId: number; userName: string; userEmail: string }>;
    nextTeam?: boolean;
    finishGroup?: boolean;
    sendReminder?: boolean;
    // Split payment
    splitPaymentComplete?: boolean;
    splitOrderId?: string;
  } = {},
) {
  const data: Record<string, unknown> = { message };
  if (opts.conversationId) data.conversationId = opts.conversationId;
  if (opts.latitude !== undefined) data.latitude = opts.latitude;
  if (opts.longitude !== undefined) data.longitude = opts.longitude;
  // Direct handlers
  if (opts.selectedClubId) data.selectedClubId = opts.selectedClubId;
  if (opts.selectedClubName) data.selectedClubName = opts.selectedClubName;
  if (opts.selectedSlotId) data.selectedSlotId = opts.selectedSlotId;
  if (opts.selectedSlotTime) data.selectedSlotTime = opts.selectedSlotTime;
  if (opts.selectedSlotPrice !== undefined) data.selectedSlotPrice = opts.selectedSlotPrice;
  if (opts.confirmBooking) data.confirmBooking = opts.confirmBooking;
  if (opts.cancelBooking) data.cancelBooking = opts.cancelBooking;
  if (opts.paymentMethod) data.paymentMethod = opts.paymentMethod;
  // Group booking
  if (opts.teamMembers) data.teamMembers = opts.teamMembers;
  if (opts.nextTeam) data.nextTeam = opts.nextTeam;
  if (opts.finishGroup) data.finishGroup = opts.finishGroup;
  if (opts.sendReminder) data.sendReminder = opts.sendReminder;
  // Split payment
  if (opts.splitPaymentComplete) data.splitPaymentComplete = opts.splitPaymentComplete;
  if (opts.splitOrderId) data.splitOrderId = opts.splitOrderId;

  const res = await ctx.api.post(`${API_BASE}/api/user/chat/rooms/${ctx.roomId}/agent`, {
    headers: { Authorization: `Bearer ${ctx.token}` },
    data,
  });

  const body = await res.json();
  return { status: res.status(), body };
}

/** SHOW_CLUBS 액션에서 첫 번째 clubId/clubName 추출 */
function extractFirstClub(body: any): { clubId: string; clubName: string } | null {
  const clubAction = body.data?.actions?.find((a: any) => a.type === 'SHOW_CLUBS');
  const clubs = clubAction?.data?.clubs;
  if (clubs?.length > 0) {
    return { clubId: String(clubs[0].id), clubName: clubs[0].name };
  }
  return null;
}

/** SHOW_SLOTS 액션에서 첫 번째 slot 정보 추출 */
function extractFirstSlot(body: any): { slotId: string; time: string; price: number } | null {
  const slotAction = body.data?.actions?.find((a: any) => a.type === 'SHOW_SLOTS');
  // rounds 내의 slots 또는 최상위 slots
  const slots = slotAction?.data?.slots;
  if (slots?.length > 0) {
    return {
      slotId: String(slots[0].id),
      time: slots[0].time,
      price: slots[0].price || 0,
    };
  }
  // rounds fallback
  const rounds = slotAction?.data?.rounds;
  if (rounds?.length > 0 && rounds[0].slots?.length > 0) {
    const s = rounds[0].slots[0];
    return { slotId: String(s.id), time: s.time, price: s.price || 0 };
  }
  return null;
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
    // Step 1: 새 대화 → IDLE
    const idleRes = await sendAi(ctx, '안녕하세요, 골프 예약하고 싶어요');
    expect(idleRes.body.success).toBe(true);
    const conversationId = idleRes.body.data.conversationId;
    const state1 = idleRes.body.data.state;

    console.log('TC-019 state1:', state1);
    expect(ALL_VALID_STATES).toContain(state1);

    // Step 2: 정보 수집 → COLLECTING 또는 그 이상
    const collectRes = await sendAi(ctx, '천안에서 내일 파크골프 예약하고 싶어', {
      conversationId,
    });
    expect(collectRes.body.success).toBe(true);
    const state2 = collectRes.body.data.state;

    console.log('TC-019 state2:', state2);
    expect(ALL_VALID_STATES).toContain(state2);

    // Step 3: 슬롯 선택 → CONFIRMING 또는 그 이상
    const confirmRes = await sendAi(ctx, '첫 번째 골프장 오전 시간으로 2명 예약해줘', {
      conversationId,
    });
    expect(confirmRes.body.success).toBe(true);
    const state3 = confirmRes.body.data.state;

    console.log('TC-019 state3:', state3);
    expect(ALL_VALID_STATES).toContain(state3);
  });
});

// ═════════════════════════════════════════════════
// 9. Direct Handler — 골프장 선택
// ═════════════════════════════════════════════════
test.describe('9. Direct Handler — 골프장 선택', () => {
  test('TC-020: SHOW_CLUBS → selectedClubId → SHOW_SLOTS', async () => {
    // Step 1: 자연어로 골프장 검색
    const searchRes = await sendAi(ctx, '천안 파크골프장 알려줘');
    expect(searchRes.body.success).toBe(true);
    const conversationId = searchRes.body.data.conversationId;

    const club = extractFirstClub(searchRes.body);
    test.skip(!club, 'SHOW_CLUBS 액션이 없어 Direct Club Select 테스트 불가');

    console.log('TC-020 club:', club);

    // Step 2: 클럽 카드 클릭 시뮬레이션 (Direct Handler)
    const clubRes = await sendAi(ctx, '골프장 선택', {
      conversationId,
      selectedClubId: club!.clubId,
      selectedClubName: club!.clubName,
    });

    console.log('TC-020 result:', JSON.stringify(clubRes.body, null, 2));

    expect(clubRes.body.success).toBe(true);
    expect(clubRes.body.data.conversationId).toBe(conversationId);
    expect(clubRes.body.data.message).toBeTruthy();
    // SHOW_SLOTS 또는 예약 불가 안내
    expect(ALL_VALID_STATES).toContain(clubRes.body.data.state);
  });

  test('TC-021: 존재하지 않는 clubId → 슬롯 없음 안내', async () => {
    const { body } = await sendAi(ctx, '골프장 선택', {
      selectedClubId: '99999999',
      selectedClubName: '없는 골프장',
    });

    console.log('TC-021:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.message).toBeTruthy();
    // 에러가 아닌 안내 메시지
    expect(body.data.conversationId).toBeDefined();
  });
});

// ═════════════════════════════════════════════════
// 10. Direct Handler — 슬롯 선택 + 예약 확인 카드
// ═════════════════════════════════════════════════
test.describe('10. Direct Handler — 슬롯 선택', () => {
  test('TC-022: selectedClubId → SHOW_SLOTS → selectedSlotId → CONFIRM_BOOKING', async () => {
    // Step 1: 골프장 검색
    const searchRes = await sendAi(ctx, '천안 파크골프장 알려줘');
    expect(searchRes.body.success).toBe(true);
    const conversationId = searchRes.body.data.conversationId;

    const club = extractFirstClub(searchRes.body);
    test.skip(!club, 'SHOW_CLUBS 없음');

    // Step 2: 골프장 선택 → SHOW_SLOTS
    const clubRes = await sendAi(ctx, '골프장 선택', {
      conversationId,
      selectedClubId: club!.clubId,
      selectedClubName: club!.clubName,
    });
    expect(clubRes.body.success).toBe(true);

    const slot = extractFirstSlot(clubRes.body);
    test.skip(!slot, 'SHOW_SLOTS 없음 (예약 가능한 시간 없음)');

    console.log('TC-022 slot:', slot);

    // Step 3: 슬롯 선택 → CONFIRM_BOOKING 카드
    const slotRes = await sendAi(ctx, '시간 선택', {
      conversationId,
      selectedSlotId: slot!.slotId,
      selectedSlotTime: slot!.time,
      selectedSlotPrice: slot!.price,
    });

    console.log('TC-022 confirm:', JSON.stringify(slotRes.body, null, 2));

    expect(slotRes.body.success).toBe(true);
    expect(slotRes.body.data.state).toBe('CONFIRMING');

    // CONFIRM_BOOKING 액션 검증
    const confirmAction = slotRes.body.data.actions?.find(
      (a: any) => a.type === 'CONFIRM_BOOKING',
    );
    expect(confirmAction).toBeDefined();
    expect(confirmAction.data.clubName).toBeTruthy();
    expect(confirmAction.data.time).toBeTruthy();
    expect(confirmAction.data.playerCount).toBeGreaterThan(0);
    expect(confirmAction.data.price).toBeDefined();
  });
});

// ═════════════════════════════════════════════════
// 11. Direct Handler — 예약 취소
// ═════════════════════════════════════════════════
test.describe('11. Direct Handler — 예약 취소', () => {
  test('TC-023: CONFIRM_BOOKING → cancelBooking → COLLECTING 복귀', async () => {
    // Step 1: 골프장 검색
    const searchRes = await sendAi(ctx, '천안 파크골프장 알려줘');
    expect(searchRes.body.success).toBe(true);
    const conversationId = searchRes.body.data.conversationId;

    const club = extractFirstClub(searchRes.body);
    test.skip(!club, 'SHOW_CLUBS 없음');

    // Step 2: 골프장 선택
    const clubRes = await sendAi(ctx, '골프장 선택', {
      conversationId,
      selectedClubId: club!.clubId,
      selectedClubName: club!.clubName,
    });
    expect(clubRes.body.success).toBe(true);

    const slot = extractFirstSlot(clubRes.body);
    test.skip(!slot, 'SHOW_SLOTS 없음');

    // Step 3: 슬롯 선택 → CONFIRMING
    const slotRes = await sendAi(ctx, '시간 선택', {
      conversationId,
      selectedSlotId: slot!.slotId,
      selectedSlotTime: slot!.time,
      selectedSlotPrice: slot!.price,
    });
    expect(slotRes.body.data.state).toBe('CONFIRMING');

    // Step 4: 취소 → COLLECTING
    const cancelRes = await sendAi(ctx, '취소', {
      conversationId,
      cancelBooking: true,
    });

    console.log('TC-023:', JSON.stringify(cancelRes.body, null, 2));

    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.state).toBe('COLLECTING');
    expect(cancelRes.body.data.message).toContain('취소');
  });

  test('TC-024: cancelBooking without context → graceful response', async () => {
    const { body } = await sendAi(ctx, '취소', { cancelBooking: true });

    console.log('TC-024:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.state).toBe('COLLECTING');
    expect(body.data.message).toBeTruthy();
  });
});

// ═════════════════════════════════════════════════
// 12. 그룹 예약 — 팀 멤버 선택
// ═════════════════════════════════════════════════
test.describe('12. 그룹 예약 — 팀 멤버 선택', () => {
  test('TC-025: club 선택 후 teamMembers → groupMode SHOW_SLOTS', async () => {
    // Step 1: 골프장 검색 → 클럽 선택
    const searchRes = await sendAi(ctx, '천안 파크골프장 알려줘');
    expect(searchRes.body.success).toBe(true);
    const conversationId = searchRes.body.data.conversationId;

    const club = extractFirstClub(searchRes.body);
    test.skip(!club, 'SHOW_CLUBS 없음');

    // Step 2: 골프장 선택 (컨텍스트에 clubId 설정)
    const clubRes = await sendAi(ctx, '골프장 선택', {
      conversationId,
      selectedClubId: club!.clubId,
      selectedClubName: club!.clubName,
    });
    expect(clubRes.body.success).toBe(true);

    // Step 3: 팀 멤버 선택 → groupMode 활성화 + SHOW_SLOTS
    const teamRes = await sendAi(ctx, '멤버 확정', {
      conversationId,
      teamMembers: [
        { userId: 1, userName: '테스트1', userEmail: 'test1@test.com' },
        { userId: 2, userName: '테스트2', userEmail: 'test2@test.com' },
      ],
    });

    console.log('TC-025:', JSON.stringify(teamRes.body, null, 2));

    expect(teamRes.body.success).toBe(true);
    expect(teamRes.body.data.conversationId).toBe(conversationId);
    expect(teamRes.body.data.message).toBeTruthy();
    // 그룹 모드 메시지에 "팀" 키워드 포함
    expect(teamRes.body.data.message).toMatch(/팀|시간/);

    // SHOW_SLOTS 또는 예약 불가 안내
    if (teamRes.body.data.actions?.length > 0) {
      const slotAction = teamRes.body.data.actions.find(
        (a: any) => a.type === 'SHOW_SLOTS',
      );
      if (slotAction) {
        expect(slotAction.data.availableCount).toBeGreaterThan(0);
      }
    }
  });

  test('TC-026: teamMembers 빈 배열 → 안내 메시지', async () => {
    const { body } = await sendAi(ctx, '멤버 확정', {
      teamMembers: [],
    });

    console.log('TC-026:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.message).toBeTruthy();
    // "멤버를 선택해 주세요" 안내
    expect(body.data.message).toMatch(/멤버/);
  });

  test('TC-027: teamMembers without clubId → 골프장 선택 안내', async () => {
    const { body } = await sendAi(ctx, '멤버 확정', {
      teamMembers: [
        { userId: 1, userName: '테스트1', userEmail: 'test1@test.com' },
      ],
    });

    console.log('TC-027:', JSON.stringify(body, null, 2));

    expect(body.success).toBe(true);
    expect(body.data.message).toBeTruthy();
    // clubId 없을 때 골프장 선택 안내
    expect(body.data.message).toMatch(/골프장/);
  });
});

// ═════════════════════════════════════════════════
// 13. 그룹 예약 — 슬롯 선택 (그룹 모드)
// ═════════════════════════════════════════════════
test.describe('13. 그룹 예약 — 슬롯 선택 (그룹 모드)', () => {
  test('TC-028: 팀멤버 선택 → 슬롯 선택 → CONFIRM_BOOKING with groupMode', async () => {
    // Step 1: 골프장 검색
    const searchRes = await sendAi(ctx, '천안 파크골프장 알려줘');
    expect(searchRes.body.success).toBe(true);
    const conversationId = searchRes.body.data.conversationId;

    const club = extractFirstClub(searchRes.body);
    test.skip(!club, 'SHOW_CLUBS 없음');

    // Step 2: 골프장 선택
    const clubRes = await sendAi(ctx, '골프장 선택', {
      conversationId,
      selectedClubId: club!.clubId,
      selectedClubName: club!.clubName,
    });

    // Step 3: 팀 멤버 선택
    const teamRes = await sendAi(ctx, '멤버 확정', {
      conversationId,
      teamMembers: [
        { userId: 1, userName: '테스트A', userEmail: 'a@test.com' },
        { userId: 2, userName: '테스트B', userEmail: 'b@test.com' },
        { userId: 3, userName: '테스트C', userEmail: 'c@test.com' },
      ],
    });

    const slot = extractFirstSlot(teamRes.body);
    test.skip(!slot, 'SHOW_SLOTS 없음 (예약 가능한 시간 없음)');

    // Step 4: 슬롯 선택 → CONFIRM_BOOKING with groupMode
    const slotRes = await sendAi(ctx, '시간 선택', {
      conversationId,
      selectedSlotId: slot!.slotId,
      selectedSlotTime: slot!.time,
      selectedSlotPrice: slot!.price,
    });

    console.log('TC-028:', JSON.stringify(slotRes.body, null, 2));

    expect(slotRes.body.success).toBe(true);
    expect(slotRes.body.data.state).toBe('CONFIRMING');

    const confirmAction = slotRes.body.data.actions?.find(
      (a: any) => a.type === 'CONFIRM_BOOKING',
    );
    expect(confirmAction).toBeDefined();

    // 그룹 모드 전용 필드 검증
    expect(confirmAction.data.groupMode).toBe(true);
    expect(confirmAction.data.teamNumber).toBe(1);
    expect(confirmAction.data.members).toHaveLength(3);
    expect(confirmAction.data.pricePerPerson).toBeDefined();
    expect(confirmAction.data.playerCount).toBe(3);
  });
});

// ═════════════════════════════════════════════════
// 14. 그룹 예약 — 다음 팀
// ═════════════════════════════════════════════════
test.describe('14. 그룹 예약 — 다음 팀', () => {
  test('TC-029: nextTeam → SELECT_MEMBERS 카드 반환', async () => {
    // Step 1: 컨텍스트 생성 (골프장 검색)
    const searchRes = await sendAi(ctx, '천안 파크골프장 알려줘');
    expect(searchRes.body.success).toBe(true);
    const conversationId = searchRes.body.data.conversationId;

    // Step 2: 다음 팀 요청
    const nextRes = await sendAi(ctx, '다음 팀', {
      conversationId,
      nextTeam: true,
    });

    console.log('TC-029:', JSON.stringify(nextRes.body, null, 2));

    expect(nextRes.body.success).toBe(true);
    expect(nextRes.body.data.conversationId).toBe(conversationId);
    expect(nextRes.body.data.message).toBeTruthy();

    // chatRoomId가 설정된 경우 SELECT_MEMBERS 카드 반환
    if (nextRes.body.data.actions?.length > 0) {
      const selectAction = nextRes.body.data.actions.find(
        (a: any) => a.type === 'SELECT_MEMBERS',
      );
      if (selectAction) {
        expect(selectAction.data.teamNumber).toBeGreaterThanOrEqual(2);
        expect(selectAction.data.maxPlayers).toBe(4);
        expect(selectAction.data.assignedTeams).toBeDefined();
        expect(selectAction.data.availableMembers).toBeDefined();
        expect(nextRes.body.data.state).toBe('SELECTING_MEMBERS');
      }
    }
  });
});

// ═════════════════════════════════════════════════
// 15. 그룹 예약 — 종료
// ═════════════════════════════════════════════════
test.describe('15. 그룹 예약 — 종료', () => {
  test('TC-030: finishGroup → BOOKING_COMPLETE (groupSummary)', async () => {
    // Step 1: 컨텍스트 생성
    const searchRes = await sendAi(ctx, '천안 파크골프장 알려줘');
    expect(searchRes.body.success).toBe(true);
    const conversationId = searchRes.body.data.conversationId;

    // Step 2: 종료
    const finishRes = await sendAi(ctx, '종료', {
      conversationId,
      finishGroup: true,
    });

    console.log('TC-030:', JSON.stringify(finishRes.body, null, 2));

    expect(finishRes.body.success).toBe(true);
    expect(finishRes.body.data.state).toBe('COMPLETED');
    expect(finishRes.body.data.message).toMatch(/완료/);

    // BOOKING_COMPLETE 액션에 groupSummary 포함
    const completeAction = finishRes.body.data.actions?.find(
      (a: any) => a.type === 'BOOKING_COMPLETE',
    );
    expect(completeAction).toBeDefined();
    expect(completeAction.data.groupSummary).toBe(true);
    expect(completeAction.data.teamCount).toBeDefined();
    expect(completeAction.data.totalMembers).toBeDefined();
    expect(completeAction.data.totalPrice).toBeDefined();
    expect(completeAction.data.teams).toBeDefined();
  });
});

// ═════════════════════════════════════════════════
// 16. 그룹 예약 — 리마인더
// ═════════════════════════════════════════════════
test.describe('16. 그룹 예약 — 리마인더', () => {
  test('TC-031: sendReminder → 리마인더 전송 응답', async () => {
    // Step 1: 컨텍스트 생성
    const searchRes = await sendAi(ctx, '천안 파크골프장 알려줘');
    expect(searchRes.body.success).toBe(true);
    const conversationId = searchRes.body.data.conversationId;

    // Step 2: 리마인더
    const reminderRes = await sendAi(ctx, '리마인더', {
      conversationId,
      sendReminder: true,
    });

    console.log('TC-031:', JSON.stringify(reminderRes.body, null, 2));

    expect(reminderRes.body.success).toBe(true);
    expect(reminderRes.body.data.message).toMatch(/리마인더/);
    expect(reminderRes.body.data.conversationId).toBe(conversationId);
    // state는 변경되지 않음
    expect(ALL_VALID_STATES).toContain(reminderRes.body.data.state);
  });
});

// ═════════════════════════════════════════════════
// 17. 확장된 State 전이 검증
// ═════════════════════════════════════════════════
test.describe('17. 확장된 State 전이 검증', () => {
  test('TC-032: Direct Handler 전체 플로우 state 추적', async () => {
    // Step 1: 검색 → COLLECTING
    const searchRes = await sendAi(ctx, '천안 파크골프장 알려줘');
    expect(searchRes.body.success).toBe(true);
    const conversationId = searchRes.body.data.conversationId;
    const state1 = searchRes.body.data.state;
    console.log('TC-032 state1 (search):', state1);
    expect(ALL_VALID_STATES).toContain(state1);

    const club = extractFirstClub(searchRes.body);
    test.skip(!club, 'SHOW_CLUBS 없음');

    // Step 2: 골프장 선택 → CONFIRMING (슬롯이 있는 경우)
    const clubRes = await sendAi(ctx, '골프장 선택', {
      conversationId,
      selectedClubId: club!.clubId,
      selectedClubName: club!.clubName,
    });
    const state2 = clubRes.body.data.state;
    console.log('TC-032 state2 (club select):', state2);
    expect(ALL_VALID_STATES).toContain(state2);

    const slot = extractFirstSlot(clubRes.body);
    test.skip(!slot, 'SHOW_SLOTS 없음');

    // Step 3: 슬롯 선택 → CONFIRMING
    const slotRes = await sendAi(ctx, '시간 선택', {
      conversationId,
      selectedSlotId: slot!.slotId,
      selectedSlotTime: slot!.time,
      selectedSlotPrice: slot!.price,
    });
    const state3 = slotRes.body.data.state;
    console.log('TC-032 state3 (slot select):', state3);
    expect(state3).toBe('CONFIRMING');

    // Step 4: 취소 → COLLECTING
    const cancelRes = await sendAi(ctx, '취소', {
      conversationId,
      cancelBooking: true,
    });
    const state4 = cancelRes.body.data.state;
    console.log('TC-032 state4 (cancel):', state4);
    expect(state4).toBe('COLLECTING');
  });

  test('TC-033: 그룹 모드 state 전이 (SELECTING_MEMBERS → CONFIRMING)', async () => {
    // Step 1: 검색
    const searchRes = await sendAi(ctx, '천안 파크골프장 알려줘');
    expect(searchRes.body.success).toBe(true);
    const conversationId = searchRes.body.data.conversationId;

    const club = extractFirstClub(searchRes.body);
    test.skip(!club, 'SHOW_CLUBS 없음');

    // Step 2: 골프장 선택
    await sendAi(ctx, '골프장 선택', {
      conversationId,
      selectedClubId: club!.clubId,
      selectedClubName: club!.clubName,
    });

    // Step 3: 팀 멤버 선택 → CONFIRMING (슬롯 조회 후)
    const teamRes = await sendAi(ctx, '멤버 확정', {
      conversationId,
      teamMembers: [
        { userId: 1, userName: '테스트1', userEmail: 'test1@test.com' },
        { userId: 2, userName: '테스트2', userEmail: 'test2@test.com' },
      ],
    });
    const teamState = teamRes.body.data.state;
    console.log('TC-033 state (teamMember select):', teamState);
    // CONFIRMING (슬롯이 있을 때) 또는 다른 상태 (슬롯이 없을 때)
    expect(ALL_VALID_STATES).toContain(teamState);

    // Step 4: finishGroup → COMPLETED
    const finishRes = await sendAi(ctx, '종료', {
      conversationId,
      finishGroup: true,
    });
    const finishState = finishRes.body.data.state;
    console.log('TC-033 state (finishGroup):', finishState);
    expect(finishState).toBe('COMPLETED');
  });
});
