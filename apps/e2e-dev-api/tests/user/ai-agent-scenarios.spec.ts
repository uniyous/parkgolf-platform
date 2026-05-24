import { APIRequestContext } from '@playwright/test';
import { test, expect } from '../../fixtures/test';
import { authHeaders } from '../../fixtures/auth';
import { createE2EUser, E2EUser } from '../../fixtures/users';

/**
 * AI Booking Agent — 시나리오 기반 종합 검증 (capability 분류)
 *
 * 기존 spec은 "이슈별" 케이스:
 *   - ai-agent-booking-flow (UNI-21)         부킹 카드 순서 회귀
 *   - ai-agent-memory / -semantic-memory     AGENT_MEMORY 레이어
 * 본 파일은 "역량(capability)별" 캐노니컬 스위트로, 위와 직교한 축을 검증한다.
 *
 * ┌── 분류 ─────────────────────────────────────────────────────────────┐
 * │ A. 응답 계약        모든 응답 shape + 유효 ActionType 화이트리스트       │
 * │ B. 카드/텍스트 정합  UNI-26 — TASK_PREVIEW 0건, 날씨 카드/텍스트 비중복   │
 * │ C. 직접 액션 흐름    결정적(LLM 우회): 클럽→멤버→슬롯→확정→완료, 취소     │
 * │ D. 자연어 의도       비결정적(LLM): 인사/검색/날씨 graceful              │
 * │ E. 엣지/회복력       빈 메시지, 잘못된 id, 동시요청 분산락               │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 결정성 전략:
 *   - 직접 액션(selectedClubId/teamMembers/...)은 LLM 우회 → 결정적 단언
 *   - 자연어(message)는 DeepSeek 비결정적 → 계약/graceful 위주 느슨한 단언
 *   - C 흐름의 슬롯 조회는 admin이 "내일" 슬롯을 시드 (handleTeamMemberSelect는
 *     date 없으면 내일 조회). 시드 실패 시 다운스트림은 graceful skip.
 *
 * 비용 절감: user/room을 파일당 1회 생성(beforeAll)하고 conversationId로 세션 분리.
 *
 * @write — user/room/booking 생성 (dev)
 */

const BASE_URL = process.env.E2E_BASE_URL || 'https://dev-api.parkgolfmate.com';
const ROOM_TYPE = 'CHANNEL';

// TASK_PREVIEW 제거(UNI-26) 후 유효한 ActionType 화이트리스트
const VALID_ACTION_TYPES = [
  'SHOW_CLUBS', 'SHOW_SLOTS', 'SHOW_WEATHER', 'CONFIRM_BOOKING', 'SELECT_MEMBERS',
  'SHOW_PAYMENT', 'SPLIT_PAYMENT', 'SETTLEMENT_STATUS', 'TEAM_COMPLETE',
  'BOOKING_FAILED', 'BOOKING_EXPIRED',
];
const VALID_STATES = [
  'IDLE', 'ANALYZING', 'COLLECTING', 'SELECTING_MEMBERS', 'CONFIRMING', 'BOOKING',
  'SETTLING', 'TEAM_COMPLETE', 'COMPLETED', 'CANCELLED',
];

interface AgentResult { status: number; data: any }

async function createRoom(request: APIRequestContext, auth: Record<string, string>, userId: number): Promise<string> {
  const res = await request.post('/api/user/chat/rooms', {
    headers: auth,
    data: { name: 'AI scenarios E2E', type: ROOM_TYPE, participant_ids: [String(userId)] },
  });
  const body = await res.json().catch(() => ({}));
  expect(res.ok() || res.status() === 201, `room create [${res.status()}]: ${JSON.stringify(body).slice(0, 200)}`).toBeTruthy();
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

/** A. 모든 응답이 만족해야 하는 계약 (UNI-26 TASK_PREVIEW 부재 포함) */
function assertContract(r: AgentResult, label: string): void {
  expect(r.status, `${label}: status ${r.status}`).toBeLessThan(500);
  expect(r.data?.conversationId, `${label}: conversationId 누락`).toBeTruthy();
  expect(typeof r.data?.message, `${label}: message 타입`).toBe('string');
  expect(VALID_STATES, `${label}: 알 수 없는 state ${r.data?.state}`).toContain(r.data?.state);
  for (const a of actionsOf(r.data)) {
    expect(a?.type, `${label}: TASK_PREVIEW 카드 노출 (UNI-26 위반)`).not.toBe('TASK_PREVIEW');
    expect(VALID_ACTION_TYPES, `${label}: 미정의 ActionType ${a?.type}`).toContain(a?.type);
  }
}

/** admin으로 임의 클럽의 게임에 "내일~+2일" 슬롯 시드. 실패 시 null. */
async function seedTomorrowSlots(
  request: APIRequestContext,
  adminToken: string,
): Promise<{ clubId: string; clubName: string } | null> {
  try {
    const adminAuth = authHeaders(adminToken);
    const clubsRes = await request.get('/api/admin/courses/clubs?page=1&limit=50', { headers: adminAuth });
    if (!clubsRes.ok()) return null;
    const clubsBody = await clubsRes.json();
    const clubs = clubsBody?.data?.items ?? clubsBody?.data ?? clubsBody?.items ?? [];
    if (!Array.isArray(clubs) || clubs.length === 0) return null;

    let fallback: { clubId: string; clubName: string } | null = null;
    for (let i = 0; i < Math.min(8, clubs.length); i++) {
      const club = clubs[i];
      const clubId = club.id ?? club.clubId;
      if (!clubId) continue;
      const gamesRes = await request.get(`/api/admin/games/club/${clubId}`, { headers: adminAuth });
      if (!gamesRes.ok()) continue;
      const games = (await gamesRes.json())?.data ?? [];
      if (!Array.isArray(games) || games.length === 0) continue;
      const gameId = games[0].id ?? games[0].gameId;
      if (!gameId) continue;

      // 내일 ~ +2일, 6슬롯/일 (결제분기·그룹 2팀까지 distinct 슬롯 확보용)
      const base = new Date();
      base.setUTCDate(base.getUTCDate() + 1);
      base.setUTCHours(0, 0, 0, 0);
      const timeSlots: any[] = [];
      for (let d = 0; d < 3; d++) {
        const day = new Date(base.getTime() + d * 86400_000).toISOString().slice(0, 10);
        for (const s of [
          { startTime: '08:00', endTime: '09:30', price: 30000 },
          { startTime: '09:30', endTime: '11:00', price: 30000 },
          { startTime: '11:00', endTime: '12:30', price: 35000 },
          { startTime: '12:30', endTime: '14:00', price: 35000 },
          { startTime: '14:00', endTime: '15:30', price: 30000 },
          { startTime: '15:30', endTime: '17:00', price: 30000 },
        ]) {
          // 반복 실행 누적에도 잔여석 여유 확보 (maxPlayers 상한 8)
          timeSlots.push({ date: day, maxPlayers: 8, ...s });
        }
      }
      const bulk = await request.post(`/api/admin/games/${gameId}/time-slots/bulk`, {
        headers: adminAuth,
        data: { timeSlots },
      });
      const picked = { clubId: String(clubId), clubName: club.name ?? '시드 클럽' };
      // 신규 생성(=용량 20 슬롯 확보) 우선, 기존(409)은 fallback으로 기억
      if (bulk.ok() || bulk.status() === 201) return picked;
      if (bulk.status() === 409 && !fallback) fallback = picked;
    }
    return fallback;
  } catch {
    return null;
  }
}

// ── 파일 공유 상태 ──
// A/B/C/D/E는 공유 user/room 재사용(등록 비용 절감). 예약을 "생성"하는 F는
// 같은 날 겹치는 시간대 중복 예약(BOOK_012)을 피하려 테스트별 fresh booker 사용.
let user: E2EUser;
let auth: Record<string, string>;
let roomId: string;
let seed: { clubId: string; clubName: string } | null = null;

interface Booker { user: E2EUser; auth: Record<string, string>; roomId: string }
const asMember = (u: E2EUser) => ({ userId: u.userId, userName: u.name, userEmail: u.email });

/** fresh user + 본인 소유 채팅방 — 예약 생성 테스트의 독립 컨텍스트 */
async function setupBooker(request: APIRequestContext, prefix: string): Promise<Booker> {
  const u = await createE2EUser(request, prefix);
  const a = authHeaders(u.accessToken);
  const room = await createRoom(request, a, u.userId);
  return { user: u, auth: a, roomId: room };
}

/** 클럽 선택 → 멤버 확정까지 구동 후 SHOW_SLOTS 슬롯 배열 반환 (없으면 []) */
async function driveToShowSlots(
  request: APIRequestContext,
  a: Record<string, string>,
  room: string,
  convId: string,
  members: Array<{ userId: number; userName: string; userEmail: string }>,
): Promise<any[]> {
  await sendAgent(request, a, room, {
    message: '', conversationId: convId,
    selectedClubId: seed!.clubId, selectedClubName: seed!.clubName,
  });
  const member = await sendAgent(request, a, room, {
    message: '', conversationId: convId, teamMembers: members,
  });
  return actionsOf(member.data).find((x) => x?.type === 'SHOW_SLOTS')?.data?.slots ?? [];
}

/** 슬롯 선택(버튼) → CONFIRM_BOOKING 응답 */
async function selectSlot(
  request: APIRequestContext,
  a: Record<string, string>,
  room: string,
  convId: string,
  slot: any,
): Promise<AgentResult> {
  return sendAgent(request, a, room, {
    message: '', conversationId: convId,
    selectedSlotId: String(slot.id),
    selectedSlotTime: slot.time,
    selectedSlotPrice: slot.price,
    selectedGameName: slot.gameName,
  });
}

/** 잔여석(need) 충족 + (옵션)afterEndTime 이후 시작하는 첫 슬롯 (BOOK_009/겹침 회피) */
function pickSlot(slots: any[], opts: { need?: number; afterEndTime?: string } = {}): any | undefined {
  const need = opts.need ?? 1;
  return slots.find(
    (s) =>
      (s?.availableSpots ?? 0) >= need &&
      (!opts.afterEndTime || (typeof s?.time === 'string' && s.time >= opts.afterEndTime)),
  );
}

test.beforeAll(async ({ playwright, adminToken }) => {
  const ctx = await playwright.request.newContext({ baseURL: BASE_URL });
  user = await createE2EUser(ctx, 'agentScn');
  auth = authHeaders(user.accessToken);
  roomId = await createRoom(ctx, auth, user.userId);
  seed = await seedTomorrowSlots(ctx, adminToken);
  console.log(`[setup] user=${user.userId} room=${roomId} seedClub=${seed?.clubId ?? 'none'}`);
  await ctx.dispose();
});

// ════════════════════════════════════════════════════════════════════════
// A. 응답 계약
// ════════════════════════════════════════════════════════════════════════
test.describe('Agent > A. 응답 계약 @write', () => {
  test('A1 다양한 입력에 대해 응답 shape + state enum 준수', async ({ request }) => {
    for (const message of ['안녕하세요', '내일 천안 골프장 예약하고 싶어요', '오늘 날씨 어때?']) {
      const r = await sendAgent(request, auth, roomId, { message });
      assertContract(r, `A1[${message}]`);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// B. 카드/텍스트 정합 (UNI-26)
// ════════════════════════════════════════════════════════════════════════
test.describe('Agent > B. 카드/텍스트 정합 (UNI-26) @write', () => {
  test('B1 어떤 메시지에도 TASK_PREVIEW 카드가 없음', async ({ request }) => {
    const messages = [
      '내일 채팅방 멤버들과 예약 가능한 골프장 있나요?',
      '강남 근처 파크골프장 검색해줘',
      '4명이서 주말에 라운딩 하고 싶어',
    ];
    for (const message of messages) {
      const r = await sendAgent(request, auth, roomId, { message });
      assertContract(r, `B1[${message}]`);
      const types = actionsOf(r.data).map((a) => a?.type);
      expect(types, `B1[${message}] TASK_PREVIEW 존재`).not.toContain('TASK_PREVIEW');
    }
  });

  test('B2 날씨 질문 → SHOW_WEATHER 카드 또는 텍스트, 텍스트는 카드 데이터 미나열', async ({ request }) => {
    const r = await sendAgent(request, auth, roomId, {
      message: '내일 골프 치기 날씨 괜찮아?',
      latitude: 36.8151, // 천안
      longitude: 127.1139,
    });
    assertContract(r, 'B2');
    const types = actionsOf(r.data).map((a) => a?.type);
    // 날씨 카드가 떴다면, 동반 텍스트는 한 줄 안내여야 (습도/기온 수치 나열 금지 — UNI-26)
    if (types.includes('SHOW_WEATHER')) {
      const msg: string = r.data?.message ?? '';
      expect(msg.length, `B2 날씨 카드 동반 텍스트 과다(${msg.length}자)`).toBeLessThan(120);
    }
    console.log(`[B2] actions=${types.join(',') || 'none'} msgLen=${(r.data?.message ?? '').length}`);
  });
});

// ════════════════════════════════════════════════════════════════════════
// C. 직접 액션 흐름 (결정적, LLM 우회)
// ════════════════════════════════════════════════════════════════════════
test.describe('Agent > C. 직접 액션 흐름 @write', () => {
  test('C1 채팅방에서 클럽 선택 → SELECT_MEMBERS 카드 우선 (SHOW_SLOTS 아님)', async ({ request }) => {
    const init = await sendAgent(request, auth, roomId, { message: '안녕' });
    const convId = init.data?.conversationId as string;
    expect(convId).toBeTruthy();

    const r = await sendAgent(request, auth, roomId, {
      message: '',
      conversationId: convId,
      selectedClubId: seed?.clubId ?? '1',
      selectedClubName: seed?.clubName ?? '테스트 클럽',
    });
    assertContract(r, 'C1');
    expect(actionsOf(r.data)[0]?.type, 'C1 첫 액션은 SELECT_MEMBERS').toBe('SELECT_MEMBERS');
  });

  test('C2~C4 풀 라이프사이클: 멤버확정 → 슬롯선택 → 확정(현장결제)', async ({ request }) => {
    test.skip(!seed, '슬롯 시드 실패(admin 권한/데이터 없음) — 결정적 흐름 skip');

    // 클럽 선택 (채팅방 그룹) → SELECT_MEMBERS
    const init = await sendAgent(request, auth, roomId, { message: '안녕' });
    const convId = init.data?.conversationId as string;
    const club = await sendAgent(request, auth, roomId, {
      message: '', conversationId: convId,
      selectedClubId: seed!.clubId, selectedClubName: seed!.clubName,
    });
    expect(actionsOf(club.data)[0]?.type).toBe('SELECT_MEMBERS');

    // 멤버 확정(본인 1인) → SHOW_SLOTS
    const member = await sendAgent(request, auth, roomId, {
      message: '', conversationId: convId,
      teamMembers: [{ userId: user.userId, userName: user.name, userEmail: user.email }],
    });
    assertContract(member, 'C2');
    expect(actionsOf(member.data)[0]?.type, 'C2 멤버확정 후 SELECT_MEMBERS 재출현 금지').not.toBe('SELECT_MEMBERS');

    const slotsAction = actionsOf(member.data).find((a) => a?.type === 'SHOW_SLOTS');
    test.skip(!slotsAction, '시드 클럽에 내일 가용 슬롯 없음 — 다운스트림 skip');
    const slot = slotsAction.data?.slots?.[0];
    expect(slot?.id, 'C2 슬롯 카드에 슬롯 항목').toBeTruthy();

    // 슬롯 선택 → CONFIRM_BOOKING + CONFIRMING
    const confirm = await sendAgent(request, auth, roomId, {
      message: '', conversationId: convId,
      selectedSlotId: String(slot.id),
      selectedSlotTime: slot.time,
      selectedSlotPrice: slot.price,
      selectedGameName: slot.gameName,
    });
    assertContract(confirm, 'C3');
    expect(actionsOf(confirm.data)[0]?.type, 'C3 슬롯선택 → CONFIRM_BOOKING').toBe('CONFIRM_BOOKING');
    expect(confirm.data?.state, 'C3 state CONFIRMING').toBe('CONFIRMING');

    // 확정(현장결제) → TEAM_COMPLETE 계열 + 종료 상태
    const booked = await sendAgent(request, auth, roomId, {
      message: '', conversationId: convId,
      confirmBooking: true, paymentMethod: 'onsite',
    });
    assertContract(booked, 'C4');
    const bookedTypes = actionsOf(booked.data).map((a) => a?.type);
    console.log(`[C4] state=${booked.data?.state} actions=${bookedTypes.join(',') || 'none'}`);
    // 현장결제 성공 → TEAM_COMPLETE, 실패 시 BOOKING_FAILED (둘 다 계약상 유효)
    expect(['TEAM_COMPLETE', 'COMPLETED', 'COLLECTING'], 'C4 종료/실패 상태').toContain(booked.data?.state);
  });

  test('C5 cancelBooking → 슬롯 초기화(state COLLECTING), 액션 없음', async ({ request }) => {
    const init = await sendAgent(request, auth, roomId, { message: '안녕' });
    const convId = init.data?.conversationId as string;
    const r = await sendAgent(request, auth, roomId, {
      message: '', conversationId: convId, cancelBooking: true,
    });
    assertContract(r, 'C5');
    expect(r.data?.state, 'C5 state COLLECTING').toBe('COLLECTING');
    expect(actionsOf(r.data).length, 'C5 액션 없음').toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// D. 자연어 의도 (비결정적, 느슨한 단언)
// ════════════════════════════════════════════════════════════════════════
test.describe('Agent > D. 자연어 의도 @write', () => {
  test('D1 인사 → 텍스트 응답 (예약 카드 미동반)', async ({ request }) => {
    const r = await sendAgent(request, auth, roomId, { message: '반가워요' });
    assertContract(r, 'D1');
    expect((r.data?.message ?? '').length, 'D1 인사 텍스트 존재').toBeGreaterThan(0);
    // 인사에 부킹 카드가 붙으면 안 됨 (정보/액션 카드 미동반)
    const types = actionsOf(r.data).map((a) => a?.type);
    for (const t of ['SELECT_MEMBERS', 'CONFIRM_BOOKING', 'SHOW_SLOTS', 'SHOW_PAYMENT']) {
      expect(types, `D1 인사에 ${t} 카드 부적절`).not.toContain(t);
    }
  });

  test('D2 클럽 검색 의도 → 계약 준수 (SHOW_CLUBS 또는 안내 텍스트)', async ({ request }) => {
    const r = await sendAgent(request, auth, roomId, {
      message: '내 근처 파크골프장 추천해줘',
      latitude: 37.5012, longitude: 127.0396, // 강남
    });
    assertContract(r, 'D2');
    const types = actionsOf(r.data).map((a) => a?.type);
    console.log(`[D2] actions=${types.join(',') || 'none'}`);
  });
});

// ════════════════════════════════════════════════════════════════════════
// E. 엣지 / 회복력
// ════════════════════════════════════════════════════════════════════════
test.describe('Agent > E. 엣지/회복력 @write', () => {
  test('E1 빈 메시지 → graceful (5xx 아님)', async ({ request }) => {
    const r = await sendAgent(request, auth, roomId, { message: '' });
    expect(r.status, `E1 status ${r.status}`).toBeLessThan(500);
    expect(r.data?.conversationId, 'E1 conversationId').toBeTruthy();
  });

  test('E2 잘못된 selectedClubId → graceful (5xx 아님)', async ({ request }) => {
    const init = await sendAgent(request, auth, roomId, { message: '안녕' });
    const convId = init.data?.conversationId as string;
    const r = await sendAgent(request, auth, roomId, {
      message: '', conversationId: convId,
      selectedClubId: '99999999', selectedClubName: '존재하지않는클럽',
    });
    assertContract(r, 'E2');
  });

  test('E3 같은 conversationId 동시 2요청 → 둘 다 graceful (분산락)', async ({ request }) => {
    const init = await sendAgent(request, auth, roomId, { message: '안녕' });
    const convId = init.data?.conversationId as string;
    const [r1, r2] = await Promise.all([
      sendAgent(request, auth, roomId, { message: '메시지 A', conversationId: convId }),
      sendAgent(request, auth, roomId, { message: '메시지 B', conversationId: convId }),
    ]);
    expect(r1.status, `E3 r1 ${r1.status}`).toBeLessThan(500);
    expect(r2.status, `E3 r2 ${r2.status}`).toBeLessThan(500);
    const busy = [r1.data?.message, r2.data?.message].filter((m) => typeof m === 'string' && m.includes('처리 중')).length;
    expect(busy, 'E3 동시 처리 — busy 안내는 최대 1건').toBeLessThanOrEqual(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// F. 결제 분기 & 그룹 멀티턴 (결정적, 슬롯 시드 필요)
//   예약 생성 테스트는 fresh booker(자체 room) 사용 — 같은 날 겹치는 시간대
//   중복 예약(BOOK_012) 회피. F3 team2는 team1과 겹치지 않는 슬롯 선택.
// ════════════════════════════════════════════════════════════════════════
test.describe('Agent > F. 결제 분기 & 그룹 멀티턴 @write', () => {
  test('F1 카드결제 분기 → SHOW_PAYMENT 카드 + state BOOKING', async ({ request }) => {
    test.skip(!seed, '슬롯 시드 실패 — skip');
    const b = await setupBooker(request, 'agentCard');
    const convId = (await sendAgent(request, b.auth, b.roomId, { message: '안녕' })).data?.conversationId as string;
    const slots = await driveToShowSlots(request, b.auth, b.roomId, convId, [asMember(b.user)]);
    const slot = pickSlot(slots, { need: 1 });
    test.skip(!slot, '가용 슬롯 없음 — skip');

    const confirm = await selectSlot(request, b.auth, b.roomId, convId, slot);
    expect(actionsOf(confirm.data)[0]?.type, 'F1 슬롯선택 → CONFIRM_BOOKING').toBe('CONFIRM_BOOKING');

    // 카드결제 버튼
    const r = await sendAgent(request, b.auth, b.roomId, {
      message: '', conversationId: convId, confirmBooking: true, paymentMethod: 'card',
    });
    assertContract(r, 'F1');
    const types = actionsOf(r.data).map((a) => a?.type);
    console.log(`[F1] state=${r.data?.state} actions=${types.join(',') || 'none'}`);
    expect(types, `F1 카드결제 → SHOW_PAYMENT (state=${r.data?.state}, msg=${r.data?.message})`).toContain('SHOW_PAYMENT');
    expect(r.data?.state, 'F1 state BOOKING').toBe('BOOKING');
    const pay = actionsOf(r.data).find((a) => a?.type === 'SHOW_PAYMENT');
    expect(pay?.data?.amount, 'F1 결제 금액 > 0').toBeGreaterThan(0);
    expect(pay?.data?.bookingId, 'F1 bookingId').toBeTruthy();
  });

  test('F2 더치페이 분기(2인) → state SETTLING (정산카드 broadcast, 응답 액션 없음)', async ({ request }) => {
    test.skip(!seed, '슬롯 시드 실패 — skip');
    const b = await setupBooker(request, 'agentDutch');
    let participant: E2EUser;
    try {
      participant = await createE2EUser(request, 'agentDutchP');
    } catch {
      test.skip(true, '참여자 생성 실패 — skip');
      return;
    }
    const addRes = await request.post(`/api/user/chat/rooms/${b.roomId}/members`, {
      headers: b.auth, data: { user_ids: [String(participant.userId)] },
    });
    expect(addRes.ok() || addRes.status() === 201 || addRes.status() === 409, 'F2 참여자 초대').toBeTruthy();

    const convId = (await sendAgent(request, b.auth, b.roomId, { message: '안녕' })).data?.conversationId as string;
    const slots = await driveToShowSlots(request, b.auth, b.roomId, convId, [asMember(b.user), asMember(participant)]);
    const slot = pickSlot(slots, { need: 2 }); // 2인 더치페이 — 잔여석 ≥2
    test.skip(!slot, '잔여석 2 이상 슬롯 없음 — skip');

    const confirm = await selectSlot(request, b.auth, b.roomId, convId, slot);
    expect(actionsOf(confirm.data)[0]?.type, 'F2 슬롯선택 → CONFIRM_BOOKING').toBe('CONFIRM_BOOKING');

    // 더치페이 버튼
    const r = await sendAgent(request, b.auth, b.roomId, {
      message: '', conversationId: convId, confirmBooking: true, paymentMethod: 'dutchpay',
    });
    assertContract(r, 'F2');
    console.log(`[F2] state=${r.data?.state} actions=${actionsOf(r.data).map((a) => a?.type).join(',') || 'none'} msg=${r.data?.message}`);
    expect(r.data?.state, `F2 state SETTLING (실제=${r.data?.state}, msg=${r.data?.message})`).toBe('SETTLING');
    // 정산 카드는 참여자에게 broadcast — booker의 HTTP 응답에는 액션 미포함
    expect(actionsOf(r.data).length, 'F2 응답 액션 없음(broadcast 경로)').toBe(0);
  });

  test('F3 그룹 멀티턴: team1 완료 → nextTeam → SELECT_MEMBERS(team2) → team2 완료 → finishGroup', async ({ request }) => {
    test.skip(!seed, '슬롯 시드 실패 — skip');
    const b = await setupBooker(request, 'agentGroup');
    const me = asMember(b.user);
    const convId = (await sendAgent(request, b.auth, b.roomId, { message: '안녕' })).data?.conversationId as string;

    // ── team1: 멤버 → 슬롯 → 현장결제 확정 → TEAM_COMPLETE ──
    const slots1 = await driveToShowSlots(request, b.auth, b.roomId, convId, [me]);
    const team1Slot = pickSlot(slots1, { need: 1 });
    test.skip(!team1Slot, '그룹용 슬롯 없음 — skip');
    const c1 = await selectSlot(request, b.auth, b.roomId, convId, team1Slot);
    expect(actionsOf(c1.data)[0]?.type, 'F3 team1 CONFIRM_BOOKING').toBe('CONFIRM_BOOKING');
    const t1 = await sendAgent(request, b.auth, b.roomId, {
      message: '', conversationId: convId, confirmBooking: true, paymentMethod: 'onsite',
    });
    assertContract(t1, 'F3-team1');
    expect(t1.data?.state, `F3 team1 → TEAM_COMPLETE (msg=${t1.data?.message})`).toBe('TEAM_COMPLETE');

    // ── nextTeam 버튼 → SELECT_MEMBERS(team2) ──
    const next = await sendAgent(request, b.auth, b.roomId, {
      message: '', conversationId: convId, nextTeam: true,
    });
    assertContract(next, 'F3-nextTeam');
    expect(actionsOf(next.data)[0]?.type, 'F3 nextTeam → SELECT_MEMBERS').toBe('SELECT_MEMBERS');

    // ── team2: 멤버 → team1과 겹치지 않는 슬롯 → 현장결제 → TEAM_COMPLETE ──
    const slots2 = await driveToShowSlots(request, b.auth, b.roomId, convId, [me]);
    const team2Slot = pickSlot(slots2, { need: 1, afterEndTime: team1Slot.endTime });
    test.skip(!team2Slot, 'team1과 겹치지 않는 team2 슬롯 없음 — skip');
    const c2 = await selectSlot(request, b.auth, b.roomId, convId, team2Slot);
    expect(actionsOf(c2.data)[0]?.type, 'F3 team2 CONFIRM_BOOKING').toBe('CONFIRM_BOOKING');
    const t2 = await sendAgent(request, b.auth, b.roomId, {
      message: '', conversationId: convId, confirmBooking: true, paymentMethod: 'onsite',
    });
    assertContract(t2, 'F3-team2');
    expect(t2.data?.state, `F3 team2 → TEAM_COMPLETE (msg=${t2.data?.message})`).toBe('TEAM_COMPLETE');

    // ── finishGroup 버튼 → 그룹 요약 TEAM_COMPLETE + COMPLETED ──
    const fin = await sendAgent(request, b.auth, b.roomId, {
      message: '', conversationId: convId, finishGroup: true,
    });
    assertContract(fin, 'F3-finish');
    const finAction = actionsOf(fin.data)[0];
    console.log(`[F3] finish state=${fin.data?.state} teams=${finAction?.data?.teamCount}`);
    expect(finAction?.type, 'F3 finishGroup → TEAM_COMPLETE').toBe('TEAM_COMPLETE');
    expect(finAction?.data?.groupSummary, 'F3 그룹 요약 플래그').toBeTruthy();
    expect(finAction?.data?.teamCount, 'F3 2팀 요약').toBeGreaterThanOrEqual(2);
    expect(fin.data?.state, 'F3 state COMPLETED').toBe('COMPLETED');
  });
});
